package controller

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/client"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
	"github.com/songquanpeng/one-api/monitor"
	"github.com/songquanpeng/one-api/relay/channeltype"

	"github.com/gin-gonic/gin"
)

func init() {
	// Register quota query and cache functions with the monitor package
	// to avoid circular imports between controller and monitor.
	monitor.RegisterQuotaQueryFunc(queryProviderQuota, cacheQuota)
}

// ---------------------------------------------------------------------------
// Provider-specific response types for quota APIs
// ---------------------------------------------------------------------------

// ZhipuQuotaLimitResponse is the response from Zhipu GLM quota API.
type ZhipuQuotaLimitResponse struct {
	Level  string `json:"level"`
	Limits []struct {
		Type         string  `json:"type"`
		Percentage   float64 `json:"percentage"`
		NextResetTime string `json:"nextResetTime"`
	} `json:"limits"`
}

// MinimaxRemainsResponse is the response from MiniMax coding plan remains API.
type MinimaxRemainsResponse struct {
	ModelRemains []struct {
		CurrentIntervalTotal int64 `json:"current_interval_total"`
		CurrentIntervalUsage int64 `json:"current_interval_usage"`
		CurrentWeeklyTotal   int64 `json:"current_weekly_total"`
		CurrentWeeklyUsage   int64 `json:"current_weekly_usage"`
		EndTime              int64 `json:"end_time"` // Unix milliseconds
	} `json:"model_remains"`
}

// StepFunBalanceResponse is the response from StepFun accounts API.
type StepFunBalanceResponse struct {
	Balance float64 `json:"balance"`
}

// ---------------------------------------------------------------------------
// Provider quota query functions
// Each returns a *model.ChannelQuota. On error the QueryError field is set.
// ---------------------------------------------------------------------------

// queryZhipuQuota queries Zhipu GLM coding plan quota API.
func queryZhipuQuota(ch *model.Channel) *model.ChannelQuota {
	quota := &model.ChannelQuota{
		ChannelID:   ch.Id,
		ChannelName: ch.Name,
		ChannelType: ch.Type,
		LastUpdated: time.Now().UnixMilli(),
	}

	url := "https://api.z.ai/api/monitor/usage/quota/limit"
	headers := makeQuotaHeaders(ch.Key, false) // no Bearer prefix for Zhipu

	body, err := getQuotaResponseBody(url, headers)
	if err != nil {
		quota.QueryError = fmt.Sprintf("zhipu quota query failed: %s", err.Error())
		return quota
	}

	var resp ZhipuQuotaLimitResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		quota.QueryError = fmt.Sprintf("zhipu quota parse failed: %s", err.Error())
		return quota
	}

	quota.AccountLevel = resp.Level

	for _, limit := range resp.Limits {
		resetTime, _ := time.Parse(time.RFC3339, limit.NextResetTime)
		resetMs := resetTime.UnixMilli()
		nowMs := time.Now().UnixMilli()
		remainingMs := resetMs - nowMs
		if remainingMs < 0 {
			remainingMs = 0
		}

		quota.Windows = append(quota.Windows, model.QuotaWindow{
			Label:       limit.Type,
			UsedPercent: limit.Percentage * 100, // API returns 0-1, convert to 0-100
			RemainingMs: remainingMs,
			ResetAt:     resetMs,
		})
	}

	return quota
}

// queryMinimaxQuota queries MiniMax coding plan remains API.
func queryMinimaxQuota(ch *model.Channel) *model.ChannelQuota {
	quota := &model.ChannelQuota{
		ChannelID:   ch.Id,
		ChannelName: ch.Name,
		ChannelType: ch.Type,
		LastUpdated: time.Now().UnixMilli(),
	}

	url := "https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains"
	headers := makeQuotaHeaders(ch.Key, true) // Bearer prefix for MiniMax

	body, err := getQuotaResponseBody(url, headers)
	if err != nil {
		quota.QueryError = fmt.Sprintf("minimax quota query failed: %s", err.Error())
		return quota
	}

	var resp MinimaxRemainsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		quota.QueryError = fmt.Sprintf("minimax quota parse failed: %s", err.Error())
		return quota
	}

	nowMs := time.Now().UnixMilli()

	for _, remain := range resp.ModelRemains {
		remainingMs := remain.EndTime - nowMs
		if remainingMs < 0 {
			remainingMs = 0
		}

		// Interval window (5h)
		if remain.CurrentIntervalTotal > 0 {
			usedPercent := float64(remain.CurrentIntervalUsage) / float64(remain.CurrentIntervalTotal) * 100
			quota.Windows = append(quota.Windows, model.QuotaWindow{
				Label:       "5h",
				UsedPercent: usedPercent,
				RemainingMs: remainingMs,
				ResetAt:     remain.EndTime,
			})
		}

		// Weekly window
		if remain.CurrentWeeklyTotal > 0 {
			weeklyPercent := float64(remain.CurrentWeeklyUsage) / float64(remain.CurrentWeeklyTotal) * 100
			quota.Windows = append(quota.Windows, model.QuotaWindow{
				Label:       "weekly",
				UsedPercent: weeklyPercent,
				RemainingMs: remainingMs,
				ResetAt:     remain.EndTime,
			})
		}
	}

	return quota
}

