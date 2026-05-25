package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/model"
)

// GetDowngradeRules returns all downgrade rules.
func GetDowngradeRules(c *gin.Context) {
	rules, err := model.GetDowngradeRules()
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
		"data":    rules,
	})
}

// CreateDowngradeRule creates a new downgrade rule.
func CreateDowngradeRule(c *gin.Context) {
	rule := model.ModelDowngradeRule{}
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的请求参数",
		})
		return
	}

	// Validate
	if rule.ThresholdPct < 1 || rule.ThresholdPct > 100 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "阈值必须在 1-100 之间",
		})
		return
	}
	if rule.TargetModel == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "目标模型不能为空",
		})
		return
	}

	if err := model.CreateDowngradeRule(&rule); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    rule,
	})
}

// UpdateDowngradeRule updates an existing downgrade rule.
func UpdateDowngradeRule(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的规则 ID",
		})
		return
	}

	rule := model.ModelDowngradeRule{}
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的请求参数",
		})
		return
	}

	rule.Id = id

	// Validate
	if rule.ThresholdPct < 1 || rule.ThresholdPct > 100 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "阈值必须在 1-100 之间",
		})
		return
	}
	if rule.TargetModel == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "目标模型不能为空",
		})
		return
	}

	if err := model.UpdateDowngradeRule(&rule); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    rule,
	})
}

// DeleteDowngradeRule deletes a downgrade rule by ID.
func DeleteDowngradeRule(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的规则 ID",
		})
		return
	}

	if err := model.DeleteDowngradeRule(id); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// GetDowngradeStatus returns the current downgrade status for all providers.
func GetDowngradeStatus(c *gin.Context) {
	status, err := model.GetDowngradeStatus()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// Also return the rules for context
	rules, _ := model.GetDowngradeRules()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"active_downgrades": status,
			"rules":             rules,
		},
	})
}
