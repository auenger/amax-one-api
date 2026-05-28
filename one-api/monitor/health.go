package monitor

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
)

// HealthStatus represents the health state of a channel.
type HealthStatus string

const (
	HealthStatusHealthy   HealthStatus = "healthy"
	HealthStatusDegraded  HealthStatus = "degraded"
	HealthStatusUnhealthy HealthStatus = "unhealthy"
)

// ChannelHealth stores the health state of a single channel in Redis.
type ChannelHealth struct {
	Status              HealthStatus `json:"status"`
	LatencyMs           int          `json:"latency_ms"`
	ErrorRate           float64      `json:"error_rate"`
	LastCheck           string       `json:"last_check"`
	ConsecutiveFailures int          `json:"consecutive_failures"`
	ConsecutiveSuccess  int          `json:"consecutive_success"`
	TotalChecks         int          `json:"total_checks"`
	TotalFailures       int          `json:"total_failures"`
	Reason              string       `json:"reason,omitempty"` // reason for current status (e.g. "quota exhausted")
}

const (
	// Redis key prefix for channel health data.
	channelHealthKeyPrefix = "channel:health:"
	// Default health check interval in seconds.
	defaultHealthCheckInterval = 30
	// Unhealthy threshold: consecutive failures to mark unhealthy.
	unhealthyConsecutiveFailures = 3
	// Unhealthy threshold: error rate to mark unhealthy.
	unhealthyErrorRate = 0.5
	// Degraded threshold: error rate to mark degraded.
	degradedErrorRate = 0.1
	// Recovery: consecutive successes to recover from unhealthy to degraded.
	unhealthyRecoverySuccesses = 2
	// Recovery: consecutive successes to recover from degraded to healthy.
	degradedRecoverySuccesses = 3
	// Health data TTL in Redis (keep data for 5 minutes even without checks).
	healthDataTTL = 300
	// Sliding window size for error rate calculation.
	errorRateWindowSize = 20
)

// channelHealthKey returns the Redis key for a channel's health data.
func channelHealthKey(channelId int) string {
	return fmt.Sprintf("%s%d", channelHealthKeyPrefix, channelId)
}

// GetChannelHealth retrieves the health data for a channel from Redis.
func GetChannelHealth(channelId int) (*ChannelHealth, error) {
	if !common.RedisEnabled {
		return nil, fmt.Errorf("redis not enabled")
	}
	data, err := common.RedisGet(channelHealthKey(channelId))
	if err != nil {
		return nil, err
	}
	var health ChannelHealth
	if err := json.Unmarshal([]byte(data), &health); err != nil {
		return nil, fmt.Errorf("failed to unmarshal health data: %w", err)
	}
	return &health, nil
}

// SetChannelHealth stores the health data for a channel in Redis.
func SetChannelHealth(channelId int, health *ChannelHealth) error {
	if !common.RedisEnabled {
		return fmt.Errorf("redis not enabled")
	}
	data, err := json.Marshal(health)
	if err != nil {
		return fmt.Errorf("failed to marshal health data: %w", err)
	}
	return common.RedisSet(channelHealthKey(channelId), string(data), time.Duration(healthDataTTL)*time.Second)
}

// IsChannelHealthy checks if a channel is healthy enough to serve requests.
// Returns (isAvailable, status).
func IsChannelHealthy(channelId int) (bool, HealthStatus) {
	health, err := GetChannelHealth(channelId)
	if err != nil {
		// No health data means no checks have been done yet; assume healthy
		return true, HealthStatusHealthy
	}
	return health.Status != HealthStatusUnhealthy, health.Status
}

// GetChannelHealthStatus returns the health status of a channel.
// Returns Healthy if no health data is available.
func GetChannelHealthStatus(channelId int) HealthStatus {
	health, err := GetChannelHealth(channelId)
	if err != nil {
		return HealthStatusHealthy
	}
	return health.Status
}

