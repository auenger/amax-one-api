package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yzw/aihub/common/ctxkey"
)

// TimingMiddleware records the request arrival time (t_request) into the gin context.
// This must be the first middleware in the relay chain to capture the earliest timestamp.
func TimingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(ctxkey.TimingTRequest, time.Now().UnixMilli())
		c.Next()
	}
}
