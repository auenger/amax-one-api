package middleware

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
	"github.com/songquanpeng/one-api/monitor"
)

const (
	AffinityHeader              = "X-Conversation-Id"
	AffinityQueryParam          = "conversation_id"
	AffinityRedisKeyPrefix      = "affinity:"
	DefaultAffinityTTLOneHour   = 3600
	SessionFallbackHeader       = "X-Claude-Code-Session-Id"
	AffinitySessionKeyPrefix    = "affinity:session:"
	DefaultAffinityFallbackTTL  = 1800
	FallbackAffinityKeyPrefix   = "fallback-affinity:"
	FallbackAffinitySessionKeyPrefix = "fallback-affinity:session:"
)

type conversationIdRequest struct {
	ConversationID string `json:"conversation_id"`
}

func getAffinityTTL() time.Duration {
	ttlSeconds := DefaultAffinityTTLOneHour
	if envTTL := os.Getenv("AFFINITY_TTL_SECONDS"); envTTL != "" {
		if parsed, err := strconv.Atoi(envTTL); err == nil && parsed > 0 {
			ttlSeconds = parsed
		}
	}
	return time.Duration(ttlSeconds) * time.Second
}

func getAffinityFallbackTTL() time.Duration {
	ttlSeconds := DefaultAffinityFallbackTTL
	if envTTL := os.Getenv("AFFINITY_FALLBACK_TTL_SECONDS"); envTTL != "" {
		if parsed, err := strconv.Atoi(envTTL); err == nil && parsed > 0 {
			ttlSeconds = parsed
		}
	}
	return time.Duration(ttlSeconds) * time.Second
}

// Affinity returns a Gin middleware that implements session-affinity routing.
// Priority: fallback affinity (sticky) > conversation affinity > session fallback > normal routing.
func Affinity() func(c *gin.Context) {
	return func(c *gin.Context) {
		// Check fallback affinity first (sticky fallback model binding)
		if lookupFallbackAffinity(c) {
			return
		}

		conversationId := ExtractConversationId(c)
		if conversationId != "" {
			c.Set(ctxkey.ConversationId, conversationId)
			lookupAffinityMapping(c, AffinityRedisKeyPrefix, conversationId)
			return
		}

		sessionId := extractSessionFallbackId(c)
		if sessionId != "" {
			c.Set(ctxkey.SessionFallbackId, sessionId)
			lookupAffinityMapping(c, AffinitySessionKeyPrefix, sessionId)
			return
		}

		c.Next()
	}
}

// lookupFallbackAffinity checks if this conversation/session has a sticky fallback model binding.
// Returns true if fallback affinity was found and applied (channel bound).
func lookupFallbackAffinity(c *gin.Context) bool {
	ctx := c.Request.Context()

	if !config.FallbackEnabled || !common.RedisEnabled {
		return false
	}

	if _, ok := c.Get(ctxkey.SpecificChannelId); ok {
		return false
	}

	// Try conversation-based fallback affinity first
	var affinityKey string
	conversationId := ExtractConversationId(c)
	if conversationId != "" {
		affinityKey = FallbackAffinityKeyPrefix + conversationId
		c.Set(ctxkey.ConversationId, conversationId)
	} else {
		sessionId := extractSessionFallbackId(c)
		if sessionId != "" {
			affinityKey = FallbackAffinitySessionKeyPrefix + sessionId
			c.Set(ctxkey.SessionFallbackId, sessionId)
		}
	}

	if affinityKey == "" {
		return false
	}

	value, err := common.RedisGet(affinityKey)
	if err != nil {
		return false
	}

	// Value format: "{channelId}:{model}"
	parts := strings.SplitN(value, ":", 2)
	if len(parts) != 2 {
		_ = common.RedisDel(affinityKey)
		logger.Errorf(ctx, "fallback-affinity: invalid mapping value '%s' for %s, clearing", value, affinityKey)
		return false
	}

	channelId, err := strconv.Atoi(parts[0])
	if err != nil {
		_ = common.RedisDel(affinityKey)
		logger.Errorf(ctx, "fallback-affinity: invalid channel ID '%s' for %s, clearing", parts[0], affinityKey)
		return false
	}
	fallbackModel := parts[1]

	// Validate fallback channel
	channel, err := model.GetChannelById(channelId, true)
	if err != nil || channel.Status != model.ChannelStatusEnabled {
		_ = common.RedisDel(affinityKey)
		logger.Infof(ctx, "fallback-affinity: channel %d unavailable for %s, clearing mapping", channelId, affinityKey)
		return false
	}

	// Check health
	if common.RedisEnabled {
		healthStatus := monitor.GetChannelHealthStatus(channelId)
		if healthStatus == monitor.HealthStatusUnhealthy {
			_ = common.RedisDel(affinityKey)
			logger.Infof(ctx, "fallback-affinity: channel %d unhealthy for %s, clearing mapping", channelId, affinityKey)
			return false
		}
	}

	// Check fallback channel still supports the fallback model
	if !model.ChannelSupportsModel(channel, fallbackModel) {
		_ = common.RedisDel(affinityKey)
		logger.Infof(ctx, "fallback-affinity: channel %d does not support model %s, clearing mapping", channelId, fallbackModel)
		return false
	}

	c.Set(ctxkey.SpecificChannelId, strconv.Itoa(channelId))
	c.Set(ctxkey.FallbackModelOverride, fallbackModel)
	logger.Infof(ctx, "fallback-affinity: %s → channel %d, model %s", affinityKey, channelId, fallbackModel)
	c.Next()
	return true
}