// EvaluateHealth determines the new health status based on current metrics.
func EvaluateHealth(health *ChannelHealth) HealthStatus {
	// Check for unhealthy conditions (highest priority)
	if health.ConsecutiveFailures >= unhealthyConsecutiveFailures {
		return HealthStatusUnhealthy
	}
	if health.TotalChecks >= errorRateWindowSize && health.ErrorRate > unhealthyErrorRate {
		return HealthStatusUnhealthy
	}

	// Check for degraded conditions
	if health.TotalChecks >= errorRateWindowSize && health.ErrorRate > degradedErrorRate {
		return HealthStatusDegraded
	}
	if health.ConsecutiveFailures >= 1 && health.ConsecutiveFailures < unhealthyConsecutiveFailures {
		return HealthStatusDegraded
	}

	return HealthStatusHealthy
}

// EvaluateRecovery determines if a channel should recover to a better state.
// Channels with active quota exhaustion markers are blocked from recovery.
func EvaluateRecovery(currentStatus HealthStatus, health *ChannelHealth) HealthStatus {
	switch currentStatus {
	case HealthStatusUnhealthy:
		if health.ConsecutiveSuccess >= unhealthyRecoverySuccesses {
			return HealthStatusDegraded
		}
	case HealthStatusDegraded:
		if health.ConsecutiveSuccess >= degradedRecoverySuccesses {
			return HealthStatusHealthy
		}
	case HealthStatusHealthy:
		// Already healthy, no recovery needed
	}
	return currentStatus
}

// RecordHealthCheck records the result of a health check and updates the channel's health status.
// Returns the old and new status if a transition occurred.
func RecordHealthCheck(channelId int, success bool, latencyMs int) (oldStatus, newStatus HealthStatus, err error) {
	health, getErr := GetChannelHealth(channelId)
	if getErr != nil {
		// Initialize new health record
		health = &ChannelHealth{
			Status:    HealthStatusHealthy,
			LastCheck: time.Now().UTC().Format(time.RFC3339),
		}
	}

	oldStatus = health.Status
	health.LastCheck = time.Now().UTC().Format(time.RFC3339)
	health.LatencyMs = latencyMs
	health.TotalChecks++

	if success {
		health.ConsecutiveFailures = 0
		health.ConsecutiveSuccess++
	} else {
		health.TotalFailures++
		health.ConsecutiveFailures++
		health.ConsecutiveSuccess = 0
	}

	// Calculate error rate over sliding window
	if health.TotalChecks > 0 {
		health.ErrorRate = float64(health.TotalFailures) / float64(health.TotalChecks)
	}

	// Determine proposed status from probe metrics
	newStatus = EvaluateRecovery(oldStatus, health)
	if newStatus == oldStatus {
		newStatus = EvaluateHealth(health)
	}

	// Block ANY status upgrade away from Unhealthy/Degraded if quota is exhausted.
	// This must run after both evaluation paths to close the bypass where
	// EvaluateHealth could jump unhealthy → healthy in one step.
	if oldStatus == HealthStatusUnhealthy && newStatus != HealthStatusUnhealthy {
		if IsQuotaExhausted(channelId) {
			newStatus = oldStatus
		}
	}
	if oldStatus == HealthStatusDegraded && newStatus == HealthStatusHealthy {
		if IsQuotaExhausted(channelId) {
			newStatus = oldStatus
		}
	}

	health.Status = newStatus

	// Reset counters on recovery to healthy
	if newStatus == HealthStatusHealthy {
		health.ConsecutiveFailures = 0
		health.ConsecutiveSuccess = 0
		health.TotalChecks = 0
		health.TotalFailures = 0
		health.ErrorRate = 0
		health.Reason = ""
	}

	if err := SetChannelHealth(channelId, health); err != nil {
		return oldStatus, oldStatus, err
	}

	// Log status transitions
	if oldStatus != newStatus {
		logger.SysLog(fmt.Sprintf("health: channel #%d status changed: %s → %s", channelId, oldStatus, newStatus))
	}

	return oldStatus, newStatus, nil
}

