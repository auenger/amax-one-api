package controller

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/helper"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/common/render"
	"github.com/songquanpeng/one-api/middleware"
	dbmodel "github.com/songquanpeng/one-api/model"
	"github.com/songquanpeng/one-api/monitor"
	"github.com/songquanpeng/one-api/relay"
	relaycontroller "github.com/songquanpeng/one-api/relay/controller"
	relaymeta "github.com/songquanpeng/one-api/relay/meta"
	relaymodel "github.com/songquanpeng/one-api/relay/model"
	"github.com/songquanpeng/one-api/service"
)

// claudResponseWriter captures the OpenAI response for Claude format conversion.
type claudeResponseWriter struct {
	gin.ResponseWriter
	body   *bytes.Buffer
	header http.Header
}

func newClaudeResponseWriter(w gin.ResponseWriter) *claudeResponseWriter {
	return &claudeResponseWriter{
		ResponseWriter: w,
		body:           bytes.NewBuffer(nil),
		header:         make(http.Header),
	}
}

func (w *claudeResponseWriter) Write(data []byte) (int, error) {
	return w.body.Write(data)
}

func (w *claudeResponseWriter) WriteHeader(code int) {
	// don't actually write the header; we'll rewrite later
}

func (w *claudeResponseWriter) Header() http.Header {
	return w.header
}

func (w *claudeResponseWriter) Flush() {
	// no-op during capture
}

// RelayClaudeMessages handles the /v1/messages endpoint for Claude Messages API format.
// It converts Claude format to OpenAI format, relays through the existing infrastructure,
// and converts the response back to Claude format.
func RelayClaudeMessages(c *gin.Context) {
	ctx := c.Request.Context()

	// 1. Parse Claude Messages request
	claudeReq := &service.ClaudeMessagesRequest{}
	if err := common.UnmarshalBodyReusable(c, claudeReq); err != nil {
		c.JSON(http.StatusBadRequest, service.ClaudeError{
			Type: "invalid_request_error",
			Error: service.ClaudeErrorDetail{
				Type:    "invalid_request_error",
				Message: fmt.Sprintf("Failed to parse request: %s", err.Error()),
			},
		})
		return
	}

	// 2. Validate
	if claudeReq.Model == "" {
		c.JSON(http.StatusBadRequest, service.ClaudeError{
			Type: "invalid_request_error",
			Error: service.ClaudeErrorDetail{
				Type:    "invalid_request_error",
				Message: "model is required",
			},
		})
		return
	}
	if claudeReq.MaxTokens == 0 {
		claudeReq.MaxTokens = 4096
	}

	// 3. Convert Claude request to OpenAI format
	openaiReq := service.ClaudeToOpenAIRequest(claudeReq)
	requestBody, err := json.Marshal(openaiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, service.ClaudeError{
			Type: "api_error",
			Error: service.ClaudeErrorDetail{
				Type:    "api_error",
				Message: "Failed to convert request",
			},
		})
		return
	}

	// 4. Store original body for retries
	originalBody := make([]byte, len(requestBody))
	copy(originalBody, requestBody)

	// 5. Set context for the distributor
	c.Set(ctxkey.RequestModel, claudeReq.Model)
	c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
	c.Request.ContentLength = int64(len(requestBody))

	// 6. Run the distributor
	distributeHandler := middleware.Distribute()
	distributeHandler(c)
	if c.IsAborted() {
		return
	}

	channelId := c.GetInt(ctxkey.ChannelId)
	userId := c.GetInt(ctxkey.Id)
	group := c.GetString(ctxkey.Group)
	channelName := c.GetString(ctxkey.ChannelName)

	if claudeReq.Stream {
		relayClaudeStream(c, claudeReq, originalBody, channelId, userId, group, channelName)
	} else {
		relayClaudeNonStream(c, claudeReq, originalBody, channelId, userId, group, channelName)
	}
}