// queryDeepSeekQuota queries DeepSeek balance API.
func queryDeepSeekQuota(ch *model.Channel) *model.ChannelQuota {
	quota := &model.ChannelQuota{
		ChannelID:   ch.Id,
		ChannelName: ch.Name,
		ChannelType: ch.Type,
		LastUpdated: time.Now().UnixMilli(),
	}

	balance, err := updateChannelDeepSeekBalance(ch)
	if err != nil {
		quota.QueryError = fmt.Sprintf("deepseek quota query failed: %s", err.Error())
		return quota
	}

	quota.Balance = &balance
	quota.BalanceUnit = "CNY"
	return quota
}

// querySiliconFlowQuota queries SiliconFlow user info API.
func querySiliconFlowQuota(ch *model.Channel) *model.ChannelQuota {
	quota := &model.ChannelQuota{
		ChannelID:   ch.Id,
		ChannelName: ch.Name,
		ChannelType: ch.Type,
		LastUpdated: time.Now().UnixMilli(),
	}

	balance, err := updateChannelSiliconFlowBalance(ch)
	if err != nil {
		quota.QueryError = fmt.Sprintf("siliconflow quota query failed: %s", err.Error())
		return quota
	}

	quota.Balance = &balance
	quota.BalanceUnit = "CNY"
	return quota
}

// queryOpenRouterQuota queries OpenRouter credits API.
func queryOpenRouterQuota(ch *model.Channel) *model.ChannelQuota {
	quota := &model.ChannelQuota{
		ChannelID:   ch.Id,
		ChannelName: ch.Name,
		ChannelType: ch.Type,
		LastUpdated: time.Now().UnixMilli(),
	}

	balance, err := updateChannelOpenRouterBalance(ch)
	if err != nil {
		quota.QueryError = fmt.Sprintf("openrouter quota query failed: %s", err.Error())
		return quota
	}

	quota.Balance = &balance
	quota.BalanceUnit = "USD"
	return quota
}

// queryStepFunQuota queries StepFun accounts API.
func queryStepFunQuota(ch *model.Channel) *model.ChannelQuota {
	quota := &model.ChannelQuota{
		ChannelID:   ch.Id,
		ChannelName: ch.Name,
		ChannelType: ch.Type,
		LastUpdated: time.Now().UnixMilli(),
	}

	url := "https://api.stepfun.com/v1/accounts"
	headers := makeQuotaHeaders(ch.Key, true)

	body, err := getQuotaResponseBody(url, headers)
	if err != nil {
		quota.QueryError = fmt.Sprintf("stepfun quota query failed: %s", err.Error())
		return quota
	}

	var resp StepFunBalanceResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		quota.QueryError = fmt.Sprintf("stepfun quota parse failed: %s", err.Error())
		return quota
	}

	balance := resp.Balance
	quota.Balance = &balance
	quota.BalanceUnit = "CNY"
	return quota
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

// makeQuotaHeaders creates HTTP headers for quota API requests.
func makeQuotaHeaders(key string, bearer bool) http.Header {
	h := http.Header{}
	if bearer {
		h.Add("Authorization", fmt.Sprintf("Bearer %s", key))
	} else {
		h.Add("Authorization", key)
	}
	return h
}

// getQuotaResponseBody performs an HTTP GET and returns the response body.
func getQuotaResponseBody(url string, headers http.Header) ([]byte, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	for k := range headers {
		req.Header.Add(k, headers.Get(k))
	}
	res, err := client.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status code: %d", res.StatusCode)
	}
	return io.ReadAll(res.Body)
}

// queryProviderQuota dispatches to the correct provider adapter based on channel type.
func queryProviderQuota(ch *model.Channel) *model.ChannelQuota {
	// Ensure base URL is set
	if ch.GetBaseURL() == "" {
		baseURL := channeltype.ChannelBaseURLs[ch.Type]
		ch.BaseURL = &baseURL
	}

	switch ch.Type {
	case channeltype.Zhipu:
		return queryZhipuQuota(ch)
	case channeltype.Minimax:
		return queryMinimaxQuota(ch)
	case channeltype.DeepSeek:
		return queryDeepSeekQuota(ch)
	case channeltype.SiliconFlow:
		return querySiliconFlowQuota(ch)
	case channeltype.OpenRouter:
		return queryOpenRouterQuota(ch)
	case channeltype.StepFun:
		return queryStepFunQuota(ch)
	default:
		return &model.ChannelQuota{
			ChannelID:   ch.Id,
			ChannelName: ch.Name,
			ChannelType: ch.Type,
			LastUpdated: time.Now().UnixMilli(),
			QueryError:  "quota query not supported for this channel type",
		}
	}
}

