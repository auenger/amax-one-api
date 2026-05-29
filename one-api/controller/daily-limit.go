package controller

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/model"
)

type DailyLimitExemptRequest struct {
	Exempt bool `json:"exempt"`
}

type DailyLimitConfigRequest struct {
	DailyRequestLimit int `json:"daily_request_limit"`
}

func GetDailyLimitStatus(c *gin.Context) {
	userIdStr := c.Query("user_id")
	dateStr := beijingDate()
	ctx := context.Background()

	if userIdStr != "" {
		userId, err := strconv.Atoi(userIdStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "无效的用户 ID"})
			return
		}
		status := getUserDailyStatus(ctx, userId, dateStr)
		c.JSON(http.StatusOK, gin.H{"success": true, "data": status})
		return
	}

	// Return all users with non-zero counts for today
	if !common.RedisEnabled {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
		return
	}

	pattern := fmt.Sprintf("daily_limit:*:%s", dateStr)
	keys, _ := common.RDB.Keys(ctx, pattern).Result()
	statuses := make([]map[string]interface{}, 0)
	for _, key := range keys {
		var userId int
		fmt.Sscanf(key, "daily_limit:%d:", &userId)
		status := getUserDailyStatus(ctx, userId, dateStr)
		statuses = append(statuses, status)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": statuses})
}

func getUserDailyStatus(ctx context.Context, userId int, dateStr string) map[string]interface{} {
	var user model.User
	model.DB.Where("id = ?", userId).Select("id, username, daily_limit_exempt").First(&user)

	status := map[string]interface{}{
		"user_id":            userId,
		"username":           user.Username,
		"daily_limit":        config.DailyRequestLimit,
		"daily_limit_exempt": user.DailyLimitExempt,
	}

	if common.RedisEnabled {
		limitKey := fmt.Sprintf("daily_limit:%d:%s", userId, dateStr)
		count, _ := common.RDB.Get(ctx, limitKey).Int64()
		status["used_count"] = count

		exemptKey := fmt.Sprintf("daily_exempt:%d:%s", userId, dateStr)
		tempExempt, _ := common.RDB.Exists(ctx, exemptKey).Result()
		status["temp_exempt"] = tempExempt > 0
	} else {
		status["used_count"] = 0
		status["temp_exempt"] = false
	}

	return status
}

func UpdateDailyLimitExempt(c *gin.Context) {
	userId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "无效的用户 ID"})
		return
	}

	var req DailyLimitExemptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "请求参数错误"})
		return
	}

	err = model.DB.Model(&model.User{}).Where("id = ?", userId).Update("daily_limit_exempt", req.Exempt).Error
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "更新失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "豁免状态已更新"})
}

func GrantDailyLimitTempExempt(c *gin.Context) {
	userId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "无效的用户 ID"})
		return
	}

	if !common.RedisEnabled {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Redis 未启用"})
		return
	}

	dateStr := beijingDate()
	exemptKey := fmt.Sprintf("daily_exempt:%d:%s", userId, dateStr)
	ttl := secondsUntilMidnightBeijing()

	ctx := context.Background()
	common.RDB.Set(ctx, exemptKey, 1, time.Duration(ttl)*time.Second)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "已授予当日临时豁免"})
}

func GetDailyLimitConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"daily_request_limit": config.DailyRequestLimit,
		},
	})
}

func UpdateDailyLimitConfig(c *gin.Context) {
	var req DailyLimitConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "请求参数错误"})
		return
	}

	if err := model.UpdateOption("DailyRequestLimit", strconv.Itoa(req.DailyRequestLimit)); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "更新失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "限额配置已更新"})
}

func GetSelfDailyLimit(c *gin.Context) {
	userId := c.GetInt("id")
	dateStr := beijingDate()

	status := map[string]interface{}{
		"daily_limit": config.DailyRequestLimit,
	}

	if common.RedisEnabled {
		limitKey := fmt.Sprintf("daily_limit:%d:%s", userId, dateStr)
		count, _ := common.RDB.Get(context.Background(), limitKey).Int64()
		status["used_count"] = count
	} else {
		status["used_count"] = 0
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": status})
}

func beijingDate() string {
	loc, _ := time.LoadLocation("Asia/Shanghai")
	return time.Now().In(loc).Format("20060102")
}

func secondsUntilMidnightBeijing() int64 {
	loc, _ := time.LoadLocation("Asia/Shanghai")
	now := time.Now().In(loc)
	midnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, loc)
	return int64(midnight.Sub(now).Seconds()) + 1
}
