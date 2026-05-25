package controller

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/helper"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/middleware"
	dbmodel "github.com/songquanpeng/one-api/model"
	"github.com/songquanpeng/one-api/monitor"
	"github.com/songquanpeng/one-api/relay/controller"
	"github.com/songquanpeng/one-api/relay/meta"
	"github.com/songquanpeng/one-api/relay/model"
	"github.com/songquanpeng/one-api/relay/relaymode"
)

// https://platform.openai.com/docs/api-reference/chat

func relayHelper(c *gin.Context, relayMode int) *model.ErrorWithStatusCode {
	var err *model.ErrorWithStatusCode
	switch relayMode {
	case relaymode.ImagesGenerations:
		err = controller.RelayImageHelper(c, relayMode)
	case relaymode.AudioSpeech:
		fallthrough
	case relaymode.AudioTranslation:
		fallthrough
	case relaymode.AudioTranscription:
		err = controller.RelayAudioHelper(c, relayMode)
	case relaymode.Proxy:
		err = controller.RelayProxyHelper(c, relayMode)
	default:
		err = controller.RelayTextHelper(c)
	}
	return err
}

// recordTiming captures t_response and asynchronously writes the full timing record.
func recordTiming(c *gin.Context) {
	tRequest, _ := c.Get(ctxkey.TimingTRequest)
	tRelay, _ := c.Get(meta.TimingTRelay)
	tUpstream, _ := c.Get("timing_t_upstream")
	tBodyDone, _ := c.Get(ctxkey.TimingTBodyDone)
	tResponse := time.Now().UnixMilli()

	tReqMs, _ := tRequest.(int64)
	tRelayMs, _ := tRelay.(int64)
	tUpMs, _ := tUpstream.(int64)
	tBdMs, _ := tBodyDone.(int64)

	// Only record if we have the initial timestamp
	if tReqMs == 0 {
		return
	}

	channelId := c.GetInt(ctxkey.ChannelId)
	channelName := c.GetString(ctxkey.ChannelName)
	userId := c.GetInt(ctxkey.Id)
	username := c.GetString(ctxkey.Username)
	if username == "" && userId > 0 {
		username = dbmodel.GetUsernameById(userId)
	}
	tokenName := c.GetString(ctxkey.TokenName)
	modelName := c.GetString(ctxkey.OriginalModel)
	requestId := c.GetString(helper.RequestIdKey)

	// Determine is_stream from request body
	isStream := false
	if _, err := common.GetRequestBody(c); err == nil {
		var req struct {
			Stream bool `json:"stream"`
		}
		_ = common.UnmarshalBodyReusable(c, &req)
		isStream = req.Stream
	}

	middlewareMs := tRelayMs - tReqMs
	upstreamMs := tUpMs - tRelayMs

	var streamMs, responseMs int64
	if tBdMs > 0 {
		streamMs = tBdMs - tUpMs
		responseMs = tResponse - tBdMs
	} else {
		responseMs = tResponse - tUpMs
	}
	totalMs := tResponse - tReqMs

	// Clamp negative values to 0 (can happen if hooks weren't reached)
	if middlewareMs < 0 {
		middlewareMs = 0
	}
	if upstreamMs < 0 {
		upstreamMs = 0
	}
	if streamMs < 0 {
		streamMs = 0
	}
	if responseMs < 0 {
		responseMs = 0
	}
	if totalMs < 0 {
		totalMs = 0
	}

	timing := &dbmodel.RequestTiming{
		RequestId:    requestId,
		ChannelId:    channelId,
		ChannelName:  channelName,
		UserId:       c.GetInt(ctxkey.Id),
		Username:     username,
		TokenName:    tokenName,
		ModelName:    modelName,
		IsStream:     isStream,
		TRequest:     tReqMs,
		TRelay:       tRelayMs,
		TUpstream:    tUpMs,
		TBodyDone:    tBdMs,
		TResponse:    tResponse,
		MiddlewareMs: middlewareMs,
		UpstreamMs:   upstreamMs,
		StreamMs:     streamMs,
		ResponseMs:   responseMs,
		TotalMs:      totalMs,
	}
	dbmodel.RecordTimingAsync(c.Request.Context(), timing)
}