// MarkChannelDegraded marks a channel as degraded (e.g., on 429 rate limit).
func MarkChannelDegraded(channelId int, reason string) {
	health, err := GetChannelHealth(channelId)
	if err != nil {
		health = &ChannelHealth{
			Status:    HealthStatusHealthy,
			LastCheck: time.Now().UTC().Format(time.RFC3339),
		}
	}

	if health.Status == HealthStatusHealthy {
		oldStatus := health.Status
		health.Status = HealthStatusDegraded
		health.ConsecutiveFailures++
		health.TotalChecks++
		health.TotalFailures++
		health.LastCheck = time.Now().UTC().Format(time.RFC3339)
		_ = SetChannelHealth(channelId, health)
		logger.SysLog(fmt.Sprintf("health: channel #%d marked degraded: %s (was %s)", channelId, reason, oldStatus))
	}
}

// ────────────────────────────────────────────────────────────
// Quota Exhaustion Marking
// ────────────────────────────────────────────────────────────

const (
	// Redis key prefix for quota exhaustion markers.
	quotaExhaustedKeyPrefix = "channel:quota:exhausted:"
	// Default TTL for exhaustion markers: 24 hours (auto-expire if not recovered).
	quotaExhaustedDefaultTTL = 24 * time.Hour
)

// quotaExhaustedKey returns the Redis key for a channel's quota exhaustion marker.
func quotaExhaustedKey(channelId int) string {
	return fmt.Sprintf("%s%d", quotaExhaustedKeyPrefix, channelId)
}

// MarkChannelQuotaExhausted marks a channel as unhealthy due to quota exhaustion.
// It sets the channel to Unhealthy status with a reason indicating quota exhaustion,
// and stores a Redis marker key for fast lookups.
// ttl is the time-to-live for the Redis marker; if 0, a default is used.
func MarkChannelQuotaExhausted(channelId int, reason string, ttl time.Duration) {
	if ttl <= 0 {
		ttl = quotaExhaustedDefaultTTL
	}

	// Set Redis exhaustion marker
	if common.RedisEnabled {
		if err := common.RedisSet(quotaExhaustedKey(channelId), reason, ttl); err != nil {
			logger.SysError(fmt.Sprintf("health: failed to set quota exhausted marker for channel #%d: %s", channelId, err.Error()))
			// Fallback: still mark degraded if Redis is unavailable
			MarkChannelDegraded(channelId, "quota exhausted (Redis unavailable)")
			return
		}
	} else {
		// Without Redis, just mark degraded
		MarkChannelDegraded(channelId, "quota exhausted (Redis unavailable)")
		return
	}

	// Set channel health to unhealthy with reason
	health, err := GetChannelHealth(channelId)
	if err != nil {
		health = &ChannelHealth{
			Status:    HealthStatusHealthy,
			LastCheck: time.Now().UTC().Format(time.RFC3339),
		}
	}

	oldStatus := health.Status
	health.Status = HealthStatusUnhealthy
	health.Reason = "quota exhausted: " + reason
	health.LastCheck = time.Now().UTC().Format(time.RFC3339)
	health.ConsecutiveFailures++
	health.TotalChecks++
	health.TotalFailures++

	if err := SetChannelHealth(channelId, health); err != nil {
		logger.SysError(fmt.Sprintf("health: failed to update health for exhausted channel #%d: %s", channelId, err.Error()))
		return
	}

	if oldStatus != HealthStatusUnhealthy {
		logger.SysLog(fmt.Sprintf("health: channel #%d QUOTA EXHAUSTED → unhealthy: %s (was %s)", channelId, reason, oldStatus))
	}
}

// MarkChannelQuotaRecovered marks a channel as healthy after quota recovery.
// It clears the Redis exhaustion marker and resets the health status.
func MarkChannelQuotaRecovered(channelId int) {
	// Remove Redis exhaustion marker
	if common.RedisEnabled {
		if err := common.RedisDel(quotaExhaustedKey(channelId)); err != nil {
			logger.SysError(fmt.Sprintf("health: failed to clear quota exhausted marker for channel #%d: %s", channelId, err.Error()))
		}
	}

	// Reset channel health to healthy
	health, err := GetChannelHealth(channelId)
	if err != nil {
		// No health data, nothing to recover
		return
	}

	oldStatus := health.Status
	health.Status = HealthStatusHealthy
	health.Reason = ""
	health.ConsecutiveFailures = 0
	health.ConsecutiveSuccess = 0
	health.TotalChecks = 0
	health.TotalFailures = 0
	health.ErrorRate = 0
	health.LastCheck = time.Now().UTC().Format(time.RFC3339)

	if err := SetChannelHealth(channelId, health); err != nil {
		logger.SysError(fmt.Sprintf("health: failed to update health for recovered channel #%d: %s", channelId, err.Error()))
		return
	}

	if oldStatus != HealthStatusHealthy {
		logger.SysLog(fmt.Sprintf("health: channel #%d QUOTA RECOVERED → healthy (was %s)", channelId, oldStatus))
	}
}

