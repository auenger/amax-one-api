package monitor

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"os"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/logger"
)

// ────────────────────────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────────────────────────

// RoutingStrategy defines the strategy for selecting among channels.
type RoutingStrategy string

const (
	StrategyBalanced     RoutingStrategy = "balanced"
	StrategyLatencyFirst RoutingStrategy = "latency-first"
	StrategyCostFirst    RoutingStrategy = "cost-first"
	StrategyRoundRobin   RoutingStrategy = "round-robin"
)

// StrategyWeights holds the weight configuration for a routing strategy.
type StrategyWeights struct {
	W1 float64 // latency weight
	W2 float64 // reliability weight
	W3 float64 // quota weight
}

// ChannelMetrics holds aggregated metrics for a single channel.
type ChannelMetrics struct {
	ChannelID   int     `json:"channel_id"`
	P50Latency  float64 `json:"p50_latency_ms"`
	P95Latency  float64 `json:"p95_latency_ms"`
	P99Latency  float64 `json:"p99_latency_ms"`
	SuccessRate float64 `json:"success_rate"`
	TokensUsed  int64   `json:"tokens_used"`
	Score       float64 `json:"score"`
}

const (
	// Redis key prefixes
	metricsLatencyPrefix  = "channel:metrics:latency:"  // sorted set (score=timestamp, member=latency)
	metricsSuccessPrefix  = "channel:metrics:success:"  // string (counter)
	metricsFailurePrefix  = "channel:metrics:failure:"  // string (counter)
	metricsTokensPrefix   = "channel:metrics:tokens:"   // string (counter)
	routingStrategyKey    = "routing:strategy"
	roundRobinCounterKey  = "routing:round_robin:counter"

	// Default configuration
	defaultMetricsWindow     = 300 // 5 minutes in seconds
	defaultMaxAcceptableMs   = 10000.0
	defaultStrategy          = StrategyBalanced
	metricsRecordingChanSize = 1000
)

// StrategyWeightsMap maps strategy names to their weight configurations.
var StrategyWeightsMap = map[RoutingStrategy]StrategyWeights{
	StrategyBalanced:     {W1: 0.4, W2: 0.4, W3: 0.2},
	StrategyLatencyFirst: {W1: 0.7, W2: 0.2, W3: 0.1},
	StrategyCostFirst:    {W1: 0.1, W2: 0.2, W3: 0.7},
}

// metricsRecord represents a single metrics data point for async recording.
type metricsRecord struct {
	ChannelID int
	LatencyMs int64
	Success   bool
	Tokens    int
}

var (
	metricsChan    chan metricsRecord
	metricsOnce    sync.Once
	metricsStarted bool
)

// ────────────────────────────────────────────────────────────
// Task 1: Metrics Collection
// ────────────────────────────────────────────────────────────

// StartMetricsCollector initializes the async metrics recording pipeline.
func StartMetricsCollector() {
	metricsOnce.Do(func() {
		if !common.RedisEnabled {
			logger.SysLog("loadbalancer: Redis not enabled, metrics collection disabled")
			return
		}
		metricsChan = make(chan metricsRecord, metricsRecordingChanSize)
		metricsStarted = true
		go metricsConsumer()
		logger.SysLog("loadbalancer: metrics collector started")
	})
}

// RecordMetrics records request metrics asynchronously (fire-and-forget).
func RecordMetrics(channelId int, latencyMs int64, success bool, tokens int) {
	if !metricsStarted {
		return
	}
	go func() {
		metricsChan <- metricsRecord{
			ChannelID: channelId,
			LatencyMs: latencyMs,
			Success:   success,
			Tokens:    tokens,
		}
	}()
}

// metricsConsumer reads from the channel and writes metrics to Redis.
func metricsConsumer() {
	window := getMetricsWindowSecs()
	for rec := range metricsChan {
		writeMetricsToRedis(rec, window)
	}
}

