package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/model"
)

// GetChannelBudget returns the budget information for a channel.
func GetChannelBudget(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的渠道 Id",
		})
		return
	}
	channel, err := model.GetChannelById(id, false)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "渠道不存在",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"id":           channel.Id,
			"name":         channel.Name,
			"budget_limit": channel.BudgetLimit,
			"budget_used":  channel.BudgetUsed,
			"status":       channel.Status,
		},
	})
}

// ResetChannelBudget resets the budget used for a channel.
func ResetChannelBudget(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的渠道 Id",
		})
		return
	}
	err = model.ResetChannelBudget(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "预算已重置",
	})
}

// UpdateChannelBudget updates the budget limit for a channel.
func UpdateChannelBudget(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的渠道 Id",
		})
		return
	}
	var body struct {
		BudgetLimit float64 `json:"budget_limit"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "参数错误",
		})
		return
	}
	channel, err := model.GetChannelById(id, true)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "渠道不存在",
		})
		return
	}
	channel.BudgetLimit = body.BudgetLimit
	err = channel.Update()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"id":           channel.Id,
			"budget_limit": channel.BudgetLimit,
			"budget_used":  channel.BudgetUsed,
		},
	})
}

// CheckBudgetsCron is a cron job that checks all channels for budget overruns.
func CheckBudgetsCron() {
	channels, err := model.GetChannelsBudgetExceeded()
	if err != nil {
		return
	}
	for _, channel := range channels {
		model.UpdateChannelStatusById(channel.Id, model.ChannelStatusAutoDisabled)
	}
}