func Relay(c *gin.Context) {
	ctx := c.Request.Context()
	relayMode := relaymode.GetByPath(c.Request.URL.Path)
	if config.DebugEnabled {
		requestBody, _ := common.GetRequestBody(c)
		logger.Debugf(ctx, "request body: %s", string(requestBody))
	}
	channelId := c.GetInt(ctxkey.ChannelId)
	userId := c.GetInt(ctxkey.Id)
	originalModel := c.GetString(ctxkey.OriginalModel)

	// Track concurrency: increment on entry, decrement on exit
	monitor.IncrConcurrency(channelId, originalModel)
	defer monitor.DecrConcurrency(channelId, originalModel)

	startTime := time.Now()
	bizErr := relayHelper(c, relayMode)
	latencyMs := time.Since(startTime).Milliseconds()
	// Record timing for every relay attempt
	recordTiming(c)
	if bizErr == nil {
		monitor.Emit(channelId, true)
		// Record metrics for smart load balancing
		monitor.RecordMetrics(channelId, latencyMs, true, 0)
		return
	}
	lastFailedChannelId := channelId
	channelName := c.GetString(ctxkey.ChannelName)
	group := c.GetString(ctxkey.Group)
	go processChannelRelayError(ctx, userId, channelId, channelName, *bizErr)
	// Record metrics for smart load balancing (failure)
	monitor.RecordMetrics(channelId, latencyMs, false, 0)
	requestId := c.GetString(helper.RequestIdKey)
	retryTimes := config.RetryTimes
	if !shouldRetry(c, bizErr.StatusCode) {
		logger.Errorf(ctx, "relay error happen, status code is %d, won't retry in this case", bizErr.StatusCode)
		retryTimes = 0
	}
	for i := retryTimes; i > 0; i-- {
		channel, err := dbmodel.CacheGetRandomSatisfiedChannel(group, originalModel, i != retryTimes)
		if err != nil {
			logger.Errorf(ctx, "CacheGetRandomSatisfiedChannel failed: %+v", err)
			break
		}
		// Skip unhealthy channels during retry
		if common.RedisEnabled && monitor.ShouldFailover(channel.Id) {
			logger.Infof(ctx, "health: skipping unhealthy channel #%d during retry (remain times %d)", channel.Id, i)
			continue
		}
		logger.Infof(ctx, "using channel #%d to retry (remain times %d)", channel.Id, i)
		if channel.Id == lastFailedChannelId {
			continue
		}
		middleware.SetupContextForSelectedChannel(c, channel, originalModel)
		// Update request model for retry channel (may have different downgrade config)
		retryRequestModel := originalModel
		if channel.DowngradeThresholdPct > 0 {
			if downgradedModel := monitor.CheckDowngradeForChannel(channel.Id); downgradedModel != "" {
				retryRequestModel = downgradedModel
			}
		}
		c.Set(ctxkey.RequestModel, retryRequestModel)
		requestBody, err := common.GetRequestBody(c)
		c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		// Track concurrency for retry channel
		monitor.IncrConcurrency(channel.Id, originalModel)
		bizErr = relayHelper(c, relayMode)
		monitor.DecrConcurrency(channel.Id, originalModel)
		if bizErr == nil {
			// Record new affinity mapping for the successful retry channel
			if affinityErr := middleware.RecordAffinityMapping(c, channel.Id); affinityErr != nil {
				logger.Errorf(ctx, "affinity: failed to record mapping after retry: %s", affinityErr.Error())
			}
			return
		}
		channelId := c.GetInt(ctxkey.ChannelId)
		lastFailedChannelId = channelId
		channelName := c.GetString(ctxkey.ChannelName)
		go processChannelRelayError(ctx, userId, channelId, channelName, *bizErr)
	}
	if bizErr != nil {
		if bizErr.StatusCode == http.StatusTooManyRequests {
			bizErr.Error.Message = "当前分组上游负载已饱和，请稍后再试 | upstream: " + bizErr.Error.Message
		}

		// BUG: bizErr is in race condition
		bizErr.Error.Message = helper.MessageWithRequestId(bizErr.Error.Message, requestId)
		c.JSON(bizErr.StatusCode, gin.H{
			"error": bizErr.Error,
		})
	}
}

func shouldRetry(c *gin.Context, statusCode int) bool {
	if _, ok := c.Get(ctxkey.SpecificChannelId); ok {
		// If this was an affinity-bound channel, allow retry by clearing the binding.
		// The affinity middleware already validated the channel, so a failure here
		// means the channel went down between validation and actual use.
		if _, hasAffinity := c.Get(ctxkey.ConversationId); hasAffinity {
			// Clear affinity so retry can pick a different channel
			middleware.ClearAffinityMapping(c)
			c.Set(ctxkey.SpecificChannelId, "") // Clear to allow random selection in retry
			c.Set(ctxkey.OriginalModel, c.GetString(ctxkey.RequestModel))
			logger.Infof(c.Request.Context(), "affinity: bound channel failed, clearing mapping and allowing retry")
		} else {
			return false // Explicit channel selection (e.g., sk-xxx-channelId), no retry
		}
	}
	if statusCode == http.StatusTooManyRequests {
		return true
	}
	if statusCode/100 == 5 {
		return true
	}
	if statusCode == http.StatusBadRequest {
		return false
	}
	if statusCode/100 == 2 {
		return false
	}
	return true
}

func processChannelRelayError(ctx context.Context, userId int, channelId int, channelName string, err model.ErrorWithStatusCode) {
	logger.Errorf(ctx, "relay error (channel id %d, user id: %d): %s", channelId, userId, err.Message)
	// https://platform.openai.com/docs/guides/error-codes/api-errors
	if monitor.ShouldDisableChannel(&err.Error, err.StatusCode) {
		monitor.DisableChannel(channelId, channelName, err.Message)
	} else {
		monitor.Emit(channelId, false)
	}
	// Health-aware: mark channel as degraded on rate limit (429)
	if err.StatusCode == http.StatusTooManyRequests {
		monitor.MarkChannelDegraded(channelId, "rate limited (429)")
	}
}

func RelayNotImplemented(c *gin.Context) {
	err := model.Error{
		Message: "API not implemented",
		Type:    "one_api_error",
		Param:   "",
		Code:    "api_not_implemented",
	}
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": err,
	})
}

func RelayNotFound(c *gin.Context) {
	err := model.Error{
		Message: fmt.Sprintf("Invalid URL (%s %s)", c.Request.Method, c.Request.URL.Path),
		Type:    "invalid_request_error",
		Param:   "",
		Code:    "",
	}
	c.JSON(http.StatusNotFound, gin.H{
		"error": err,
	})
}
