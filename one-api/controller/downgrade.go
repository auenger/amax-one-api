package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yzw/aihub/model"
)

// GetDowngradeStatus returns the current downgrade status for all channels.
func GetDowngradeStatus(c *gin.Context) {
	status, err := model.GetDowngradeStatus()
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
		"data":    status,
	})
}
