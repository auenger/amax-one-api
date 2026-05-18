package controller

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/helper"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/common/random"
	"github.com/songquanpeng/one-api/common/render"
	"github.com/songquanpeng/one-api/middleware"
	dbmodel "github.com/songquanpeng/one-api/model"
	"github.com/songquanpeng/one-api/monitor"
	"github.com/songquanpeng/one-api/relay/relaymode"
	"github.com/songquanpeng/one-api/service"
)

// claudeResponseWriter captures the OpenAI response body for non-stream Claude format conversion.
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

func (w *claudeResponseWriter) WriteHeader(int) {}

func (w *claudeResponseWriter) Header() http.Header {
	return w.header
}

func (w *claudeResponseWriter) Flush() {}

// claudeStreamBuffer buffers streaming OpenAI SSE events for deferred Claude format conversion.
type claudeStreamBuffer struct {
	gin.ResponseWriter
	body       *bytes.Buffer
	realWriter gin.ResponseWriter
}

func newClaudeStreamBuffer(w gin.ResponseWriter) *claudeStreamBuffer {
	return &claudeStreamBuffer{
		ResponseWriter: w,
		body:           bytes.NewBuffer(nil),
		realWriter:     w,
	}
}

func (b *claudeStreamBuffer) Write(data []byte) (int, error) {
	return b.body.Write(data)
}

func (b *claudeStreamBuffer) WriteHeader(int) {}

func (b *claudeStreamBuffer) Header() http.Header {
	return b.realWriter.Header()
}

func (b *claudeStreamBuffer) Flush() {}