// writeMetricsToRedis persists a single metrics record to Redis.
func writeMetricsToRedis(rec metricsRecord, windowSecs int) {
	ctx := context.Background()

	// 1. Latency: sorted set with timestamp as score, latency value as member
	// Format: "latency:timestamp" to ensure unique members
	latencyKey := fmt.Sprintf("%s%d", metricsLatencyPrefix, rec.ChannelID)
	now := float64(time.Now().UnixMilli())
	member := fmt.Sprintf("%d:%d", rec.LatencyMs, int64(now))
	common.RDB.ZAdd(ctx, latencyKey, &redis.Z{Score: now, Member: member})
	// Trim entries older than window
	cutoff := float64(time.Now().Add(-time.Duration(windowSecs)*time.Second).UnixMilli())
	common.RDB.ZRemRangeByScore(ctx, latencyKey, "-inf", fmt.Sprintf("%f", cutoff))
	// Set TTL on the key
	common.RDB.Expire(ctx, latencyKey, time.Duration(windowSecs+60)*time.Second)

	// 2. Success/Failure counters
	if rec.Success {
		successKey := fmt.Sprintf("%s%d", metricsSuccessPrefix, rec.ChannelID)
		common.RDB.IncrBy(ctx, successKey, 1)
		common.RDB.Expire(ctx, successKey, time.Duration(windowSecs+60)*time.Second)
	} else {
		failureKey := fmt.Sprintf("%s%d", metricsFailurePrefix, rec.ChannelID)
		common.RDB.IncrBy(ctx, failureKey, 1)
		common.RDB.Expire(ctx, failureKey, time.Duration(windowSecs+60)*time.Second)
	}

	// 3. Token usage
	if rec.Tokens > 0 {
		tokensKey := fmt.Sprintf("%s%d", metricsTokensPrefix, rec.ChannelID)
		common.RDB.IncrBy(ctx, tokensKey, int64(rec.Tokens))
		common.RDB.Expire(ctx, tokensKey, time.Duration(windowSecs+60)*time.Second)
	}
}

// getMetricsWindowSecs reads the metrics window from env, defaulting to 300 (5 min).
func getMetricsWindowSecs() int {
	window := defaultMetricsWindow
	if envWindow := os.Getenv("METRICS_WINDOW_SECONDS"); envWindow != "" {
		if parsed, err := strconv.Atoi(envWindow); err == nil && parsed > 0 {
			window = parsed
		}
	}
	return window
}

// ────────────────────────────────────────────────────────────
// Task 1 (cont): Metrics Aggregation / Retrieval
// ────────────────────────────────────────────────────────────

// latencyMember stores a parsed latency entry from the sorted set.
type latencyEntry struct {
	LatencyMs int64
	Timestamp int64
}

// parseLatencyMembers parses "latency:timestamp" members from the sorted set.
func parseLatencyMembers(members []string) []latencyEntry {
	entries := make([]latencyEntry, 0, len(members))
	for _, m := range members {
		var latMs, ts int64
		if n, err := fmt.Sscanf(m, "%d:%d", &latMs, &ts); n == 2 && err == nil {
			entries = append(entries, latencyEntry{LatencyMs: latMs, Timestamp: ts})
		}
	}
	return entries
}

// percentile calculates the p-th percentile from sorted latency values.
func percentile(sorted []int64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	if len(sorted) == 1 {
		return float64(sorted[0])
	}
	idx := p / 100.0 * float64(len(sorted)-1)
	lower := int(math.Floor(idx))
	upper := lower + 1
	if upper >= len(sorted) {
		return float64(sorted[len(sorted)-1])
	}
	frac := idx - float64(lower)
	return float64(sorted[lower]) + frac*float64(sorted[upper]-sorted[lower])
}

