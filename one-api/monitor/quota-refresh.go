package monitor

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
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
	// Quota exhaustion threshold (percentage): above this, channel is disabled.
	defaultQuotaExhaustionThreshold = 100.0
	// Quota recovery threshold (percentage): below this, channel can recover.
	defaultQuotaRecoveryThreshold = 95.0
	// Exhaustion poll interval: how often to re-query exhausted channels.
	defaultExhaustionPollInterval = 60
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

// getQuotaExhaustionThreshold reads the exhaustion threshold from env.
// Channels with any window UsedPercent >= this value are marked as exhausted.
func getQuotaExhaustionThreshold() float64 {
	threshold := defaultQuotaExhaustionThreshold
	if envThresh := os.Getenv("QUOTA_EXHAUSTION_THRESHOLD"); envThresh != "" {
		if parsed, err := strconv.ParseFloat(envThresh, 64); err == nil && parsed > 0 && parsed <= 100 {
			threshold = parsed
		}
	}
	return threshold
}

// getQuotaRecoveryThreshold reads the recovery threshold from env.
// Exhausted channels recover when ALL windows have UsedPercent < this value.
func getQuotaRecoveryThreshold() float64 {
	threshold := defaultQuotaRecoveryThreshold
	if envThresh := os.Getenv("QUOTA_RECOVERY_THRESHOLD"); envThresh != "" {
		if parsed, err := strconv.ParseFloat(envThresh, 64); err == nil && parsed > 0 && parsed <= 100 {
			threshold = parsed
		}
	}
	return threshold
}

// getExhaustionPollInterval reads the accelerated poll interval from env (in seconds).
func getExhaustionPollInterval() time.Duration {
	interval := defaultExhaustionPollInterval
	if envInterval := os.Getenv("QUOTA_EXHAUSTION_POLL_INTERVAL"); envInterval != "" {
		if parsed, err := strconv.Atoi(envInterval); err == nil && parsed > 0 {
			interval = parsed
		}
	}
	return time.Duration(interval) * time.Second
}

// ────────────────────────────────────────────────────────────
// Exhausted Channel Tracking (thread-safe)
// ────────────────────────────────────────────────────────────

var (
	// exhaustedChannels tracks channel IDs that are quota-exhausted and need accelerated polling.
	// Protected by exhaustedMu for concurrent access from refresh goroutine and poller goroutine.
	exhaustedChannels       = make(map[int]exhaustionInfo)
	exhaustedMu             sync.RWMutex
	exhaustionPollerRunning bool
	exhaustionPollerMu      sync.Mutex
)

// exhaustionInfo holds metadata about an exhausted channel for the accelerated poller.
type exhaustionInfo struct {
	AddedAt   time.Time // when the channel was first detected as exhausted
	Reason    string    // why it was marked exhausted
	LastCheck time.Time // last time the poller checked this channel
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
	exhaustionThreshold := getQuotaExhaustionThreshold()

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

				// Check for quota exhaustion (highest priority: marks unhealthy)
				checkQuotaExhaustion(channel, quota, exhaustionThreshold)
				// Check for low quota alerts (only if not already exhausted)
				if !IsQuotaExhausted(channel.Id) {
					checkLowQuotaAlert(channel, quota, threshold)
				}
				// Check model downgrade rules (per provider type)
				checkDowngradeRules(channel, quota)
			}
		}(ch)
	}

	wg.Wait()

	// After all channels are refreshed, check for providers that recovered
	// and should have their downgrade markers removed
	cleanupDowngradeMarkers(channels)

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
// Quota Exhaustion Detection
// ────────────────────────────────────────────────────────────

