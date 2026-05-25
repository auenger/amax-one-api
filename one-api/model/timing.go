package model

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/helper"
	"github.com/songquanpeng/one-api/common/logger"
)

// RequestTiming records per-request timing data for latency analysis.
type RequestTiming struct {
	Id          int    `json:"id" gorm:"primaryKey"`
	RequestId   string `json:"request_id" gorm:"index;default:''"`
	ChannelId   int    `json:"channel_id" gorm:"index"`
	ChannelName string `json:"channel_name" gorm:"default:''"`
	UserId      int    `json:"user_id" gorm:"index"`
	Username    string `json:"username" gorm:"index;default:''"`
	TokenName   string `json:"token_name" gorm:"default:''"`
	ModelName   string `json:"model_name" gorm:"index;default:''"`
	IsStream    bool   `json:"is_stream" gorm:"default:false"`

	// 4 key timestamps (Unix milliseconds)
	TRequest  int64 `json:"t_request" gorm:"default:0"`
	TRelay    int64 `json:"t_relay" gorm:"default:0"`
	TUpstream int64 `json:"t_upstream" gorm:"default:0"`
	TResponse int64 `json:"t_response" gorm:"default:0"`

	// Derived durations (milliseconds)
	MiddlewareMs int64 `json:"middleware_ms" gorm:"default:0"` // t_relay - t_request
	UpstreamMs  int64 `json:"upstream_ms" gorm:"default:0"`  // t_upstream - t_relay
	ResponseMs  int64 `json:"response_ms" gorm:"default:0"`  // t_response - t_upstream
	TotalMs     int64 `json:"total_ms" gorm:"default:0"`     // t_response - t_request

	CreatedAt int64 `json:"created_at" gorm:"bigint;index"`
}

// RecordTimingAsync writes a RequestTiming record asynchronously via goroutine.
func RecordTimingAsync(ctx context.Context, t *RequestTiming) {
	t.CreatedAt = helper.GetTimestamp()
	go func() {
		err := DB.Create(t).Error
		if err != nil {
			logger.Error(ctx, "failed to record timing: "+err.Error())
		}
	}()
}

// TimingFilter holds query parameters for searching timing logs.
type TimingFilter struct {
	StartTimestamp int64
	EndTimestamp   int64
	ChannelId     int
	ModelName     string
	MinTotalMs    int64
	Username      string
	TokenName     string
	Page          int
	PageSize      int
}

// GetAllTimings returns a paginated list of RequestTiming records matching the filter.
func GetAllTimings(filter *TimingFilter) ([]*RequestTiming, error) {
	var timings []*RequestTiming
	tx := buildTimingQuery(DB, filter)

	offset := filter.Page * filter.PageSize
	err := tx.Order("id desc").Limit(filter.PageSize).Offset(offset).Find(&timings).Error
	return timings, err
}

// CountTimings returns the total number of records matching the filter.
func CountTimings(filter *TimingFilter) (int64, error) {
	var count int64
	tx := buildTimingQuery(DB.Model(&RequestTiming{}), filter)
	err := tx.Count(&count).Error
	return count, err
}

// DeleteOldTimings removes timing records older than the given Unix timestamp.
func DeleteOldTimings(targetTimestamp int64) (int64, error) {
	result := DB.Where("created_at < ?", targetTimestamp).Delete(&RequestTiming{})
	return result.RowsAffected, result.Error
}

// TimingStats holds percentile statistics for a group.
type TimingStats struct {
	GroupKey    string `json:"group_key" gorm:"column:group_key"`
	Count       int64  `json:"count" gorm:"column:count"`
	P50TotalMs  int64  `json:"p50_total_ms" gorm:"column:p50_total_ms"`
	P95TotalMs  int64  `json:"p95_total_ms" gorm:"column:p95_total_ms"`
	P99TotalMs  int64  `json:"p99_total_ms" gorm:"column:p99_total_ms"`
	AvgTotalMs  int64  `json:"avg_total_ms" gorm:"column:avg_total_ms"`
	P50MidMs    int64  `json:"p50_middleware_ms" gorm:"column:p50_middleware_ms"`
	P50UpMs     int64  `json:"p50_upstream_ms" gorm:"column:p50_upstream_ms"`
	P50RespMs   int64  `json:"p50_response_ms" gorm:"column:p50_response_ms"`
}

