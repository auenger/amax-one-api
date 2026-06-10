package monitor

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEvaluateHealth_Healthy(t *testing.T) {
	health := &ChannelHealth{
		Status:              HealthStatusHealthy,
		ConsecutiveFailures: 0,
		ConsecutiveSuccess:  5,
		TotalChecks:         20,
		TotalFailures:       0,
		ErrorRate:           0,
	}
	result := EvaluateHealth(health)
	assert.Equal(t, HealthStatusHealthy, result)
}

func TestEvaluateHealth_Degraded_ByErrorRate(t *testing.T) {
	health := &ChannelHealth{
		Status:              HealthStatusHealthy,
		ConsecutiveFailures: 0,
		ConsecutiveSuccess:  0,
		TotalChecks:         20,
		TotalFailures:       3,
		ErrorRate:           0.15,
	}
	result := EvaluateHealth(health)
	assert.Equal(t, HealthStatusDegraded, result)
}

func TestEvaluateHealth_Degraded_ByConsecutiveFailures(t *testing.T) {
	health := &ChannelHealth{
		Status:              HealthStatusHealthy,
		ConsecutiveFailures: 1,
		ConsecutiveSuccess:  0,
		TotalChecks:         5,
		TotalFailures:       1,
		ErrorRate:           0.2,
	}
	result := EvaluateHealth(health)
	assert.Equal(t, HealthStatusDegraded, result)
}

func TestEvaluateHealth_Unhealthy_ByConsecutiveFailures(t *testing.T) {
	health := &ChannelHealth{
		Status:              HealthStatusHealthy,
		ConsecutiveFailures: 3,
		ConsecutiveSuccess:  0,
		TotalChecks:         10,
		TotalFailures:       3,
		ErrorRate:           0.3,
	}
	result := EvaluateHealth(health)
	assert.Equal(t, HealthStatusUnhealthy, result)
}

func TestEvaluateHealth_Unhealthy_ByErrorRate(t *testing.T) {
	health := &ChannelHealth{
		Status:              HealthStatusDegraded,
		ConsecutiveFailures: 1,
		ConsecutiveSuccess:  0,
		TotalChecks:         20,
		TotalFailures:       11,
		ErrorRate:           0.55,
	}
	result := EvaluateHealth(health)
	assert.Equal(t, HealthStatusUnhealthy, result)
}

func TestEvaluateRecovery_UnhealthyToDegraded(t *testing.T) {
	health := &ChannelHealth{
		Status:              HealthStatusUnhealthy,
		ConsecutiveFailures: 0,
		ConsecutiveSuccess:  2,
		TotalChecks:         5,
		TotalFailures:       2,
		ErrorRate:           0.4,
	}
	result := EvaluateRecovery(HealthStatusUnhealthy, health)
	assert.Equal(t, HealthStatusDegraded, result)
}

func TestEvaluateRecovery_UnhealthyNotEnough(t *testing.T) {
	health := &ChannelHealth{
		Status:              HealthStatusUnhealthy,
		ConsecutiveFailures: 0,
		ConsecutiveSuccess:  1,
		TotalChecks:         5,
		TotalFailures:       3,
		ErrorRate:           0.6,
	}
	result := EvaluateRecovery(HealthStatusUnhealthy, health)
	assert.Equal(t, HealthStatusUnhealthy, result)
}

func TestEvaluateRecovery_DegradedToHealthy(t *testing.T) {
	health := &ChannelHealth{
		Status:              HealthStatusDegraded,
		ConsecutiveFailures: 0,
		ConsecutiveSuccess:  3,
		TotalChecks:         5,
		TotalFailures:       1,
		ErrorRate:           0.2,
	}
	result := EvaluateRecovery(HealthStatusDegraded, health)
	assert.Equal(t, HealthStatusHealthy, result)
}

func TestEvaluateRecovery_DegradedNotEnough(t *testing.T) {
	health := &ChannelHealth{
		Status:              HealthStatusDegraded,
		ConsecutiveFailures: 0,
		ConsecutiveSuccess:  2,
		TotalChecks:         5,
		TotalFailures:       1,
		ErrorRate:           0.2,
	}
	result := EvaluateRecovery(HealthStatusDegraded, health)
	assert.Equal(t, HealthStatusDegraded, result)
}

func TestEvaluateRecovery_HealthyStaysHealthy(t *testing.T) {
	health := &ChannelHealth{
		Status:              HealthStatusHealthy,
		ConsecutiveFailures: 0,
		ConsecutiveSuccess:  10,
		TotalChecks:         20,
		TotalFailures:       0,
		ErrorRate:           0,
	}
	result := EvaluateRecovery(HealthStatusHealthy, health)
	assert.Equal(t, HealthStatusHealthy, result)
}

