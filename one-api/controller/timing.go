package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	dbmodel "github.com/songquanpeng/one-api/model"
)

// GetAllTimings returns a paginated list of timing logs.
// GET /api/timing/
func GetAllTimings(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("p", "0"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 10
	}

	filter := &dbmodel.TimingFilter{
		StartTimestamp: parseTimingInt64(c.Query("start_timestamp")),
		EndTimestamp:   parseTimingInt64(c.Query("end_timestamp")),
		ChannelId:     parseTimingInt(c.Query("channel")),
		ModelName:      c.Query("model_name"),
		MinTotalMs:    parseTimingInt64(c.Query("min_total_ms")),
		Username:       c.Query("username"),
		TokenName:      c.Query("token_name"),
		Page:          page,
		PageSize:      pageSize,
	}

	timings, err := dbmodel.GetAllTimings(filter)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	total, err := dbmodel.CountTimings(filter)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    timings,
		"total":   total,
	})
}

// GetTimingStats returns aggregated timing statistics.
// GET /api/timing/stats
func GetTimingStats(c *gin.Context) {
	groupBy := c.DefaultQuery("group_by", "channel")

	filter := &dbmodel.TimingFilter{
		StartTimestamp: parseTimingInt64(c.Query("start_timestamp")),
		EndTimestamp:   parseTimingInt64(c.Query("end_timestamp")),
		ChannelId:     parseTimingInt(c.Query("channel")),
		ModelName:      c.Query("model_name"),
		Username:       c.Query("username"),
		TokenName:      c.Query("token_name"),
	}

	stats, err := dbmodel.GetTimingStats(groupBy, filter)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    stats,
	})
}

// DeleteTimings removes old timing records.
// DELETE /api/timing/
func DeleteTimings(c *gin.Context) {
	targetTimestamp := parseTimingInt64(c.DefaultQuery("target_timestamp", "0"))
	if targetTimestamp == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "必须指定 target_timestamp 参数",
		})
		return
	}

	affected, err := dbmodel.DeleteOldTimings(targetTimestamp)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    affected,
	})
}

func parseTimingInt64(s string) int64 {
	if s == "" {
		return 0
	}
	v, _ := strconv.ParseInt(s, 10, 64)
	return v
}

func parseTimingInt(s string) int {
	if s == "" {
		return 0
	}
	v, _ := strconv.Atoi(s)
	return v
}