// GetChannelMetrics retrieves the aggregated metrics for a channel from Redis.
func GetChannelMetrics(channelId int) *ChannelMetrics {
	if !common.RedisEnabled {
		return nil
	}
	ctx := context.Background()
	metrics := &ChannelMetrics{ChannelID: channelId}

	// 1. Latency percentiles from sorted set
	latencyKey := fmt.Sprintf("%s%d", metricsLatencyPrefix, channelId)
	members, err := common.RDB.ZRangeByScore(ctx, latencyKey, &redis.ZRangeBy{
		Min: "-inf",
		Max: "+inf",
	}).Result()
	if err == nil && len(members) > 0 {
		entries := parseLatencyMembers(members)
		if len(entries) > 0 {
			latValues := make([]int64, len(entries))
			for i, e := range entries {
				latValues[i] = e.LatencyMs
			}
			sort.Slice(latValues, func(i, j int) bool { return latValues[i] < latValues[j] })
			metrics.P50Latency = percentile(latValues, 50)
			metrics.P95Latency = percentile(latValues, 95)
			metrics.P99Latency = percentile(latValues, 99)
		}
	}

	// Fallback: use health data for latency approximation if no direct metrics
	if metrics.P95Latency == 0 {
		if health, err := GetChannelHealth(channelId); err == nil {
			metrics.P95Latency = float64(health.LatencyMs)
			metrics.P50Latency = float64(health.LatencyMs) * 0.7
			metrics.P99Latency = float64(health.LatencyMs) * 1.3
		}
	}

	// 2. Success / Failure counters
	successKey := fmt.Sprintf("%s%d", metricsSuccessPrefix, channelId)
	failureKey := fmt.Sprintf("%s%d", metricsFailurePrefix, channelId)
	successCount, _ := common.RDB.Get(ctx, successKey).Int64()
	failureCount, _ := common.RDB.Get(ctx, failureKey).Int64()
	total := successCount + failureCount
	if total > 0 {
		metrics.SuccessRate = float64(successCount) / float64(total)
	} else {
		metrics.SuccessRate = 1.0 // assume healthy if no data
	}

	// 3. Token usage
	tokensKey := fmt.Sprintf("%s%d", metricsTokensPrefix, channelId)
	tokensUsed, _ := common.RDB.Get(ctx, tokensKey).Int64()
	metrics.TokensUsed = tokensUsed

	return metrics
}