func relayClaudeNonStream(c *gin.Context, claudeReq *service.ClaudeMessagesRequest, originalBody []byte, channelId int, userId int, group string, channelName string) {
	ctx := c.Request.Context()

	// Capture the response
	captureWriter := newClaudeResponseWriter(c.Writer)
	c.Writer = captureWriter

	// Override the request path so relaymode detection works
	origPath := c.Request.URL.Path
	c.Request.URL.Path = "/v1/chat/completions"
	defer func() { c.Request.URL.Path = origPath }()

	// Set request body
	c.Request.Body = io.NopCloser(bytes.NewBuffer(originalBody))

	// Build meta for relay
	_ = relaymeta.GetByContext(c)

	// Use the relay text helper
	bizErr := relaycontroller.RelayTextHelper(c)

	if bizErr != nil {
		go processChannelRelayError(ctx, userId, channelId, channelName, *bizErr)

		// Try retries
		lastFailedChannelId := channelId
		retryTimes := config.RetryTimes
		if shouldRetry(c, bizErr.StatusCode) {
			for i := retryTimes; i > 0; i-- {
				channel, err := dbmodel.CacheGetRandomSatisfiedChannel(group, claudeReq.Model, i != retryTimes)
				if err != nil {
					break
				}
				if channel.Id == lastFailedChannelId {
					continue
				}
				middleware.SetupContextForSelectedChannel(c, channel, claudeReq.Model)
				c.Request.Body = io.NopCloser(bytes.NewBuffer(originalBody))

				captureWriter.body.Reset()
				bizErr = relaycontroller.RelayTextHelper(c)
				if bizErr == nil {
					break
				}
				lastFailedChannelId = c.GetInt(ctxkey.ChannelId)
				channelName = c.GetString(ctxkey.ChannelName)
				go processChannelRelayError(ctx, userId, lastFailedChannelId, channelName, *bizErr)
			}
		}

		if bizErr != nil {
			// Restore writer and send Claude error
			c.Writer = captureWriter.ResponseWriter
			c.JSON(bizErr.StatusCode, service.ClaudeError{
				Type: "api_error",
				Error: service.ClaudeErrorDetail{
					Type:    "api_error",
					Message: bizErr.Error.Message,
				},
			})
			return
		}
	}

	// Restore the original writer
	c.Writer = captureWriter.ResponseWriter

	// Parse the captured OpenAI response
	var openaiResp map[string]any
	if err := json.Unmarshal(captureWriter.body.Bytes(), &openaiResp); err != nil {
		logger.Errorf(ctx, "failed to parse captured response: %s", err.Error())
		c.JSON(http.StatusInternalServerError, service.ClaudeError{
			Type: "api_error",
			Error: service.ClaudeErrorDetail{
				Type:    "api_error",
				Message: "Failed to process upstream response",
			},
		})
		return
	}

	// Convert to Claude format
	claudeResp := service.OpenAIResponseToClaude(openaiResp, claudeReq.Model)
	c.JSON(http.StatusOK, claudeResp)
	monitor.Emit(channelId, true)
}

