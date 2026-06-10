package monitor

import (
	"math"
	"testing"
)

// ────────────────────────────────────────────────────────────
// Task 2 Tests: Channel Scoring Model
// ────────────────────────────────────────────────────────────

func TestCalcLatencyScore(t *testing.T) {
	tests := []struct {
		name     string
		latency  float64
		expected float64
	}{
		{"zero latency", 0, 1.0},
		{"low latency", 100, 0.99},
		{"medium latency", 5000, 0.5},
		{"high latency", 10000, 0.0},
		{"excessive latency", 15000, 0.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calcLatencyScore(tt.latency)
			if math.Abs(result-tt.expected) > 0.01 {
				t.Errorf("calcLatencyScore(%v) = %v, want %v", tt.latency, result, tt.expected)
			}
		})
	}
}

func TestCalcQuotaScore(t *testing.T) {
	tests := []struct {
		name     string
		tokens   int64
		minScore float64
		maxScore float64
	}{
		{"no usage", 0, 1.0, 1.0},
		{"low usage", 1000, 0.9, 1.0},
		{"medium usage", 100000, 0.2, 0.5},
		{"high usage", 1000000, 0.0, 0.2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calcQuotaScore(tt.tokens)
			if result < tt.minScore || result > tt.maxScore {
				t.Errorf("calcQuotaScore(%v) = %v, want between %v and %v", tt.tokens, result, tt.minScore, tt.maxScore)
			}
		})
	}
}

func TestScoreChannel_Balanced(t *testing.T) {
	// Channel with good metrics should score high
	goodMetrics := &ChannelMetrics{
		ChannelID:   1,
		P95Latency:  200,
		SuccessRate: 0.99,
		TokensUsed:  1000,
	}
	score := ScoreChannel(goodMetrics, StrategyBalanced)
	if score < 0.8 {
		t.Errorf("good channel scored too low: %v", score)
	}

	// Channel with bad metrics should score low
	badMetrics := &ChannelMetrics{
		ChannelID:   2,
		P95Latency:  9000,
		SuccessRate: 0.5,
		TokensUsed:  1000000,
	}
	score = ScoreChannel(badMetrics, StrategyBalanced)
	if score > 0.5 {
		t.Errorf("bad channel scored too high: %v", score)
	}
}

func TestScoreChannel_LatencyFirst(t *testing.T) {
	// Low latency, low quota
	lowLatHighQuota := &ChannelMetrics{
		ChannelID:   1,
		P95Latency:  100,
		SuccessRate: 0.99,
		TokensUsed:  900000, // lots of usage
	}
	// High latency, high quota
	highLatLowQuota := &ChannelMetrics{
		ChannelID:   2,
		P95Latency:  5000,
		SuccessRate: 0.99,
		TokensUsed:  100, // little usage
	}

	score1 := ScoreChannel(lowLatHighQuota, StrategyLatencyFirst)
	score2 := ScoreChannel(highLatLowQuota, StrategyLatencyFirst)

	if score1 <= score2 {
		t.Errorf("latency-first: low-lat channel (%v) should score higher than high-lat channel (%v)", score1, score2)
	}
}

func TestScoreChannel_CostFirst(t *testing.T) {
	// Low latency, high token usage (low remaining quota)
	lowLatHighUsage := &ChannelMetrics{
		ChannelID:   1,
		P95Latency:  100,
		SuccessRate: 0.99,
		TokensUsed:  900000,
	}
	// High latency, low token usage (high remaining quota)
	highLatLowUsage := &ChannelMetrics{
		ChannelID:   2,
		P95Latency:  5000,
		SuccessRate: 0.99,
		TokensUsed:  100,
	}

	score1 := ScoreChannel(lowLatHighUsage, StrategyCostFirst)
	score2 := ScoreChannel(highLatLowUsage, StrategyCostFirst)

	if score1 >= score2 {
		t.Errorf("cost-first: high-quota channel (%v) should score higher than low-quota channel (%v)", score2, score1)
	}
}

func TestScoreChannel_RoundRobin(t *testing.T) {
	metrics := &ChannelMetrics{
		ChannelID:   1,
		P95Latency:  5000,
		SuccessRate: 0.1,
		TokensUsed:  1000000,
	}
	score := ScoreChannel(metrics, StrategyRoundRobin)
	if score != 1.0 {
		t.Errorf("round-robin should always return 1.0, got %v", score)
	}
}

func TestScoreChannel_NilMetrics(t *testing.T) {
	score := ScoreChannel(nil, StrategyBalanced)
	if score != 0.5 {
		t.Errorf("nil metrics should return neutral score 0.5, got %v", score)
	}
}

func TestScoreChannel_GoodChannelScoresHigherThanBad(t *testing.T) {
	// Scenario 1 from spec: Channel A (200ms, 99%) should score higher than Channel B (500ms, 95%)
	channelA := &ChannelMetrics{
		ChannelID:   1,
		P95Latency:  200,
		SuccessRate: 0.99,
		TokensUsed:  50000,
	}
	channelB := &ChannelMetrics{
		ChannelID:   2,
		P95Latency:  500,
		SuccessRate: 0.95,
		TokensUsed:  50000,
	}

	scoreA := ScoreChannel(channelA, StrategyBalanced)
	scoreB := ScoreChannel(channelB, StrategyBalanced)

	if scoreA <= scoreB {
		t.Errorf("channel A (%.4f) should score higher than channel B (%.4f) with balanced strategy", scoreA, scoreB)
	}
}

// ────────────────────────────────────────────────────────────
// Task 3 Tests: Routing Strategy
// ────────────────────────────────────────────────────────────