// MarkChannelRateLimitExhausted marks a channel as unhealthy due to 429 rate_limit_error
// with quota exhaustion. Reuses the quota exhaustion infrastructure (Redis marker + Unhealthy status).
func MarkChannelRateLimitExhausted(channelId int, reason string, ttl time.Duration) {
	// Always update the Redis marker TTL, even if already unhealthy,
	// so the reset time stays accurate.
	if ttl <= 0 {
		ttl = quotaExhaustedDefaultTTL
	}
	if common.RedisEnabled {
		_ = common.RedisSet(quotaExhaustedKey(channelId), reason, ttl)
	}
	health, err := GetChannelHealth(channelId)
	if err == nil && health.Status == HealthStatusUnhealthy {
		return
	}
	MarkChannelQuotaExhausted(channelId, reason, ttl)
}

// IsQuotaExhausted checks if a channel is marked as quota-exhausted in Redis.
func IsQuotaExhausted(channelId int) bool {
	if !common.RedisEnabled {
		return false
	}
	data, err := common.RedisGet(quotaExhaustedKey(channelId))
	if err != nil {
		return false
	}
	return data != ""
}

// --- Health Check Scheduler ---

var (
	healthCheckerRunning bool
	healthCheckerMu      sync.Mutex
)

// getHealthCheckInterval reads the check interval from env, defaulting to 30s.
func getHealthCheckInterval() time.Duration {
	interval := defaultHealthCheckInterval
	if envInterval := os.Getenv("HEALTH_CHECK_INTERVAL"); envInterval != "" {
		if parsed, err := strconv.Atoi(envInterval); err == nil && parsed > 0 {
			interval = parsed
		}
	}
	return time.Duration(interval) * time.Second
}

// StartHealthChecker starts the periodic health check goroutine.
// It probes each active channel by calling the channel's /models endpoint
// (lightweight check) and records the result.
func StartHealthChecker() {
	healthCheckerMu.Lock()
	if healthCheckerRunning {
		healthCheckerMu.Unlock()
		return
	}
	healthCheckerRunning = true
	healthCheckerMu.Unlock()

	if !common.RedisEnabled {
		logger.SysLog("health checker: Redis not enabled, health checker disabled")
		return
	}

	interval := getHealthCheckInterval()
	logger.SysLog(fmt.Sprintf("health checker: starting with interval %s", interval))

	go func() {
		// Initial delay to let the system settle
		time.Sleep(10 * time.Second)

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			runHealthChecks()
		}
	}()
}

// runHealthChecks performs a health check on all enabled channels.
func runHealthChecks() {
	var channels []*model.Channel
	if err := model.DB.Where("status = ?", model.ChannelStatusEnabled).Find(&channels).Error; err != nil {
		logger.SysError(fmt.Sprintf("health checker: failed to query channels: %s", err.Error()))
		return
	}

	for _, ch := range channels {
		checkChannelHealth(ch)
	}
}

// getCachedQuotaWindows reads cached quota window data from Redis.
// Returns nil if no data is available (provider doesn't support windowed quotas
// or cache has expired).
func getCachedQuotaWindows(channelId int) []model.QuotaWindow {
	if !common.RedisEnabled {
		return nil
	}
	data, err := common.RedisGet(model.QuotaRedisKey(channelId))
	if err != nil || data == "" {
		return nil
	}
	var quota model.ChannelQuota
	if err := json.Unmarshal([]byte(data), &quota); err != nil {
		return nil
	}
	return quota.Windows
}

