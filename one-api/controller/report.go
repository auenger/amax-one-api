package controller

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/model"
)

func GetUsageReport(c *gin.Context) {
	username := c.Query("username")
	tokenName := c.Query("token_name")
	startTimestamp, _ := parseTimestamp(c.Query("start_timestamp"))
	endTimestamp, _ := parseTimestamp(c.Query("end_timestamp"))
	granularity := c.DefaultQuery("granularity", "day")

	var tokenNames []string
	if tokenName != "" {
		tokenNames = strings.Split(tokenName, ",")
		for i := range tokenNames {
			tokenNames[i] = strings.TrimSpace(tokenNames[i])
		}
	}

	report, err := model.GetUsageReport(username, tokenNames, startTimestamp, endTimestamp, granularity)
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
		"data":    report,
	})
}

func parseTimestamp(s string) (int64, error) {
	if s == "" {
		return 0, nil
	}
	var ts int64
	_, err := fmt.Sscanf(s, "%d", &ts)
	return ts, err
}