// cacheQuota stores quota data in Redis with a 30-minute TTL.
func cacheQuota(quota *model.ChannelQuota) {
	if !common.RedisEnabled || common.RDB == nil {
		return
	}
	data, err := json.Marshal(quota)
	if err != nil {
		logger.SysLog(fmt.Sprintf("failed to marshal quota for channel %d: %s", quota.ChannelID, err.Error()))
		return
	}
	key := model.QuotaRedisKey(quota.ChannelID)
	if err := common.RedisSet(key, string(data), time.Duration(model.QuotaCacheTTL)*time.Second); err != nil {
		logger.SysLog(fmt.Sprintf("failed to cache quota for channel %d: %s", quota.ChannelID, err.Error()))
	}
}

// getCachedQuota retrieves quota data from Redis.
func getCachedQuota(channelId int) (*model.ChannelQuota, error) {
	if !common.RedisEnabled || common.RDB == nil {
		return nil, fmt.Errorf("redis not enabled")
	}
	key := model.QuotaRedisKey(channelId)
	data, err := common.RedisGet(key)
	if err != nil {
		return nil, err
	}
	var quota model.ChannelQuota
	if err := json.Unmarshal([]byte(data), &quota); err != nil {
		return nil, fmt.Errorf("failed to unmarshal quota data: %w", err)
	}
	return &quota, nil
}

// ---------------------------------------------------------------------------
// API Handlers
// ---------------------------------------------------------------------------

// GetChannelQuota handles GET /api/channel/:id/quota
// Returns quota for a single channel, from cache if available.
func GetChannelQuota(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid channel id",
		})
		return
	}

	// Try cache first
	quota, err := getCachedQuota(id)
	if err == nil && quota != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
			"data":    quota,
		})
		return
	}

	// Cache miss: query provider directly
	channel, err := model.GetChannelById(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "channel not found: " + err.Error(),
		})
		return
	}

	quota = queryProviderQuota(channel)

	// Cache the result (even errors, so we don't hammer the provider)
	cacheQuota(quota)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    quota,
	})
}

// GetAllChannelQuotas handles GET /api/channel/quota
// Returns all channel quotas from cache only (no live queries).
func GetAllChannelQuotas(c *gin.Context) {
	channels, err := model.GetAllChannels(0, 0, "all")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get channels: " + err.Error(),
		})
		return
	}

	quotas := make([]*model.ChannelQuota, 0)
	for _, ch := range channels {
		if ch.Status != model.ChannelStatusEnabled {
			continue
		}
		quota, err := getCachedQuota(ch.Id)
		if err != nil {
			// Skip channels without cached quota data
			continue
		}
		quotas = append(quotas, quota)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    quotas,
	})
}

// RefreshChannelQuota handles POST /api/channel/:id/quota/refresh
// Forces a fresh query to the provider and updates the cache.
func RefreshChannelQuota(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid channel id",
		})
		return
	}

	channel, err := model.GetChannelById(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "channel not found: " + err.Error(),
		})
		return
	}

	quota := queryProviderQuota(channel)
	cacheQuota(quota)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    quota,
	})
}

// GetChannelQuotasMap handles GET /api/channel/quotas_map
// Returns a map of channelId -> QuotaSummary for the model marketplace.
func GetChannelQuotasMap(c *gin.Context) {
	channels, err := model.GetAllChannels(0, 0, "all")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get channels: " + err.Error(),
		})
		return
	}

	result := make(map[int]*model.QuotaSummary)
	for _, ch := range channels {
		if ch.Status != model.ChannelStatusEnabled {
			continue
		}
		quota, err := getCachedQuota(ch.Id)
		if err != nil {
			continue
		}
		summary := &model.QuotaSummary{
			AccountLevel: quota.AccountLevel,
			Balance:      quota.Balance,
			BalanceUnit:  quota.BalanceUnit,
			Windows:      quota.Windows,
			LastUpdated:  quota.LastUpdated,
		}
		result[ch.Id] = summary
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    result,
	})
}

// RefreshAllChannelQuotasHandler handles POST /api/channel/quota/refresh
// Triggers an immediate refresh of all enabled channel quotas.
func RefreshAllChannelQuotasHandler(c *gin.Context) {
	refreshed := monitor.RefreshAllChannelQuotas()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("refreshed %d channels", refreshed),
		"data": gin.H{
			"refreshed_count": refreshed,
		},
	})
}
