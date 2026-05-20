package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
	"github.com/songquanpeng/one-api/monitor"
	"github.com/songquanpeng/one-api/relay/channeltype"
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
		// Always read request model from context (set by auth middleware)
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
			// Smart load-balancing: use intelligent channel selection for new conversations
			channel = smartSelectChannel(ctx, userGroup, requestModel)
			if channel == nil {
				message := fmt.Sprintf("当前分组 %s 下对于模型 %s 无可用渠道", userGroup, requestModel)
				abortWithMessage(c, http.StatusServiceUnavailable, message)
				return
			}
		}
		logger.Debugf(ctx, "user id %d, user group: %s, request model: %s, using channel #%d", userId, userGroup, requestModel, channel.Id)
		SetupContextForSelectedChannel(c, channel, requestModel)
		// Record affinity mapping for conversation_id if present
		if err := RecordAffinityMapping(c, channel.Id); err != nil {
			logger.Errorf(ctx, "affinity: failed to record mapping: %s", err.Error())
		}
		c.Next()
	}
}

// smartSelectChannel uses intelligent load-balancing to select a channel.
// It falls back to the standard random selection if smart LB is unavailable.
func smartSelectChannel(ctx context.Context, userGroup, requestModel string) *model.Channel {
	// Get candidate channels from cache
	candidates := model.CacheGetSatisfiedChannels(userGroup, requestModel)
	if len(candidates) == 0 {
		// No candidates at all
		return nil
	}

	// Filter out unhealthy channels first
	healthyCandidates := filterHealthyChannels(candidates)
	if len(healthyCandidates) == 0 {
		// All unhealthy, fall back to degraded
		healthyCandidates = candidates
	}

	// If only one candidate, use it directly
	if len(healthyCandidates) == 1 {
		return healthyCandidates[0]
	}

	// Try smart selection via load balancer
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

	// Fallback: standard random selection (original behavior)
	ch, err := model.CacheGetRandomSatisfiedChannel(userGroup, requestModel, false)
	if err != nil {
		return nil
	}
	// Health check on the randomly selected channel
	if common.RedisEnabled && monitor.ShouldFailover(ch.Id) {
		healthyCh := findHealthyAlternative(userGroup, requestModel, ch.Id)
		if healthyCh != nil {
			return healthyCh
		}
	}
	return ch
}

// filterHealthyChannels returns only healthy (or degraded) channels from the list.
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

// findHealthyAlternative tries to find a healthy channel for the given model,
// excluding the specified channelId. Returns nil if no healthy alternative is found.
func findHealthyAlternative(group string, requestModel string, excludeChannelId int) *model.Channel {
	// Try to get a different channel by using ignoreFirstPriority=true first
	for ignorePriority := false; ; ignorePriority = true {
		candidate, err := model.CacheGetRandomSatisfiedChannel(group, requestModel, ignorePriority)
		if err != nil {
			return nil
		}
		if candidate.Id != excludeChannelId && !monitor.ShouldFailover(candidate.Id) {
			return candidate
		}
		// If we already tried with ignore priority, stop
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
	// this is for backward compatibility
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