// checkChannelHealth checks a channel's health using quota data first,
// falling back to HTTP probe for providers without windowed quotas.
// If the channel has SkipHealthCheck enabled, only TCP connectivity is tested.
func checkChannelHealth(channel *model.Channel) {
	// Skip HTTP probe: only check TCP connectivity to baseURL
	if channel.SkipHealthCheck {
		success, latencyMs := probeChannelTCP(channel.GetBaseURL())
		oldStatus, newStatus, err := RecordHealthCheck(channel.Id, success, latencyMs)
		if err != nil {
			logger.SysError(fmt.Sprintf("health checker: failed to record TCP health for channel #%d: %s", channel.Id, err.Error()))
			return
		}
		_ = oldStatus
		_ = newStatus
		channel.ResponseTime = latencyMs
		_ = model.DB.Model(channel).Update("response_time", latencyMs)
		return
	}

	// Quota-aware check: if any window shows 100% usage, mark unhealthy
	// and skip the /v1/models probe (it succeeds even when quota is exhausted).
	windows := getCachedQuotaWindows(channel.Id)
	if windows != nil {
		for _, w := range windows {
			if w.UsedPercent >= 100.0 {
				MarkChannelQuotaExhausted(channel.Id,
					fmt.Sprintf("health-check: %s=%.1f%%", w.Label, w.UsedPercent),
					0)
				return
			}
		}
	}

	// HTTP probe for connectivity / providers without quota APIs
	start := time.Now()
	success := probeChannel(channel)
	latencyMs := int(time.Since(start).Milliseconds())

	oldStatus, newStatus, err := RecordHealthCheck(channel.Id, success, latencyMs)
	if err != nil {
		logger.SysError(fmt.Sprintf("health checker: failed to record health for channel #%d: %s", channel.Id, err.Error()))
		return
	}

	_ = oldStatus
	_ = newStatus

	// Update channel response time in database
	channel.ResponseTime = latencyMs
	_ = model.DB.Model(channel).Update("response_time", latencyMs)
}

// probeChannel sends a lightweight HTTP probe to check channel availability.
// It hits the /v1/models endpoint which is read-only and cheap.
// Returns true if the channel responded successfully.
func probeChannel(channel *model.Channel) bool {
	baseURL := channel.GetBaseURL()
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}
	baseURL = strings.TrimRight(baseURL, "/")

	probeURL := baseURL + "/v1/models"
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, probeURL, nil)
	if err != nil {
		return false
	}
	req.Header.Set("Authorization", "Bearer "+channel.Key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300
}

// probeChannelTCP tests TCP connectivity to the channel's baseURL.
// Returns (success, latencyMs).
func probeChannelTCP(baseURL string) (bool, int) {
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return false, 0
	}
	host := parsed.Host
	if _, port, splitErr := net.SplitHostPort(host); splitErr != nil {
		// No port specified, use scheme default
		switch parsed.Scheme {
		case "https":
			host = host + ":443"
		default:
			host = host + ":80"
		}
		_ = port
	}
	start := time.Now()
	conn, err := net.DialTimeout("tcp", host, 5*time.Second)
	latencyMs := int(time.Since(start).Milliseconds())
	if err != nil {
		return false, latencyMs
	}
	conn.Close()
	return true, latencyMs
}

// FindHealthyChannel selects a healthy channel from the candidate list.
// It tries to find a Healthy channel first, then falls back to Degraded.
// Returns nil if no suitable channel is found.
func FindHealthyChannel(channels []*model.Channel, excludeChannelId int) *model.Channel {
	var degradedCandidate *model.Channel

	for _, ch := range channels {
		if ch.Id == excludeChannelId {
			continue
		}
		status := GetChannelHealthStatus(ch.Id)
		switch status {
		case HealthStatusHealthy:
			return ch
		case HealthStatusDegraded:
			if degradedCandidate == nil {
				degradedCandidate = ch
			}
		}
	}

	return degradedCandidate
}

// ShouldFailover determines if a request should be failed over based on
// the health status of the channel that was supposed to handle it.
func ShouldFailover(channelId int) bool {
	status := GetChannelHealthStatus(channelId)
	return status == HealthStatusUnhealthy
}