// checkQuotaExhaustion checks if any quota window has reached the exhaustion threshold.
// If exhausted, marks the channel as unhealthy and adds it to the accelerated polling list.
// If already exhausted but now recovered, marks it as healthy and removes from the list.
func checkQuotaExhaustion(channel *model.Channel, quota *model.ChannelQuota, threshold float64) {
	recoveryThreshold := getQuotaRecoveryThreshold()

	// Check if any window is exhausted
	isExhausted := false
	var exhaustedWindows []string
	for _, w := range quota.Windows {
		if w.UsedPercent >= threshold {
			isExhausted = true
			exhaustedWindows = append(exhaustedWindows, fmt.Sprintf("%s=%.1f%%", w.Label, w.UsedPercent))
		}
	}

	if isExhausted {
		reason := fmt.Sprintf("windows: %s", strings.Join(exhaustedWindows, ", "))

		// Calculate TTL from the nearest ResetAt across exhausted windows
		var nearestReset int64
		for _, w := range quota.Windows {
			if w.UsedPercent >= threshold && w.ResetAt > 0 {
				if nearestReset == 0 || w.ResetAt < nearestReset {
					nearestReset = w.ResetAt
				}
			}
		}
		ttl := time.Duration(0)
		if nearestReset > 0 {
			ttl = time.Until(time.UnixMilli(nearestReset))
			if ttl < time.Minute {
				ttl = time.Minute // minimum 1 minute TTL
			}
		}

		MarkChannelQuotaExhausted(channel.Id, reason, ttl)

		// Add to accelerated polling list
		exhaustedMu.Lock()
		exhaustedChannels[channel.Id] = exhaustionInfo{
			AddedAt:   time.Now(),
			Reason:    reason,
			LastCheck: time.Now(),
		}
		exhaustedMu.Unlock()

		logger.SysLog(fmt.Sprintf("quota-refresher: channel #%d (%s) QUOTA EXHAUSTED — added to accelerated poll list (%s)",
			channel.Id, channel.Name, reason))
	} else {
		// Check if previously exhausted and now recovered
		exhaustedMu.RLock()
		_, wasExhausted := exhaustedChannels[channel.Id]
		exhaustedMu.RUnlock()

		if wasExhausted {
			// Verify ALL windows are below recovery threshold before recovering
			allBelowRecovery := true
			for _, w := range quota.Windows {
				if w.UsedPercent >= recoveryThreshold {
					allBelowRecovery = false
					break
				}
			}

			if allBelowRecovery {
				MarkChannelQuotaRecovered(channel.Id)
				exhaustedMu.Lock()
				delete(exhaustedChannels, channel.Id)
				exhaustedMu.Unlock()
				logger.SysLog(fmt.Sprintf("quota-refresher: channel #%d (%s) QUOTA RECOVERED — removed from accelerated poll list",
					channel.Id, channel.Name))
			}
		}
	}
}

// ────────────────────────────────────────────────────────────
// Accelerated Exhaustion Poller
// ────────────────────────────────────────────────────────────

// StartExhaustionPoller starts a goroutine that polls exhausted channels
// at a higher frequency (default 1 minute) to detect quota recovery quickly.
func StartExhaustionPoller() {
	exhaustionPollerMu.Lock()
	if exhaustionPollerRunning {
		exhaustionPollerMu.Unlock()
		return
	}
	exhaustionPollerRunning = true
	exhaustionPollerMu.Unlock()

	if !common.RedisEnabled {
		logger.SysLog("exhaustion-poller: Redis not enabled, exhaustion poller disabled")
		return
	}

	interval := getExhaustionPollInterval()
	logger.SysLog(fmt.Sprintf("exhaustion-poller: starting with interval %s", interval))

	go func() {
		// Wait a bit for the system to settle before first poll
		time.Sleep(30 * time.Second)

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			runExhaustionPoll()
		}
	}()
}

