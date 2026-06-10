package middleware

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/yzw/aihub/common"
	"github.com/yzw/aihub/common/config"
	"github.com/yzw/aihub/common/ctxkey"
	"github.com/yzw/aihub/common/logger"
	"github.com/yzw/aihub/model"
	"github.com/yzw/aihub/monitor"
	"github.com/yzw/aihub/relay/channeltype"
)

type ModelRequest struct {
	Model string `json:"model" form:"model"`
}

func Distribute() func(c *gin.Context) {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		userId := c.GetInt(ctxkey.Id)
		userGroup, _ := model.CacheGetUserGroup(userId)
		c.Set(ctxkey.Group, userGroup)
		requestModel := c.GetString(ctxkey.RequestModel)
		var channel *model.Channel
		channelId, ok := c.Get(ctxkey.SpecificChannelId)
		if ok {
			id, err := strconv.Atoi(channelId.(string))
			if err != nil {
				abortWithMessage(c, http.StatusBadRequest, "无效的渠道 Id")
				return
			}
			channel, err = model.GetChannelById(id, true)
			if err != nil {
				abortWithMessage(c, http.StatusBadRequest, "无效的渠道 Id")
				return
			}
			if channel.Status != model.ChannelStatusEnabled {
				abortWithMessage(c, http.StatusForbidden, "该渠道已被禁用")
				return
			}
		} else {
			// Check if fallback routing should kick in
			if tryFallbackRouting(c, ctx, userGroup, requestModel) {
				// Fallback was applied, SpecificChannelId + FallbackModelOverride are set
				fallbackChId := c.GetString(ctxkey.SpecificChannelId)
				id, _ := strconv.Atoi(fallbackChId)
				channel, _ = model.GetChannelById(id, true)
			}

			if channel == nil {
				// Normal smart load-balancing
				channel = smartSelectChannel(ctx, userGroup, requestModel)
			}

			if channel == nil {
				message := fmt.Sprintf("当前分组 %s 下对于模型 %s 无可用渠道", userGroup, requestModel)
				abortWithMessage(c, http.StatusServiceUnavailable, message)
				return
			}
		}
		logger.Debugf(ctx, "user id %d, user group: %s, request model: %s, using channel #%d", userId, userGroup, requestModel, channel.Id)
		originalModel := requestModel

		// If fallback model override is set, use it instead of downgrade logic
		if fallbackModel, hasFallback := c.Get(ctxkey.FallbackModelOverride); hasFallback {
			fallbackModelStr := fallbackModel.(string)
			logger.Infof(ctx, "fallback: routing to fallback model %s on channel #%d (original: %s)", fallbackModelStr, channel.Id, originalModel)
			requestModel = fallbackModelStr
			c.Set(ctxkey.RequestModel, requestModel)
		} else if channel.DowngradeThresholdPct > 0 {
			if downgradedModel := monitor.CheckDowngradeForChannel(channel.Id); downgradedModel != "" {
				logger.Debugf(ctx, "downgrade: channel #%d, replacing model %s -> %s", channel.Id, requestModel, downgradedModel)
				requestModel = downgradedModel
				c.Set(ctxkey.RequestModel, requestModel)
			}
		}

		SetupContextForSelectedChannel(c, channel, requestModel)
		c.Set(ctxkey.OriginalModel, originalModel)

		if err := RecordAffinityMapping(c, channel.Id); err != nil {
			logger.Errorf(ctx, "affinity: failed to record mapping: %s", err.Error())
		}
		if err := RecordSessionFallbackMapping(c, channel.Id); err != nil {
			logger.Errorf(ctx, "affinity: failed to record session mapping: %s", err.Error())
		}

		// Record fallback affinity if this was a fallback-routed request
		if _, hasFallback := c.Get(ctxkey.FallbackModelOverride); hasFallback {
			if err := RecordFallbackAffinity(c, channel.Id, c.GetString(ctxkey.FallbackModelOverride)); err != nil {
				logger.Errorf(ctx, "fallback-affinity: failed to record: %s", err.Error())
			}
		}

		c.Next()
	}
}

