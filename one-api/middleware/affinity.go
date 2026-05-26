package middleware

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
	"github.com/songquanpeng/one-api/monitor"
)

const (
	// AffinityHeader is the HTTP header used to specify conversation affinity.
	AffinityHeader = "X-Conversation-Id"
	// AffinityQueryParam is the query parameter used to specify conversation affinity.
	AffinityQueryParam = "conversation_id"
	// AffinityRedisKeyPrefix is the Redis key prefix for conversation affinity mappings.
	AffinityRedisKeyPrefix = "affinity:"
	// DefaultAffinityTTLOneHour is the default TTL for conversation affinity mappings (1 hour).
	DefaultAffinityTTLOneHour = 3600
	// SessionFallbackHeader is the HTTP header for Claude Code session-based fallback affinity.
	SessionFallbackHeader = "X-Claude-Code-Session-Id"
	// AffinitySessionKeyPrefix is the Redis key prefix for session fallback affinity mappings.
	AffinitySessionKeyPrefix = "affinity:session:"
	// DefaultAffinityFallbackTTL is the default TTL for session fallback mappings (30 minutes).
	DefaultAffinityFallbackTTL = 1800
)

// conversationIdRequest is used to extract conversation_id from request body.
type conversationIdRequest struct {
	ConversationID string `json:"conversation_id"`
}

// getAffinityTTL returns the TTL duration for conversation affinity mappings.
func getAffinityTTL() time.Duration {
	ttlSeconds := DefaultAffinityTTLOneHour
	if envTTL := os.Getenv("AFFINITY_TTL_SECONDS"); envTTL != "" {
		if parsed, err := strconv.Atoi(envTTL); err == nil && parsed > 0 {
			ttlSeconds = parsed
		}
	}
	return time.Duration(ttlSeconds) * time.Second
}

// getAffinityFallbackTTL returns the TTL duration for session fallback affinity mappings.
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
// Priority: explicit conversation_id (header/query/body) > session fallback (X-Claude-Code-Session-Id) > normal routing.
func Affinity() func(c *gin.Context) {
	return func(c *gin.Context) {
		conversationId := ExtractConversationId(c)
		if conversationId != "" {
			c.Set(ctxkey.ConversationId, conversationId)
			lookupAffinityMapping(c, AffinityRedisKeyPrefix, conversationId)
			return
		}

		// Fallback: try session-based affinity for clients without conversation_id (e.g., Claude Code)
		sessionId := extractSessionFallbackId(c)
		if sessionId != "" {
			c.Set(ctxkey.SessionFallbackId, sessionId)
			lookupAffinityMapping(c, AffinitySessionKeyPrefix, sessionId)
			return
		}

		c.Next()
	}
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
// Priority: X-Conversation-Id header > conversation_id query param > body field
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

// extractSessionFallbackId extracts the session ID from X-Claude-Code-Session-Id header.
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

// ClearAffinityMapping removes all affinity mappings (conversation + session fallback) from Redis.
func ClearAffinityMapping(c *gin.Context) {
	if conversationId, exists := c.Get(ctxkey.ConversationId); exists {
		convIdStr := conversationId.(string)
		_ = common.RedisDel(AffinityRedisKeyPrefix + convIdStr)
		logger.Infof(c.Request.Context(), "affinity: cleared mapping for conversation %s", convIdStr)
	}
	if sessionId, exists := c.Get(ctxkey.SessionFallbackId); exists {
		sessionIdStr := sessionId.(string)
		_ = common.RedisDel(AffinitySessionKeyPrefix + sessionIdStr)
		logger.Infof(c.Request.Context(), "affinity: cleared session mapping for %s", sessionIdStr)
	}
}