func TestStrategyWeightsMap(t *testing.T) {
	// Verify all strategies have correct weight sums
	for name, w := range StrategyWeightsMap {
		sum := w.W1 + w.W2 + w.W3
		if math.Abs(sum-1.0) > 0.01 {
			t.Errorf("strategy %s weights sum to %v, expected 1.0", name, sum)
		}
	}
}

func TestGetRoutingStrategy_Default(t *testing.T) {
	// Without Redis initialized, should return default strategy
	strategy := GetRoutingStrategy()
	if strategy != defaultStrategy {
		t.Errorf("expected default strategy %s, got %s", defaultStrategy, strategy)
	}
}

func TestRoutingStrategyType(t *testing.T) {
	tests := []struct {
		strategy RoutingStrategy
		valid    bool
	}{
		{StrategyBalanced, true},
		{StrategyLatencyFirst, true},
		{StrategyCostFirst, true},
		{StrategyRoundRobin, true},
		{RoutingStrategy("unknown"), false},
		{RoutingStrategy(""), false},
	}
	for _, tt := range tests {
		_, ok := StrategyWeightsMap[tt.strategy]
		isValid := ok || tt.strategy == StrategyRoundRobin
		if isValid != tt.valid {
			t.Errorf("strategy %q valid=%v, expected %v", tt.strategy, isValid, tt.valid)
		}
	}
}

// ────────────────────────────────────────────────────────────
// Task 1 Tests: Metrics Parsing
// ────────────────────────────────────────────────────────────

func TestParseLatencyMembers(t *testing.T) {
	members := []string{"200:1700000000000", "350:1700000001000", "150:1700000002000"}
	entries := parseLatencyMembers(members)
	if len(entries) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(entries))
	}
	if entries[0].LatencyMs != 200 {
		t.Errorf("expected latency 200, got %d", entries[0].LatencyMs)
	}
	if entries[1].LatencyMs != 350 {
		t.Errorf("expected latency 350, got %d", entries[1].LatencyMs)
	}
}

func TestParseLatencyMembers_Invalid(t *testing.T) {
	members := []string{"invalid", "200:1700000000000", ""}
	entries := parseLatencyMembers(members)
	if len(entries) != 1 {
		t.Errorf("expected 1 valid entry, got %d", len(entries))
	}
}

func TestPercentile(t *testing.T) {
	// Sorted latency values
	values := []int64{10, 20, 30, 40, 50, 60, 70, 80, 90, 100}

	p50 := percentile(values, 50)
	if p50 != 55.0 {
		t.Errorf("P50: expected 55.0, got %v", p50)
	}

	p0 := percentile(values, 0)
	if p0 != 10.0 {
		t.Errorf("P0: expected 10.0, got %v", p0)
	}

	p100 := percentile(values, 100)
	if p100 != 100.0 {
		t.Errorf("P100: expected 100.0, got %v", p100)
	}
}

func TestPercentile_SingleValue(t *testing.T) {
	values := []int64{42}
	p50 := percentile(values, 50)
	if p50 != 42.0 {
		t.Errorf("expected 42.0, got %v", p50)
	}
}

func TestPercentile_Empty(t *testing.T) {
	values := []int64{}
	p50 := percentile(values, 50)
	if p50 != 0 {
		t.Errorf("expected 0, got %v", p50)
	}
}

// ────────────────────────────────────────────────────────────
// Task 3 Tests: SmartChannelSelect (score-based, no Redis)
// ────────────────────────────────────────────────────────────

func TestSmartChannelSelect_Empty(t *testing.T) {
	id, score := SmartChannelSelect([]int{})
	if id != 0 || score != 0 {
		t.Errorf("expected (0, 0), got (%d, %v)", id, score)
	}
}

func TestSmartChannelSelect_Single(t *testing.T) {
	id, score := SmartChannelSelect([]int{42})
	if id != 42 || score != 1.0 {
		t.Errorf("expected (42, 1.0), got (%d, %v)", id, score)
	}
}

// ────────────────────────────────────────────────────────────
// Integration: Scoring consistency across strategies
// ────────────────────────────────────────────────────────────

func TestScoreConsistency_DegradationReducesScore(t *testing.T) {
	// When error rate increases, score should decrease
	healthyMetrics := &ChannelMetrics{
		ChannelID:   1,
		P95Latency:  200,
		SuccessRate: 0.99,
		TokensUsed:  10000,
	}
	degradedMetrics := &ChannelMetrics{
		ChannelID:   1,
		P95Latency:  200,
		SuccessRate: 0.80,
		TokensUsed:  10000,
	}

	healthyScore := ScoreChannel(healthyMetrics, StrategyBalanced)
	degradedScore := ScoreChannel(degradedMetrics, StrategyBalanced)

	if degradedScore >= healthyScore {
		t.Errorf("degraded channel (%.4f) should score lower than healthy (%.4f)", degradedScore, healthyScore)
	}
}

func TestScoreConsistency_LatencyDegradation(t *testing.T) {
	// When latency increases, score should decrease (balanced and latency-first)
	fastMetrics := &ChannelMetrics{
		ChannelID:   1,
		P95Latency:  100,
		SuccessRate: 0.99,
		TokensUsed:  10000,
	}
	slowMetrics := &ChannelMetrics{
		ChannelID:   2,
		P95Latency:  5000,
		SuccessRate: 0.99,
		TokensUsed:  10000,
	}

	for _, strategy := range []RoutingStrategy{StrategyBalanced, StrategyLatencyFirst} {
		fastScore := ScoreChannel(fastMetrics, strategy)
		slowScore := ScoreChannel(slowMetrics, strategy)
		if slowScore >= fastScore {
			t.Errorf("strategy %s: slow channel (%.4f) should score lower than fast (%.4f)", strategy, slowScore, fastScore)
		}
	}
}


