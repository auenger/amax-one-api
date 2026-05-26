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
	// AffinityRedisKeyPrefix is the Redis key prefix for affinity mappings.
	AffinityRedisKeyPrefix = "affinity:"
	// DefaultAffinityTTLOneHour is the default TTL for affinity mappings (1 hour).
	DefaultAffinityTTLOneHour = 3600
)

// conversationIdRequest is used to extract conversation_id from request body.
type conversationIdRequest struct {
	ConversationID string `json:"conversation_id"`
}

// getAffinityTTL returns the TTL duration for affinity mappings.
// It reads from the AFFINITY_TTL_SECONDS environment variable, defaulting to 1 hour.
func getAffinityTTL() time.Duration {
	ttlSeconds := DefaultAffinityTTLOneHour
	if envTTL := os.Getenv("AFFINITY_TTL_SECONDS"); envTTL != "" {
		if parsed, err := strconv.Atoi(envTTL); err == nil && parsed > 0 {
			ttlSeconds = parsed
		}
	}
	return time.Duration(ttlSeconds) * time.Second
}

// Affinity returns a Gin middleware that implements session-affinity routing.
// It extracts conversation_id from (in order of priority):
// 1. X-Conversation-Id header
// 2. conversation_id query parameter
// 3. conversation_id field in request body
//
// If a conversation_id is found, it looks up the affinity mapping in Redis.
// If a mapping exists and the channel is available, it sets SpecificChannelId
// in the context so that Distribute() uses that channel directly.
// If no mapping exists, it allows normal distribution and the mapping will be
// recorded after channel selection.
func Affinity() func(c *gin.Context) {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		conversationId := ExtractConversationId(c)
		if conversationId == "" {
			c.Next()
			return
		}

		// Store conversation_id in context for later use (e.g., recording mapping after distribution)
		c.Set(ctxkey.ConversationId, conversationId)

		// If SpecificChannelId is already set (e.g., via token key format sk-xxx-channelId),
		// respect that and skip affinity lookup
		if _, ok := c.Get(ctxkey.SpecificChannelId); ok {
			c.Next()
			return
		}

		// Look up affinity mapping in Redis
		if !common.RedisEnabled {
			c.Next()
			return
		}

		channelIdStr, err := common.RedisGet(AffinityRedisKeyPrefix + conversationId)
		if err != nil {
			// No mapping found, proceed with normal distribution
			logger.Debugf(ctx, "affinity: no mapping for conversation %s, will use normal routing", conversationId)
			c.Next()
			return
		}

		channelId, err := strconv.Atoi(channelIdStr)
		if err != nil {
			// Invalid mapping, clear it and proceed with normal distribution
			_ = common.RedisDel(AffinityRedisKeyPrefix + conversationId)
			logger.Errorf(ctx, "affinity: invalid channel ID '%s' for conversation %s, clearing mapping", channelIdStr, conversationId)
			c.Next()
			return
		}

		// Validate that the channel is still available
		channel, err := model.GetChannelById(channelId, true)
		if err != nil || channel.Status != model.ChannelStatusEnabled {
			// Channel no longer available, clear the mapping and proceed normally
			_ = common.RedisDel(AffinityRedisKeyPrefix + conversationId)
			if err != nil {
				logger.Infof(ctx, "affinity: channel %d not found for conversation %s, clearing mapping", channelId, conversationId)
			} else {
				logger.Infof(ctx, "affinity: channel %d disabled for conversation %s, clearing mapping", channelId, conversationId)
			}
			c.Next()
			return
		}

		// Also verify the channel supports the requested model
		requestModel := c.GetString(ctxkey.RequestModel)
		if requestModel != "" && !model.ChannelSupportsModel(channel, requestModel) {
			// Channel doesn't support this model, clear mapping and proceed normally
			_ = common.RedisDel(AffinityRedisKeyPrefix + conversationId)
			logger.Infof(ctx, "affinity: channel %d does not support model %s for conversation %s, clearing mapping",
				channelId, requestModel, conversationId)
			c.Next()
			return
		}

		// Health-aware validation: check if channel is healthy
		if common.RedisEnabled {
			healthStatus := monitor.GetChannelHealthStatus(channelId)
			if healthStatus == monitor.HealthStatusUnhealthy {
				// Channel is unhealthy, clear affinity mapping and proceed normally
				_ = common.RedisDel(AffinityRedisKeyPrefix + conversationId)
				logger.Infof(ctx, "affinity: channel %d is unhealthy for conversation %s, clearing mapping and will re-route",
					channelId, conversationId)
				c.Next()
				return
			}
			if healthStatus == monitor.HealthStatusDegraded {
				logger.Infof(ctx, "affinity: channel %d is degraded for conversation %s, using with caution",
					channelId, conversationId)
			}
		}

		// Set the specific channel ID for distribution
		c.Set(ctxkey.SpecificChannelId, channelIdStr)
		logger.Debugf(ctx, "affinity: conversation %s → channel %d", conversationId, channelId)
		c.Next()
	}
}

// ExtractConversationId extracts the conversation_id from the request.
// Priority: X-Conversation-Id header > conversation_id query param > body field
func ExtractConversationId(c *gin.Context) string {
	// 1. Check header
	if id := c.Request.Header.Get(AffinityHeader); id != "" {
		return id
	}

	// 2. Check query parameter
	if id := c.Query(AffinityQueryParam); id != "" {
		return id
	}

	// 3. Check request body
	var req conversationIdRequest
	_ = common.UnmarshalBodyReusable(c, &req)
	if req.ConversationID != "" {
		return req.ConversationID
	}

	return ""
}

// RecordAffinityMapping records a conversation → channel mapping in Redis with TTL.
// This should be called after successful channel selection to establish affinity.
func RecordAffinityMapping(c *gin.Context, channelId int) error {
	conversationId, exists := c.Get(ctxkey.ConversationId)
	if !exists {
		return nil
	}

	convIdStr := conversationId.(string)
	key := AffinityRedisKeyPrefix + convIdStr

	ttl := getAffinityTTL()
	err := common.RedisSet(key, fmt.Sprintf("%d", channelId), ttl)
	if err != nil {
		return fmt.Errorf("failed to record affinity mapping: %w", err)
	}

	logger.Debugf(c.Request.Context(), "affinity: recorded mapping %s → channel %d (TTL: %ds)", convIdStr, channelId, int(ttl.Seconds()))
	return nil
}

// ClearAffinityMapping removes a conversation → channel mapping from Redis.
func ClearAffinityMapping(c *gin.Context) {
	conversationId, exists := c.Get(ctxkey.ConversationId)
	if !exists {
		return
	}

	convIdStr := conversationId.(string)
	_ = common.RedisDel(AffinityRedisKeyPrefix + convIdStr)
	logger.Infof(c.Request.Context(), "affinity: cleared mapping for conversation %s", convIdStr)
}
