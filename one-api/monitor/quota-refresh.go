package monitor

import (
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
)

// ────────────────────────────────────────────────────────────
// Constants & Configuration
// ────────────────────────────────────────────────────────────

const (
	// Default refresh interval: 10 minutes.
	defaultQuotaRefreshInterval = 10
	// Max concurrent quota queries to avoid provider rate limits.
	defaultQuotaRefreshConcurrency = 5
	// Sleep between individual quota queries (seconds).
	defaultQuotaQuerySleepMin = 1
	defaultQuotaQuerySleepMax = 2
	// Low quota alert threshold (percentage).
	defaultLowQuotaThreshold = 90.0
)

var (
	quotaRefresherRunning bool
	quotaRefresherMu      sync.Mutex
)

// getQuotaRefreshInterval reads the refresh interval from env, defaulting to 30 minutes.
func getQuotaRefreshInterval() time.Duration {
	interval := defaultQuotaRefreshInterval
	if envInterval := os.Getenv("QUOTA_REFRESH_INTERVAL"); envInterval != "" {
		if parsed, err := strconv.Atoi(envInterval); err == nil && parsed > 0 {
			interval = parsed
		}
	}
	return time.Duration(interval) * time.Minute
}

// getQuotaRefreshConcurrency reads max concurrent queries from env.
func getQuotaRefreshConcurrency() int {
	concurrency := defaultQuotaRefreshConcurrency
	if envConc := os.Getenv("QUOTA_REFRESH_CONCURRENCY"); envConc != "" {
		if parsed, err := strconv.Atoi(envConc); err == nil && parsed > 0 {
			concurrency = parsed
		}
	}
	return concurrency
}

// getLowQuotaThreshold reads the alert threshold from env.
func getLowQuotaThreshold() float64 {
	threshold := defaultLowQuotaThreshold
	if envThresh := os.Getenv("QUOTA_LOW_THRESHOLD"); envThresh != "" {
		if parsed, err := strconv.ParseFloat(envThresh, 64); err == nil && parsed > 0 && parsed <= 100 {
			threshold = parsed
		}
	}
	return threshold
}

// ────────────────────────────────────────────────────────────
// Public API: Start & Trigger
// ────────────────────────────────────────────────────────────

// StartQuotaRefresher starts the periodic quota refresh goroutine.
// It queries all enabled channels' provider quotas on a configurable interval.
func StartQuotaRefresher() {
	quotaRefresherMu.Lock()
	if quotaRefresherRunning {
		quotaRefresherMu.Unlock()
		return
	}
	quotaRefresherRunning = true
	quotaRefresherMu.Unlock()

	if !common.RedisEnabled {
		logger.SysLog("quota-refresher: Redis not enabled, quota refresh disabled")
		return
	}

	interval := getQuotaRefreshInterval()
	logger.SysLog(fmt.Sprintf("quota-refresher: starting with interval %s", interval))

	go func() {
		// Initial delay to let the system settle
		time.Sleep(15 * time.Second)

		// Run first refresh immediately
		runQuotaRefresh()

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			runQuotaRefresh()
		}
	}()
}

// RefreshAllChannelQuotas triggers an immediate quota refresh for all enabled channels.
// This is called by the manual refresh API endpoint.
func RefreshAllChannelQuotas() int {
	channels := getEnabledChannels()
	if len(channels) == 0 {
		return 0
	}

	refreshed := refreshChannelQuotas(channels)

	// Update last refresh timestamp
	updateLastRefreshTime()

	return refreshed
}

// GetLastQuotaRefreshTime returns the timestamp of the last full refresh.
func GetLastQuotaRefreshTime() (int64, error) {
	if !common.RedisEnabled {
		return 0, fmt.Errorf("redis not enabled")
	}
	data, err := common.RedisGet(model.QuotaLastRefreshKey())
	if err != nil {
		return 0, err
	}
	ts, err := strconv.ParseInt(data, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid timestamp: %w", err)
	}
	return ts, nil
}

// ────────────────────────────────────────────────────────────
// Core refresh logic
// ────────────────────────────────────────────────────────────

// runQuotaRefresh performs a full refresh of all enabled channels.
func runQuotaRefresh() {
	channels := getEnabledChannels()
	if len(channels) == 0 {
		return
	}

	logger.SysLog(fmt.Sprintf("quota-refresher: starting refresh for %d channels", len(channels)))

	refreshed := refreshChannelQuotas(channels)

	updateLastRefreshTime()

	logger.SysLog(fmt.Sprintf("quota-refresher: completed, %d/%d channels refreshed", refreshed, len(channels)))
}