// runExhaustionPoll checks all channels in the exhausted list for recovery.
// It queries only the exhausted channels (not all channels) to minimize API calls.
func runExhaustionPoll() {
	exhaustedMu.RLock()
	if len(exhaustedChannels) == 0 {
		exhaustedMu.RUnlock()
		return
	}

	// Copy channel IDs to avoid holding lock during queries
	channelIds := make([]int, 0, len(exhaustedChannels))
	for id := range exhaustedChannels {
		channelIds = append(channelIds, id)
	}
	exhaustedMu.RUnlock()

	logger.SysLog(fmt.Sprintf("exhaustion-poller: checking %d exhausted channels", len(channelIds)))

	recoveryThreshold := getQuotaRecoveryThreshold()
	recovered := 0

	for _, channelId := range channelIds {
		// Look up the channel from DB
		channel, err := model.GetChannelById(channelId, true)
		if err != nil {
			// Channel may have been deleted, remove from list
			exhaustedMu.Lock()
			delete(exhaustedChannels, channelId)
			exhaustedMu.Unlock()
			logger.SysLog(fmt.Sprintf("exhaustion-poller: channel #%d not found, removed from list", channelId))
			continue
		}

		// Query current quota for this channel
		quota := queryAndCacheQuota(channel)
		if quota == nil || quota.QueryError != "" {
			// Query failed, skip this channel for now
			logger.SysError(fmt.Sprintf("exhaustion-poller: failed to query quota for channel #%d: %s",
				channelId, func() string {
					if quota != nil {
						return quota.QueryError
					}
					return "nil quota"
				}()))
			continue
		}

		// Check if all windows are below recovery threshold
		allBelowRecovery := true
		stillExhausted := false
		for _, w := range quota.Windows {
			if w.UsedPercent >= getQuotaExhaustionThreshold() {
				stillExhausted = true
				break
			}
			if w.UsedPercent >= recoveryThreshold {
				allBelowRecovery = false
			}
		}

		if !stillExhausted && allBelowRecovery {
			// Quota recovered!
			MarkChannelQuotaRecovered(channelId)
			exhaustedMu.Lock()
			delete(exhaustedChannels, channelId)
			exhaustedMu.Unlock()
			recovered++
			logger.SysLog(fmt.Sprintf("exhaustion-poller: channel #%d (%s) QUOTA RECOVERED via accelerated poll",
				channelId, channel.Name))
		} else {
			// Update last check time
			exhaustedMu.Lock()
			if info, ok := exhaustedChannels[channelId]; ok {
				info.LastCheck = time.Now()
				exhaustedChannels[channelId] = info
			}
			exhaustedMu.Unlock()
		}

		// Sleep between queries to avoid rate limits
		sleepBetweenQueries()
	}

	if recovered > 0 {
		logger.SysLog(fmt.Sprintf("exhaustion-poller: recovered %d/%d channels", recovered, len(channelIds)))
	}
}

// GetExhaustedChannels returns a snapshot of currently exhausted channel IDs.
// Used for monitoring and debugging.
func GetExhaustedChannels() []int {
	exhaustedMu.RLock()
	defer exhaustedMu.RUnlock()
	ids := make([]int, 0, len(exhaustedChannels))
	for id := range exhaustedChannels {
		ids = append(ids, id)
	}
	return ids
}

// ────────────────────────────────────────────────────────────
// Model Downgrade Engine
// ────────────────────────────────────────────────────────────

// checkDowngradeRules checks if any enabled downgrade rule is triggered
// for the channel's provider type, based on current quota usage.
func checkDowngradeRules(channel *model.Channel, quota *model.ChannelQuota) {
	rule, err := model.GetDowngradeRuleByProvider(channel.Type)
	if err != nil {
		// No rule for this provider, skip
		return
	}

	// Check if any quota window exceeds the rule threshold
	threshold := float64(rule.ThresholdPct)
	triggered := false
	for _, w := range quota.Windows {
		if w.UsedPercent >= threshold {
			triggered = true
			break
		}
	}

	if triggered {
		// Set downgrade marker in Redis
		model.SetDowngradeMarker(channel.Type, rule.TargetModel)
		logger.SysLog(fmt.Sprintf("downgrade: provider %d (channel #%d) quota %.1f%% >= threshold %d%%, downgrading to model %s",
			channel.Type, channel.Id, quota.Windows[0].UsedPercent, rule.ThresholdPct, rule.TargetModel))
	}
}