// RelayAnthropic handles /anthropic/v1/messages and /v1/messages endpoints.
// It converts Claude format to OpenAI, relays through the standard pipeline
// (with full billing/logging/retry), then converts the response back to Claude format.
func RelayAnthropic(c *gin.Context) {
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

	// 3. Convert Claude → OpenAI format
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

	// 4. Override path for relaymode detection
	origPath := c.Request.URL.Path
	c.Request.URL.Path = "/v1/chat/completions"

	// 5. Replace body with OpenAI format and update the body cache
	c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
	c.Request.ContentLength = int64(len(requestBody))
	c.Set(ctxkey.KeyRequestBody, requestBody)

	// 6. Set up response interceptor
	var captureWriter *claudeResponseWriter
	var streamBuffer *claudeStreamBuffer

	if claudeReq.Stream {
		streamBuffer = newClaudeStreamBuffer(c.Writer)
		c.Writer = streamBuffer
	} else {
		captureWriter = newClaudeResponseWriter(c.Writer)
		c.Writer = captureWriter
	}

	// 7. Relay through standard pipeline (with retry)
	channelId := c.GetInt(ctxkey.ChannelId)
	userId := c.GetInt(ctxkey.Id)
	channelName := c.GetString(ctxkey.ChannelName)
	group := c.GetString(ctxkey.Group)
	originalModel := c.GetString(ctxkey.OriginalModel)

	startTime := time.Now()
	bizErr := relayHelper(c, relaymode.ChatCompletions)
	latencyMs := time.Since(startTime).Milliseconds()

	if bizErr != nil {
		go processChannelRelayError(ctx, userId, channelId, channelName, *bizErr)

		requestId := c.GetString(helper.RequestIdKey)
		retryTimes := config.RetryTimes

		if !shouldRetry(c, bizErr.StatusCode) {
			logger.Errorf(ctx, "relay error, status %d, won't retry", bizErr.StatusCode)
			retryTimes = 0
		}

		lastFailedChannelId := channelId
		for i := retryTimes; i > 0; i-- {
			channel, err := dbmodel.CacheGetRandomSatisfiedChannel(group, originalModel, i != retryTimes)
			if err != nil {
				logger.Errorf(ctx, "CacheGetRandomSatisfiedChannel failed: %+v", err)
				break
			}
			if channel.Id == lastFailedChannelId {
				continue
			}
			// Skip unhealthy channels during retry
			if common.RedisEnabled && monitor.ShouldFailover(channel.Id) {
				logger.Infof(ctx, "health: skipping unhealthy channel #%d during retry (remain %d)", channel.Id, i)
				continue
			}
			logger.Infof(ctx, "using channel #%d to retry (remain %d)", channel.Id, i)
			middleware.SetupContextForSelectedChannel(c, channel, originalModel)

			// Reset body and interceptor for retry
			cachedBody, _ := common.GetRequestBody(c)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(cachedBody))
			if captureWriter != nil {
				captureWriter.body.Reset()
			}
			if streamBuffer != nil {
				streamBuffer.body.Reset()
			}

			bizErr = relayHelper(c, relaymode.ChatCompletions)
			if bizErr == nil {
				// Record new affinity mapping for the successful retry channel
				if affinityErr := middleware.RecordAffinityMapping(c, channel.Id); affinityErr != nil {
					logger.Errorf(ctx, "affinity: failed to record mapping after retry: %s", affinityErr.Error())
				}
				break
			}
			lastFailedChannelId = c.GetInt(ctxkey.ChannelId)
			channelName = c.GetString(ctxkey.ChannelName)
			go processChannelRelayError(ctx, userId, lastFailedChannelId, channelName, *bizErr)
		}

		if bizErr != nil {
			// Restore writer and send Claude format error
			if captureWriter != nil {
				c.Writer = captureWriter.ResponseWriter
			}
			if streamBuffer != nil {
				c.Writer = streamBuffer.realWriter
			}
			c.Request.URL.Path = origPath
			bizErr.Error.Message = helper.MessageWithRequestId(bizErr.Error.Message, requestId)
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

	// 8. Restore path
	c.Request.URL.Path = origPath

	// 9. Convert and write Claude format response
	if claudeReq.Stream {
		c.Writer = streamBuffer.realWriter
		writeClaudeStreamResponse(c, streamBuffer.body.Bytes(), claudeReq.Model)
	} else {
		c.Writer = captureWriter.ResponseWriter
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
		claudeResp := service.OpenAIResponseToClaude(openaiResp, claudeReq.Model)
		c.JSON(http.StatusOK, claudeResp)
	}

	monitor.Emit(c.GetInt(ctxkey.ChannelId), true)
	// Record metrics for smart load balancing
	monitor.RecordMetrics(c.GetInt(ctxkey.ChannelId), latencyMs, true, 0)
}

// writeClaudeStreamResponse converts buffered OpenAI SSE events to Claude SSE format.
func writeClaudeStreamResponse(c *gin.Context, openaiSSE []byte, modelName string) {
	msgId := fmt.Sprintf("msg_%s", random.GetUUID())
	common.SetEventStreamHeaders(c)

	// message_start
	render.ObjectData(c, service.ClaudeStreamEvent{
		Type: "message_start",
		Message: &service.ClaudeMessagesResponse{
			Id:      msgId,
			Type:    "message",
			Role:    "assistant",
			Content: []service.ClaudeContentBlock{},
			Model:   modelName,
			Usage:   service.ClaudeUsage{},
		},
	})

	// content_block_start
	render.ObjectData(c, service.ClaudeStreamEvent{
		Type:  "content_block_start",
		Index: 0,
		ContentBlock: &service.ClaudeContentBlock{
			Type: "text",
			Text: "",
		},
	})

	// Parse and convert OpenAI SSE events
	var totalUsage service.ClaudeUsage
	lines := strings.Split(string(openaiSSE), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
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

		if usage, ok := chunk["usage"].(map[string]any); ok {
			if pt, ok := usage["prompt_tokens"].(float64); ok {
				totalUsage.InputTokens = int(pt)
			}
			if ct, ok := usage["completion_tokens"].(float64); ok {
				totalUsage.OutputTokens = int(ct)
			}
		}

		events := service.OpenAIStreamChunkToClaudeEvents(chunk, modelName, msgId)
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
	render.ObjectData(c, service.ClaudeStreamEvent{
		Type: "message_delta",
		Delta: &service.ClaudeDelta{
			StopReason: &stopReason,
		},
		Usage: &service.ClaudeUsage{
			OutputTokens: totalUsage.OutputTokens,
		},
	})

	// message_stop
	render.ObjectData(c, map[string]any{
		"type": "message_stop",
	})

	render.Done(c)
}
