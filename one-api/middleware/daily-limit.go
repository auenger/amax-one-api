package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/model"
)

func beijingDateStr() string {
	loc, _ := time.LoadLocation("Asia/Shanghai")
	return time.Now().In(loc).Format("20060102")
}

func secondsUntilMidnightBeijing() int64 {
	loc, _ := time.LoadLocation("Asia/Shanghai")
	now := time.Now().In(loc)
	midnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, loc)
	return int64(midnight.Sub(now).Seconds()) + 1
}

func DailyLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		if config.DailyRequestLimit <= 0 {
			c.Next()
			return
		}

		if !common.RedisEnabled {
			c.Next()
			return
		}

		userId := c.GetInt(ctxkey.Id)
		if userId == 0 {
			c.Next()
			return
		}

		// Check permanent exempt
		var user model.User
		if err := model.DB.Where("id = ?", userId).Select("daily_limit_exempt").First(&user).Error; err == nil && user.DailyLimitExempt {
			c.Next()
			return
		}

		dateStr := beijingDateStr()
		ctx := context.Background()
		rdb := common.RDB

		// Check temporary exempt
		exemptKey := fmt.Sprintf("daily_exempt:%d:%s", userId, dateStr)
		exists, _ := rdb.Exists(ctx, exemptKey).Result()
		if exists > 0 {
			c.Next()
			return
		}

		// Increment counter
		limitKey := fmt.Sprintf("daily_limit:%d:%s", userId, dateStr)
		count, err := rdb.Incr(ctx, limitKey).Result()
		if err != nil {
			c.Next()
			return
		}
		if count == 1 {
			rdb.Expire(ctx, limitKey, time.Duration(secondsUntilMidnightBeijing())*time.Second)
		}

		if count > int64(config.DailyRequestLimit) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": fmt.Sprintf("每日请求次数已用尽（%d/%d）", count-1, config.DailyRequestLimit),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