// getEnabledChannels queries the database for all enabled channels.
func getEnabledChannels() []*model.Channel {
	var channels []*model.Channel
	if err := model.DB.Where("status = ?", model.ChannelStatusEnabled).Find(&channels).Error; err != nil {
		logger.SysError(fmt.Sprintf("quota-refresher: failed to query channels: %s", err.Error()))
		return nil
	}
	return channels
}

// refreshChannelQuotas refreshes quotas for the given channels with concurrency control.
// Returns the number of successfully refreshed channels.
func refreshChannelQuotas(channels []*model.Channel) int {
	maxConcurrent := getQuotaRefreshConcurrency()
	threshold := getLowQuotaThreshold()

	// Use a semaphore pattern for concurrency control
	sem := make(chan struct{}, maxConcurrent)
	var wg sync.WaitGroup
	var mu sync.Mutex
	refreshed := 0

	for i, ch := range channels {
		// Sleep between queries to avoid rate limits
		if i > 0 {
			sleepBetweenQueries()
		}

		wg.Add(1)
		sem <- struct{}{} // acquire semaphore

		go func(channel *model.Channel) {
			defer wg.Done()
			defer func() { <-sem }() // release semaphore

			quota := queryAndCacheQuota(channel)
			if quota != nil && quota.QueryError == "" {
				mu.Lock()
				refreshed++
				mu.Unlock()

				// Check for low quota alerts
				checkLowQuotaAlert(channel, quota, threshold)
			}
		}(ch)
	}

	wg.Wait()
	return refreshed
}

// queryAndCacheQuota queries a single channel's quota and caches the result.
// This function is defined here to avoid import cycles with the controller package,
// so we inline the provider dispatch logic.
func queryAndCacheQuota(channel *model.Channel) *model.ChannelQuota {
	// We need to call the controller-level queryProviderQuota.
	// To avoid circular imports, we expose it via a package-level function variable.
	if quotaQueryFn != nil {
		quota := quotaQueryFn(channel)
		cacheQuotaData(quota)
		return quota
	}

	// Fallback: if the function is not registered, skip
	logger.SysError(fmt.Sprintf("quota-refresher: quota query function not registered for channel #%d", channel.Id))
	return nil
}

// cacheQuotaData stores quota data in Redis via the registered cache function.
func cacheQuotaData(quota *model.ChannelQuota) {
	if cacheQuotaFn != nil {
		cacheQuotaFn(quota)
	}
}

// updateLastRefreshTime sets the last_refresh timestamp in Redis.
func updateLastRefreshTime() {
	if !common.RedisEnabled || common.RDB == nil {
		return
	}
	ts := fmt.Sprintf("%d", time.Now().UnixMilli())
	if err := common.RedisSet(model.QuotaLastRefreshKey(), ts, 0); err != nil {
		logger.SysError(fmt.Sprintf("quota-refresher: failed to update last refresh time: %s", err.Error()))
	}
}

// sleepBetweenQueries sleeps for 1-2 seconds between queries to avoid rate limits.
func sleepBetweenQueries() {
	// Simple 1.5s sleep (could add jitter if needed)
	time.Sleep(1500 * time.Millisecond)
}

// ────────────────────────────────────────────────────────────
// Low Quota Alert
// ────────────────────────────────────────────────────────────

// checkLowQuotaAlert checks if any quota window exceeds the threshold and
// marks the channel as degraded if so.
func checkLowQuotaAlert(channel *model.Channel, quota *model.ChannelQuota, threshold float64) {
	for _, w := range quota.Windows {
		if w.UsedPercent >= threshold {
			reason := fmt.Sprintf("配额使用率 %.1f%% 超过阈值 %.0f%% (窗口: %s)", w.UsedPercent, threshold, w.Label)
			logger.SysLog(fmt.Sprintf("quota-refresher: WARNING channel #%d (%s) quota low: %s",
				channel.Id, channel.Name, reason))
			MarkChannelDegraded(channel.Id, reason)
			return // Only mark once per channel
		}
	}
}

// ────────────────────────────────────────────────────────────
// Function variables for dependency injection (avoids import cycles)
// ────────────────────────────────────────────────────────────

// QuotaQueryFunc is the type for the quota query function.
type QuotaQueryFunc func(ch *model.Channel) *model.ChannelQuota

// CacheQuotaFunc is the type for the quota cache function.
type CacheQuotaFunc func(quota *model.ChannelQuota)

var (
	quotaQueryFn QuotaQueryFunc
	cacheQuotaFn CacheQuotaFunc
)

// RegisterQuotaQueryFunc registers the quota query function from the controller package.
// This must be called during initialization to wire up the dependency.
func RegisterQuotaQueryFunc(queryFn QuotaQueryFunc, cacheFn CacheQuotaFunc) {
	quotaQueryFn = queryFn
	cacheQuotaFn = cacheFn
}
