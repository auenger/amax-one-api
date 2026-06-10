package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yzw/aihub/common/ctxkey"
	dbmodel "github.com/yzw/aihub/model"
	"github.com/yzw/aihub/monitor"
)

// GetChannelConcurrency handles GET /api/channel/concurrency
// Returns all channel+model concurrency counts (admin only).
func GetChannelConcurrency(c *gin.Context) {
	entries := monitor.GetAllConcurrency()
	c.JSON(http.StatusOK, monitor.ConcurrencyResponse{
		Success: true,
		Data:    entries,
	})
}

// GetUserModelConcurrency handles GET /api/user/model_concurrency
// Returns concurrency counts for models available to the authenticated user's group.
func GetUserModelConcurrency(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	userGroup, err := dbmodel.CacheGetUserGroup(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// Get model -> channels mapping for the user's group
	modelChannelRefs := dbmodel.CacheGetModelChannelRefs(userGroup)

	// Convert to monitor.ChannelRef for the concurrency API
	modelChannels := make(map[string][]monitor.ChannelRef, len(modelChannelRefs))
	for model, refs := range modelChannelRefs {
		monitorRefs := make([]monitor.ChannelRef, 0, len(refs))
		for _, r := range refs {
			monitorRefs = append(monitorRefs, monitor.ChannelRef{Id: r.Id, Name: r.Name})
		}
		modelChannels[model] = monitorRefs
	}

	// Get concurrency data (cached for 5s)
	result := monitor.GetUserConcurrency(userGroup, modelChannels)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    result,
	})
}