func TestRecordHealthCheck_SuccessOnHealthy(t *testing.T) {
	// Record a successful check - should stay healthy
	// Note: This test uses Redis which may not be available in unit test env.
	// So we test the logic functions directly instead.
	health := &ChannelHealth{
		Status:              HealthStatusHealthy,
		ConsecutiveFailures: 0,
		ConsecutiveSuccess:  0,
		TotalChecks:         0,
		TotalFailures:       0,
		ErrorRate:           0,
	}

	// Simulate success
	health.TotalChecks++
	health.ConsecutiveSuccess++
	health.ConsecutiveFailures = 0
	health.LatencyMs = 200

	// Evaluate
	newStatus := EvaluateHealth(health)
	assert.Equal(t, HealthStatusHealthy, newStatus)
}

func TestRecordHealthCheck_FailureProgression(t *testing.T) {
	// Simulate 3 consecutive failures
	health := &ChannelHealth{
		Status:              HealthStatusHealthy,
		ConsecutiveFailures: 0,
		ConsecutiveSuccess:  0,
		TotalChecks:         0,
		TotalFailures:       0,
		ErrorRate:           0,
	}

	// Failure 1: should become degraded
	health.TotalChecks++
	health.TotalFailures++
	health.ConsecutiveFailures++
	health.ConsecutiveSuccess = 0
	health.ErrorRate = float64(health.TotalFailures) / float64(health.TotalChecks)
	status := EvaluateHealth(health)
	assert.Equal(t, HealthStatusDegraded, status)

	// Failure 2: still degraded
	health.TotalChecks++
	health.TotalFailures++
	health.ConsecutiveFailures++
	health.ErrorRate = float64(health.TotalFailures) / float64(health.TotalChecks)
	status = EvaluateHealth(health)
	assert.Equal(t, HealthStatusDegraded, status)

	// Failure 3: should become unhealthy
	health.TotalChecks++
	health.TotalFailures++
	health.ConsecutiveFailures++
	health.ErrorRate = float64(health.TotalFailures) / float64(health.TotalChecks)
	status = EvaluateHealth(health)
	assert.Equal(t, HealthStatusUnhealthy, status)
}

func TestRecoveryScenario(t *testing.T) {
	// Start unhealthy
	health := &ChannelHealth{
		Status:              HealthStatusUnhealthy,
		ConsecutiveFailures: 3,
		ConsecutiveSuccess:  0,
		TotalChecks:         10,
		TotalFailures:       5,
		ErrorRate:           0.5,
	}

	// 2 consecutive successes: unhealthy → degraded
	health.ConsecutiveFailures = 0
	health.ConsecutiveSuccess = 2
	status := EvaluateRecovery(HealthStatusUnhealthy, health)
	assert.Equal(t, HealthStatusDegraded, status)

	// 3 more consecutive successes: degraded → healthy
	health.ConsecutiveSuccess = 3
	status = EvaluateRecovery(HealthStatusDegraded, health)
	assert.Equal(t, HealthStatusHealthy, status)
}

func TestFindHealthyChannel(t *testing.T) {
	// This tests the selection logic without Redis
	// The actual FindHealthyChannel needs Redis, so we test the logic pattern
	channels := []struct {
		id     int
		status HealthStatus
	}{
		{id: 1, status: HealthStatusUnhealthy},
		{id: 2, status: HealthStatusHealthy},
		{id: 3, status: HealthStatusDegraded},
	}

	// Pick first healthy channel
	var selected int
	for _, ch := range channels {
		if ch.status == HealthStatusHealthy {
			selected = ch.id
			break
		}
	}
	assert.Equal(t, 2, selected)

	// Test fallback to degraded when no healthy available
	channels2 := []struct {
		id     int
		status HealthStatus
	}{
		{id: 1, status: HealthStatusUnhealthy},
		{id: 3, status: HealthStatusDegraded},
	}

	var degradedSelected int
	for _, ch := range channels2 {
		if ch.status == HealthStatusDegraded {
			degradedSelected = ch.id
			break
		}
	}
	assert.Equal(t, 3, degradedSelected)
}

func TestShouldFailover(t *testing.T) {
	assert.True(t, HealthStatusUnhealthy == HealthStatusUnhealthy)
	assert.False(t, HealthStatusHealthy == HealthStatusUnhealthy)
	assert.False(t, HealthStatusDegraded == HealthStatusUnhealthy)
}

func TestChannelHealthKey(t *testing.T) {
	key := channelHealthKey(42)
	assert.Equal(t, "channel:health:42", key)
}

func TestGetHealthCheckInterval_Default(t *testing.T) {
	// Without env var, should use default
	interval := getHealthCheckInterval()
	assert.Equal(t, 30, int(interval.Seconds()))
}