// GetTimingStats returns aggregated timing statistics grouped by the given field.
func GetTimingStats(groupBy string, filter *TimingFilter) ([]*TimingStats, error) {
	var stats []*TimingStats

	// Validate groupBy to prevent SQL injection
	validGroups := map[string]string{
		"channel":  "channel_id",
		"model":    "model_name",
		"username": "username",
	}
	groupCol, ok := validGroups[groupBy]
	if !ok {
		groupCol = "channel_id"
	}

	ifnull := "IFNULL"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}

	// Percentile expressions vary by database
	var p50Expr, p95Expr, p99Expr string
	if common.UsingPostgreSQL {
		p50Expr = fmt.Sprintf("percentile_cont(0.5) WITHIN GROUP (ORDER BY total_ms)")
		p95Expr = fmt.Sprintf("percentile_cont(0.95) WITHIN GROUP (ORDER BY total_ms)")
		p99Expr = fmt.Sprintf("percentile_cont(0.99) WITHIN GROUP (ORDER BY total_ms)")
	} else if common.UsingSQLite {
		// SQLite doesn't support percentile_cont, use simple avg as approximation
		p50Expr = fmt.Sprintf("%s(AVG(total_ms), 0)", ifnull)
		p95Expr = fmt.Sprintf("%s(AVG(total_ms), 0)", ifnull)
		p99Expr = fmt.Sprintf("%s(AVG(total_ms), 0)", ifnull)
	} else {
		// MySQL — no built-in percentile, use subquery approximation
		p50Expr = fmt.Sprintf("%s(AVG(total_ms), 0)", ifnull)
		p95Expr = fmt.Sprintf("%s(AVG(total_ms), 0)", ifnull)
		p99Expr = fmt.Sprintf("%s(AVG(total_ms), 0)", ifnull)
	}

	tx := buildTimingQuery(DB.Table("request_timings"), filter)
	selectCols := fmt.Sprintf(
		"%s as group_key, COUNT(1) as count, "+
			"%s as p50_total_ms, %s as p95_total_ms, %s as p99_total_ms, "+
			"%s(AVG(total_ms), 0) as avg_total_ms, "+
			"%s(AVG(middleware_ms), 0) as p50_middleware_ms, "+
			"%s(AVG(upstream_ms), 0) as p50_upstream_ms, "+
			"%s(AVG(response_ms), 0) as p50_response_ms",
		groupCol, p50Expr, p95Expr, p99Expr,
		ifnull, ifnull, ifnull, ifnull,
	)

	err := tx.Select(selectCols).Group(groupCol).Order("count desc").Scan(&stats).Error

	// For MySQL/SQLite, compute actual percentiles via Go code if we have data
	if !common.UsingPostgreSQL && len(stats) > 0 {
		computePercentiles(groupCol, filter, stats)
	}

	return stats, err
}

// computePercentiles calculates actual percentile values from raw data for databases without native support.
func computePercentiles(groupCol string, filter *TimingFilter, stats []*TimingStats) {
	for _, s := range stats {
		var values []int64
		tx := buildTimingQuery(DB.Model(&RequestTiming{}), filter).
			Where(fmt.Sprintf("%s = ?", groupCol), s.GroupKey).
			Select("total_ms").
			Order("total_ms asc")
		tx.Scan(&values)

		if len(values) > 0 {
			s.P50TotalMs = percentile(values, 50)
			s.P95TotalMs = percentile(values, 95)
			s.P99TotalMs = percentile(values, 99)
		}
	}
}

// percentile calculates the p-th percentile from a sorted slice.
func percentile(sorted []int64, p int) int64 {
	if len(sorted) == 0 {
		return 0
	}
	idx := (p * len(sorted)) / 100
	if idx >= len(sorted) {
		idx = len(sorted) - 1
	}
	return sorted[idx]
}

// buildTimingQuery applies common filter conditions to a gorm query.
func buildTimingQuery(tx *gorm.DB, filter *TimingFilter) *gorm.DB {
	if filter.StartTimestamp != 0 {
		tx = tx.Where("created_at >= ?", filter.StartTimestamp)
	}
	if filter.EndTimestamp != 0 {
		tx = tx.Where("created_at <= ?", filter.EndTimestamp)
	}
	if filter.ChannelId != 0 {
		tx = tx.Where("channel_id = ?", filter.ChannelId)
	}
	if filter.ModelName != "" {
		tx = tx.Where("model_name = ?", filter.ModelName)
	}
	if filter.MinTotalMs > 0 {
		tx = tx.Where("total_ms >= ?", filter.MinTotalMs)
	}
	if filter.Username != "" {
		tx = tx.Where("username = ?", filter.Username)
	}
	if filter.TokenName != "" {
		tx = tx.Where("token_name = ?", filter.TokenName)
	}
	return tx
}