// tryFallbackRouting checks if the request should be routed to the fallback model.
// Sets SpecificChannelId and FallbackModelOverride on the context if fallback is triggered.
// Returns true if fallback was applied.
func tryFallbackRouting(c *gin.Context, ctx context.Context, userGroup, requestModel string) bool {
	if !config.FallbackEnabled || config.FallbackChannelId <= 0 || config.FallbackModel == "" {
		return false
	}

	// Validate fallback channel
	fallbackChannel, err := model.GetChannelById(int(config.FallbackChannelId), true)
	if err != nil || fallbackChannel.Status != model.ChannelStatusEnabled {
		logger.Infof(ctx, "fallback: fallback channel %d is not available, skipping fallback routing", config.FallbackChannelId)
		return false
	}

	// Check health of fallback channel
	if common.RedisEnabled && monitor.GetChannelHealthStatus(int(config.FallbackChannelId)) == monitor.HealthStatusUnhealthy {
		logger.Infof(ctx, "fallback: fallback channel %d is unhealthy, skipping fallback routing", config.FallbackChannelId)
		return false
	}

	// Get candidates for the requested model
	candidates := model.CacheGetSatisfiedChannels(userGroup, requestModel)
	if len(candidates) == 0 {
		// No channels for this model at all, route to fallback
		logger.Infof(ctx, "fallback: no channels for model %s, routing to fallback", requestModel)
		c.Set(ctxkey.SpecificChannelId, strconv.FormatInt(config.FallbackChannelId, 10))
		c.Set(ctxkey.FallbackModelOverride, config.FallbackModel)
		return true
	}

	// Count unhealthy channels
	healthyCount := 0
	for _, ch := range candidates {
		if !common.RedisEnabled || !monitor.ShouldFailover(ch.Id) {
			healthyCount++
		}
	}

	if healthyCount == 0 {
		// All channels unhealthy → force fallback
		logger.Infof(ctx, "fallback: all %d channels unhealthy for model %s, routing to fallback", len(candidates), requestModel)
		c.Set(ctxkey.SpecificChannelId, strconv.FormatInt(config.FallbackChannelId, 10))
		c.Set(ctxkey.FallbackModelOverride, config.FallbackModel)
		return true
	}

	if healthyCount < len(candidates) {
		// Partial unhealthy → probabilistic fallback
		unhealthyRatio := float64(len(candidates)-healthyCount) / float64(len(candidates))
		if rand.Float64() < unhealthyRatio {
			logger.Infof(ctx, "fallback: %.0f%% channels unhealthy for model %s, routing to fallback", unhealthyRatio*100, requestModel)
			c.Set(ctxkey.SpecificChannelId, strconv.FormatInt(config.FallbackChannelId, 10))
			c.Set(ctxkey.FallbackModelOverride, config.FallbackModel)
			return true
		}
	}

	return false
}

// smartSelectChannel uses intelligent load-balancing to select a channel.
func smartSelectChannel(ctx context.Context, userGroup, requestModel string) *model.Channel {
	candidates := model.CacheGetSatisfiedChannels(userGroup, requestModel)
	if len(candidates) == 0 {
		return nil
	}

	healthyCandidates := filterHealthyChannels(candidates)
	if len(healthyCandidates) == 0 {
		healthyCandidates = candidates
	}

	if len(healthyCandidates) == 1 {
		return healthyCandidates[0]
	}

	if common.RedisEnabled {
		channelIds := make([]int, len(healthyCandidates))
		for i, ch := range healthyCandidates {
			channelIds[i] = ch.Id
		}
		selectedId, score := monitor.SmartChannelSelect(channelIds)
		logger.Debugf(ctx, "lb: smart selected channel #%d (score=%.3f) from %d candidates", selectedId, score, len(channelIds))
		for _, ch := range healthyCandidates {
			if ch.Id == selectedId {
				return ch
			}
		}
	}

	ch, err := model.CacheGetRandomSatisfiedChannel(userGroup, requestModel, false)
	if err != nil {
		return nil
	}
	if common.RedisEnabled && monitor.ShouldFailover(ch.Id) {
		healthyCh := findHealthyAlternative(userGroup, requestModel, ch.Id)
		if healthyCh != nil {
			return healthyCh
		}
	}
	return ch
}

func filterHealthyChannels(channels []*model.Channel) []*model.Channel {
	if !common.RedisEnabled {
		return channels
	}
	var healthy []*model.Channel
	for _, ch := range channels {
		if !monitor.ShouldFailover(ch.Id) {
			healthy = append(healthy, ch)
		}
	}
	return healthy
}

func findHealthyAlternative(group string, requestModel string, excludeChannelId int) *model.Channel {
	for ignorePriority := false; ; ignorePriority = true {
		candidate, err := model.CacheGetRandomSatisfiedChannel(group, requestModel, ignorePriority)
		if err != nil {
			return nil
		}
		if candidate.Id != excludeChannelId && !monitor.ShouldFailover(candidate.Id) {
			return candidate
		}
		if ignorePriority {
			break
		}
	}
	return nil
}

func SetupContextForSelectedChannel(c *gin.Context, channel *model.Channel, modelName string) {
	c.Set(ctxkey.Channel, channel.Type)
	c.Set(ctxkey.ChannelId, channel.Id)
	c.Set(ctxkey.ChannelName, channel.Name)
	if channel.SystemPrompt != nil && *channel.SystemPrompt != "" {
		c.Set(ctxkey.SystemPrompt, *channel.SystemPrompt)
	}
	c.Set(ctxkey.ModelMapping, channel.GetModelMapping())
	c.Set(ctxkey.OriginalModel, modelName) // for retry
	c.Request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", channel.Key))
	c.Set(ctxkey.BaseURL, channel.GetBaseURL())
	cfg, _ := channel.LoadConfig()
	if channel.Other != nil {
		switch channel.Type {
		case channeltype.Azure:
			if cfg.APIVersion == "" {
				cfg.APIVersion = *channel.Other
			}
		case channeltype.Xunfei:
			if cfg.APIVersion == "" {
				cfg.APIVersion = *channel.Other
			}
		case channeltype.Gemini:
			if cfg.APIVersion == "" {
				cfg.APIVersion = *channel.Other
			}
		case channeltype.AIProxyLibrary:
			if cfg.LibraryID == "" {
				cfg.LibraryID = *channel.Other
			}
		case channeltype.Ali:
			if cfg.Plugin == "" {
				cfg.Plugin = *channel.Other
			}
		}
	}
	c.Set(ctxkey.Config, cfg)
}