// GetAllChannelMetrics returns metrics for all channels that have data.
func GetAllChannelMetrics() []*ChannelMetrics {
	if !common.RedisEnabled {
		return nil
	}
	ctx := context.Background()
	var cursor uint64
	seen := make(map[int]bool)
	var result []*ChannelMetrics

	for {
		keys, nextCursor, err := common.RDB.Scan(ctx, cursor, metricsLatencyPrefix+"*", 100).Result()
		if err != nil {
			break
		}
		for _, key := range keys {
			idStr := key[len(metricsLatencyPrefix):]
			if id, err := strconv.Atoi(idStr); err == nil && !seen[id] {
				seen[id] = true
				result = append(result, GetChannelMetrics(id))
			}
		}
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
	return result
}

// ────────────────────────────────────────────────────────────
// Task 2: Channel Scoring Model
// ────────────────────────────────────────────────────────────

// ScoreChannel calculates the composite score for a channel given a strategy.
// Returns a value between 0 and 1 (higher is better).
func ScoreChannel(metrics *ChannelMetrics, strategy RoutingStrategy) float64 {
	if metrics == nil {
		return 0.5 // neutral score when no data
	}
	if strategy == StrategyRoundRobin {
		return 1.0
	}
	weights, ok := StrategyWeightsMap[strategy]
	if !ok {
		weights = StrategyWeightsMap[StrategyBalanced]
	}
	latencyScore := calcLatencyScore(metrics.P95Latency)
	reliabilityScore := metrics.SuccessRate
	quotaScore := calcQuotaScore(metrics.TokensUsed)
	score := weights.W1*latencyScore + weights.W2*reliabilityScore + weights.W3*quotaScore
	return math.Max(0, math.Min(1, score))
}

// calcLatencyScore converts P95 latency to a 0-1 score. Lower latency = higher score.
func calcLatencyScore(p95LatencyMs float64) float64 {
	if p95LatencyMs <= 0 {
		return 1.0
	}
	maxMs := defaultMaxAcceptableMs
	if envMax := os.Getenv("MAX_ACCEPTABLE_LATENCY_MS"); envMax != "" {
		if parsed, err := strconv.ParseFloat(envMax, 64); err == nil && parsed > 0 {
			maxMs = parsed
		}
	}
	score := 1.0 - (p95LatencyMs / maxMs)
	return math.Max(0, math.Min(1, score))
}

// calcQuotaScore estimates quota availability from token usage.
func calcQuotaScore(tokensUsed int64) float64 {
	if tokensUsed <= 0 {
		return 1.0
	}
	score := 1.0 / (1.0 + math.Log1p(float64(tokensUsed)/10000.0))
	return math.Max(0, math.Min(1, score))
}

// ────────────────────────────────────────────────────────────
// Task 3: Routing Strategy Engine
// ────────────────────────────────────────────────────────────

// GetRoutingStrategy returns the current routing strategy from Redis.
func GetRoutingStrategy() RoutingStrategy {
	if !common.RedisEnabled || common.RDB == nil {
		return defaultStrategy
	}
	val, err := common.RedisGet(routingStrategyKey)
	if err != nil {
		return defaultStrategy
	}
	strategy := RoutingStrategy(val)
	if _, ok := StrategyWeightsMap[strategy]; !ok && strategy != StrategyRoundRobin {
		return defaultStrategy
	}
	return strategy
}

// SetRoutingStrategy sets the current routing strategy in Redis.
func SetRoutingStrategy(strategy RoutingStrategy) error {
	if !common.RedisEnabled {
		return fmt.Errorf("redis not enabled")
	}
	if strategy != StrategyRoundRobin {
		if _, ok := StrategyWeightsMap[strategy]; !ok {
			return fmt.Errorf("unknown strategy: %s", strategy)
		}
	}
	return common.RedisSet(routingStrategyKey, string(strategy), 0)
}

// SmartChannelSelect selects the best channel from candidates using the current strategy.
func SmartChannelSelect(channelIDs []int) (int, float64) {
	if len(channelIDs) == 0 {
		return 0, 0
	}
	if len(channelIDs) == 1 {
		return channelIDs[0], 1.0
	}
	strategy := GetRoutingStrategy()
	if strategy == StrategyRoundRobin {
		return roundRobinSelect(channelIDs)
	}
	return scoreBasedSelect(channelIDs, strategy)
}

// scoreBasedSelect performs weighted random selection based on channel scores.
func scoreBasedSelect(channelIDs []int, strategy RoutingStrategy) (int, float64) {
	scores := make([]float64, len(channelIDs))
	totalScore := 0.0
	for i, id := range channelIDs {
		metrics := GetChannelMetrics(id)
		scores[i] = ScoreChannel(metrics, strategy)
		scores[i] = math.Max(scores[i], 0.01) // minimum weight
		totalScore += scores[i]
	}
	target := rand.Float64() * totalScore
	cumulative := 0.0
	for i, score := range scores {
		cumulative += score
		if cumulative >= target {
			return channelIDs[i], scores[i]
		}
	}
	return channelIDs[len(channelIDs)-1], scores[len(channelIDs)-1]
}

// roundRobinSelect cycles through channels deterministically.
func roundRobinSelect(channelIDs []int) (int, float64) {
	ctx := context.Background()
	counter, err := common.RDB.Incr(ctx, roundRobinCounterKey).Result()
	if err != nil {
		counter = 0
	}
	idx := int(counter % int64(len(channelIDs)))
	return channelIDs[idx], 1.0
}