// downgradeRuleCache caches downgrade rules in memory to avoid DB queries on every request.
var (
	downgradeRulesCache     []model.ModelDowngradeRule
	downgradeRulesCacheTime time.Time
	downgradeRulesCacheMu   sync.RWMutex
	downgradeRulesCacheTTL  = 5 * time.Minute
)

// getCachedDowngradeRules returns cached downgrade rules, refreshing if stale.
func getCachedDowngradeRules() []model.ModelDowngradeRule {
	downgradeRulesCacheMu.RLock()
	if time.Since(downgradeRulesCacheTime) < downgradeRulesCacheTTL && downgradeRulesCache != nil {
		rules := downgradeRulesCache
		downgradeRulesCacheMu.RUnlock()
		return rules
	}
	downgradeRulesCacheMu.RUnlock()

	// Refresh cache
	rules, err := model.GetEnabledDowngradeRules()
	if err != nil {
		logger.SysError(fmt.Sprintf("downgrade: failed to load rules: %s", err.Error()))
		return nil
	}

	downgradeRulesCacheMu.Lock()
	downgradeRulesCache = rules
	downgradeRulesCacheTime = time.Now()
	downgradeRulesCacheMu.Unlock()

	return rules
}

// cleanupDowngradeMarkers checks all enabled downgrade rules and removes
// markers for providers whose quota has recovered below the threshold.
func cleanupDowngradeMarkers(channels []*model.Channel) {
	rules := getCachedDowngradeRules()
	if len(rules) == 0 {
		return
	}

	// Group channels by provider type and find max used percent per type
	type providerQuotaInfo struct {
		maxUsedPercent float64
		hasChannel     bool
	}
	providerMap := make(map[int]*providerQuotaInfo)
	for _, ch := range channels {
		if _, ok := providerMap[ch.Type]; !ok {
			providerMap[ch.Type] = &providerQuotaInfo{}
		}
		providerMap[ch.Type].hasChannel = true
	}

	// Read quota data from Redis for each channel to get current usage
	for _, ch := range channels {
		quotaData, err := common.RedisGet(model.QuotaRedisKey(ch.Id))
		if err != nil || quotaData == "" {
			continue
		}
		var quota model.ChannelQuota
		if err := json.Unmarshal([]byte(quotaData), &quota); err != nil {
			continue
		}
		info, ok := providerMap[ch.Type]
		if !ok {
			continue
		}
		for _, w := range quota.Windows {
			if w.UsedPercent > info.maxUsedPercent {
				info.maxUsedPercent = w.UsedPercent
			}
		}
	}

	// Check each rule: if provider's max usage is below threshold, remove marker
	for _, rule := range rules {
		info, ok := providerMap[rule.ProviderType]
		if !ok || !info.hasChannel {
			continue
		}

		threshold := float64(rule.ThresholdPct)
		if info.maxUsedPercent < threshold {
			// Check if there's currently a marker
			currentTarget := model.CheckAndApplyDowngrade(rule.ProviderType)
			if currentTarget != "" {
				model.RemoveDowngradeMarker(rule.ProviderType)
				logger.SysLog(fmt.Sprintf("downgrade: provider %d quota recovered (%.1f%% < %d%%), removed downgrade marker",
					rule.ProviderType, info.maxUsedPercent, rule.ThresholdPct))
			}
		}
	}
}

// CheckDowngradeForProvider checks if a provider type has an active downgrade.
// This is called from the distributor to decide if model replacement is needed.
// Returns the target model name if downgrading, empty string otherwise.
func CheckDowngradeForProvider(providerType int) string {
	return model.CheckAndApplyDowngrade(providerType)
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
