package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yzw/aihub/monitor"
)

// ChannelMetricsResponse is the API response for channel metrics.
type ChannelMetricsResponse struct {
	Success  bool                    `json:"success"`
	Message  string                  `json:"message,omitempty"`
	Channels []*monitor.ChannelMetrics `json:"channels,omitempty"`
}

// RoutingStrategyRequest is the request body for setting routing strategy.
type RoutingStrategyRequest struct {
	Strategy string `json:"strategy" binding:"required"`
}

// RoutingStrategyResponse is the API response for routing strategy.
type RoutingStrategyResponse struct {
	Success  bool   `json:"success"`
	Strategy string `json:"strategy"`
	Message  string `json:"message,omitempty"`
}

// GetChannelMetrics handles GET /api/channel/metrics
func GetChannelMetrics(c *gin.Context) {
	metrics := monitor.GetAllChannelMetrics()
	if metrics == nil {
		metrics = []*monitor.ChannelMetrics{}
	}
	c.JSON(http.StatusOK, ChannelMetricsResponse{
		Success:  true,
		Channels: metrics,
	})
}

// GetRoutingStrategy handles GET /api/routing/strategy
func GetRoutingStrategy(c *gin.Context) {
	strategy := monitor.GetRoutingStrategy()
	c.JSON(http.StatusOK, RoutingStrategyResponse{
		Success:  true,
		Strategy: string(strategy),
	})
}

// SetRoutingStrategy handles PUT /api/routing/strategy
func SetRoutingStrategy(c *gin.Context) {
	var req RoutingStrategyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, RoutingStrategyResponse{
			Success: false,
			Message: "strategy is required",
		})
		return
	}

	strategy := monitor.RoutingStrategy(req.Strategy)
	if err := monitor.SetRoutingStrategy(strategy); err != nil {
		c.JSON(http.StatusBadRequest, RoutingStrategyResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, RoutingStrategyResponse{
		Success:  true,
		Strategy: string(strategy),
		Message:  "routing strategy updated",
	})
}