// lookupAffinityMapping looks up an affinity mapping in Redis and validates the bound channel.
func lookupAffinityMapping(c *gin.Context, keyPrefix, affinityId string) {
	ctx := c.Request.Context()

	if _, ok := c.Get(ctxkey.SpecificChannelId); ok {
		c.Next()
		return
	}

	if !common.RedisEnabled {
		c.Next()
		return
	}

	channelIdStr, err := common.RedisGet(keyPrefix + affinityId)
	if err != nil {
		logger.Debugf(ctx, "affinity: no mapping for %s%s, will use normal routing", keyPrefix, affinityId)
		c.Next()
		return
	}

	channelId, err := strconv.Atoi(channelIdStr)
	if err != nil {
		_ = common.RedisDel(keyPrefix + affinityId)
		logger.Errorf(ctx, "affinity: invalid channel ID '%s' for %s%s, clearing mapping", channelIdStr, keyPrefix, affinityId)
		c.Next()
		return
	}

	channel, err := model.GetChannelById(channelId, true)
	if err != nil || channel.Status != model.ChannelStatusEnabled {
		_ = common.RedisDel(keyPrefix + affinityId)
		if err != nil {
			logger.Infof(ctx, "affinity: channel %d not found for %s%s, clearing mapping", channelId, keyPrefix, affinityId)
		} else {
			logger.Infof(ctx, "affinity: channel %d disabled for %s%s, clearing mapping", channelId, keyPrefix, affinityId)
		}
		c.Next()
		return
	}

	requestModel := c.GetString(ctxkey.RequestModel)
	if requestModel != "" && !model.ChannelSupportsModel(channel, requestModel) {
		_ = common.RedisDel(keyPrefix + affinityId)
		logger.Infof(ctx, "affinity: channel %d does not support model %s for %s%s, clearing mapping",
			channelId, requestModel, keyPrefix, affinityId)
		c.Next()
		return
	}

	if common.RedisEnabled {
		healthStatus := monitor.GetChannelHealthStatus(channelId)
		if healthStatus == monitor.HealthStatusUnhealthy {
			_ = common.RedisDel(keyPrefix + affinityId)
			logger.Infof(ctx, "affinity: channel %d is unhealthy for %s%s, clearing mapping and will re-route",
				channelId, keyPrefix, affinityId)
			c.Next()
			return
		}
		if healthStatus == monitor.HealthStatusDegraded {
			logger.Infof(ctx, "affinity: channel %d is degraded for %s%s, using with caution",
				channelId, keyPrefix, affinityId)
		}
	}

	c.Set(ctxkey.SpecificChannelId, channelIdStr)
	logger.Debugf(ctx, "affinity: %s%s → channel %d", keyPrefix, affinityId, channelId)
	c.Next()
}

// ExtractConversationId extracts the conversation_id from the request.
func ExtractConversationId(c *gin.Context) string {
	if id := c.Request.Header.Get(AffinityHeader); id != "" {
		return id
	}
	if id := c.Query(AffinityQueryParam); id != "" {
		return id
	}
	var req conversationIdRequest
	_ = common.UnmarshalBodyReusable(c, &req)
	if req.ConversationID != "" {
		return req.ConversationID
	}
	return ""
}