func relayClaudeStream(c *gin.Context, claudeReq *service.ClaudeMessagesRequest, originalBody []byte, channelId int, userId int, group string, channelName string) {
	ctx := c.Request.Context()
	msgId := fmt.Sprintf("msg_%s", helper.GetUUID())

	// Get channel info from context
	channelType := c.GetInt(ctxkey.Channel)
	apiKey := c.Request.Header.Get("Authorization")
	apiKey = strings.TrimPrefix(apiKey, "Bearer ")
	baseURL := c.GetString(ctxkey.BaseURL)
	modelMapping := c.GetStringMapString(ctxkey.ModelMapping)

	// Map model name
	actualModelName := claudeReq.Model
	if mapped, ok := modelMapping[claudeReq.Model]; ok && mapped != "" {
		actualModelName = mapped
	}

	// Determine API type from channel type
	apiType := relay.GetAPIType(channelType)

	// Create meta for relay
	meta := &relaymeta.Meta{
		Mode:            1, // ChatCompletions
		ChannelType:     channelType,
		ChannelId:       channelId,
		TokenId:         c.GetInt(ctxkey.TokenId),
		TokenName:       c.GetString(ctxkey.TokenName),
		UserId:          userId,
		Group:           group,
		ModelMapping:    modelMapping,
		BaseURL:         baseURL,
		APIKey:          apiKey,
		APIType:         apiType,
		IsStream:        true,
		OriginModelName: claudeReq.Model,
		ActualModelName: actualModelName,
		RequestURLPath:  "/v1/chat/completions",
		StartTime:       helper.GetTimestamp(),
	}

	// Convert request
	openaiReq := service.ClaudeToOpenAIRequest(claudeReq)
	adaptor := relay.GetAdaptor(apiType)
	if adaptor == nil {
		c.JSON(http.StatusBadRequest, service.ClaudeError{
			Type: "api_error",
			Error: service.ClaudeErrorDetail{
				Type:    "api_error",
				Message: fmt.Sprintf("unsupported channel type: %d", channelType),
			},
		})
		return
	}
	adaptor.Init(meta)

	// Convert request through adaptor
	convertedReq, err := adaptor.ConvertRequest(c, 1, openaiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, service.ClaudeError{
			Type: "api_error",
			Error: service.ClaudeErrorDetail{
				Type:    "api_error",
				Message: "Failed to convert request",
			},
		})
		return
	}
	reqBody, _ := json.Marshal(convertedReq)

	// Do the upstream request
	resp, err := adaptor.DoRequest(c, meta, bytes.NewBuffer(reqBody))
	if err != nil {
		c.JSON(http.StatusInternalServerError, service.ClaudeError{
			Type: "api_error",
			Error: service.ClaudeErrorDetail{
				Type:    "api_error",
				Message: err.Error(),
			},
		})
		return
	}
	if resp == nil || resp.StatusCode != http.StatusOK {
		statusCode := http.StatusInternalServerError
		if resp != nil {
			statusCode = resp.StatusCode
		}
		errMsg := "empty response from upstream"
		if resp != nil {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			errMsg = string(body)
		}
		c.JSON(statusCode, service.ClaudeError{
			Type: "api_error",
			Error: service.ClaudeErrorDetail{
				Type:    "api_error",
				Message: errMsg,
			},
		})
		return
	}
	defer resp.Body.Close()

	// Stream Claude format
	common.SetEventStreamHeaders(c)

	// message_start
	messageStart := service.ClaudeStreamEvent{
		Type: "message_start",
		Message: &service.ClaudeMessagesResponse{
			Id:      msgId,
			Type:    "message",
			Role:    "assistant",
			Content: []service.ClaudeContentBlock{},
			Model:   claudeReq.Model,
			Usage:   service.ClaudeUsage{},
		},
	}
	render.ObjectData(c, messageStart)

	// content_block_start
	contentBlockStart := service.ClaudeStreamEvent{
		Type:  "content_block_start",
		Index: 0,
		ContentBlock: &service.ClaudeContentBlock{
			Type: "text",
			Text: "",
		},
	}
	render.ObjectData(c, contentBlockStart)

	// Parse OpenAI SSE and convert to Claude events
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
		if atEOF && len(data) == 0 {
			return 0, nil, nil
		}
		if i := strings.Index(string(data), "\n"); i >= 0 {
			return i + 1, data[0:i], nil
		}
		if atEOF {
			return len(data), data, nil
		}
		return 0, nil, nil
	})

	var totalUsage service.ClaudeUsage
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		data = strings.TrimSpace(data)
		if data == "[DONE]" {
			break
		}

		var chunk map[string]any
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}

		// Extract usage
		if usage, ok := chunk["usage"].(map[string]any); ok {
			if pt, ok := usage["prompt_tokens"].(float64); ok {
				totalUsage.InputTokens = int(pt)
			}
			if ct, ok := usage["completion_tokens"].(float64); ok {
				totalUsage.OutputTokens = int(ct)
			}
		}

		events := service.OpenAIStreamChunkToClaudeEvents(chunk, claudeReq.Model, msgId)
		for _, event := range events {
			render.ObjectData(c, event)
		}
	}

	// content_block_stop
	render.ObjectData(c, map[string]any{
		"type":  "content_block_stop",
		"index": 0,
	})

	// message_delta with final usage
	stopReason := "end_turn"
	messageDelta := service.ClaudeStreamEvent{
		Type: "message_delta",
		Delta: &service.ClaudeDelta{
			StopReason: &stopReason,
		},
		Usage: &service.ClaudeUsage{
			OutputTokens: totalUsage.OutputTokens,
		},
	}
	render.ObjectData(c, messageDelta)

	// message_stop
	render.ObjectData(c, map[string]any{
		"type": "message_stop",
	})

	render.Done(c)
	monitor.Emit(channelId, true)
}

// shouldRetryClaude checks if the request should be retried
func shouldRetryClaude(statusCode int) bool {
	if statusCode == http.StatusTooManyRequests {
		return true
	}
	if statusCode/100 == 5 {
		return true
	}
	if statusCode == http.StatusBadRequest {
		return false
	}
	return statusCode/100 != 2
}