func extractSessionFallbackId(c *gin.Context) string {
	return c.Request.Header.Get(SessionFallbackHeader)
}

// RecordAffinityMapping records a conversation → channel mapping in Redis with TTL.
func RecordAffinityMapping(c *gin.Context, channelId int) error {
	conversationId, exists := c.Get(ctxkey.ConversationId)
	if !exists {
		return nil
	}

	convIdStr := conversationId.(string)
	ttl := getAffinityTTL()
	err := common.RedisSet(AffinityRedisKeyPrefix+convIdStr, fmt.Sprintf("%d", channelId), ttl)
	if err != nil {
		return fmt.Errorf("failed to record affinity mapping: %w", err)
	}

	logger.Debugf(c.Request.Context(), "affinity: recorded mapping %s → channel %d (TTL: %ds)", convIdStr, channelId, int(ttl.Seconds()))
	return nil
}

// RecordSessionFallbackMapping records a session → channel mapping in Redis with TTL.
func RecordSessionFallbackMapping(c *gin.Context, channelId int) error {
	sessionId, exists := c.Get(ctxkey.SessionFallbackId)
	if !exists {
		return nil
	}

	sessionIdStr := sessionId.(string)
	ttl := getAffinityFallbackTTL()
	err := common.RedisSet(AffinitySessionKeyPrefix+sessionIdStr, fmt.Sprintf("%d", channelId), ttl)
	if err != nil {
		return fmt.Errorf("failed to record session fallback mapping: %w", err)
	}

	logger.Debugf(c.Request.Context(), "affinity: recorded session mapping %s → channel %d (TTL: %ds)", sessionIdStr, channelId, int(ttl.Seconds()))
	return nil
}

// RecordFallbackAffinity records a conversation/session → fallback channel+model mapping in Redis.
func RecordFallbackAffinity(c *gin.Context, channelId int, fallbackModel string) error {
	if !config.FallbackEnabled {
		return nil
	}

	value := fmt.Sprintf("%d:%s", channelId, fallbackModel)
	ttl := getAffinityTTL()

	if conversationId, exists := c.Get(ctxkey.ConversationId); exists {
		convIdStr := conversationId.(string)
		err := common.RedisSet(FallbackAffinityKeyPrefix+convIdStr, value, ttl)
		if err != nil {
			return fmt.Errorf("failed to record fallback affinity: %w", err)
		}
		logger.Debugf(c.Request.Context(), "fallback-affinity: recorded %s → %s (TTL: %ds)", convIdStr, value, int(ttl.Seconds()))
	}

	if sessionId, exists := c.Get(ctxkey.SessionFallbackId); exists {
		sessionIdStr := sessionId.(string)
		sessionTTL := getAffinityFallbackTTL()
		err := common.RedisSet(FallbackAffinitySessionKeyPrefix+sessionIdStr, value, sessionTTL)
		if err != nil {
			return fmt.Errorf("failed to record fallback affinity session: %w", err)
		}
		logger.Debugf(c.Request.Context(), "fallback-affinity: recorded session %s → %s (TTL: %ds)", sessionIdStr, value, int(sessionTTL.Seconds()))
	}

	return nil
}

// ClearAffinityMapping removes all affinity mappings (conversation + session fallback + fallback affinity) from Redis.
func ClearAffinityMapping(c *gin.Context) {
	if conversationId, exists := c.Get(ctxkey.ConversationId); exists {
		convIdStr := conversationId.(string)
		_ = common.RedisDel(AffinityRedisKeyPrefix + convIdStr)
		_ = common.RedisDel(FallbackAffinityKeyPrefix + convIdStr)
		logger.Infof(c.Request.Context(), "affinity: cleared mapping for conversation %s", convIdStr)
	}
	if sessionId, exists := c.Get(ctxkey.SessionFallbackId); exists {
		sessionIdStr := sessionId.(string)
		_ = common.RedisDel(AffinitySessionKeyPrefix + sessionIdStr)
		_ = common.RedisDel(FallbackAffinitySessionKeyPrefix + sessionIdStr)
		logger.Infof(c.Request.Context(), "affinity: cleared session mapping for %s", sessionIdStr)
	}
}
