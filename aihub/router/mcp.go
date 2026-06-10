package router

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	mcpPkg "github.com/yzw/aihub/mcp"
	"github.com/yzw/aihub/middleware"
)

func SetMCPRouter(router *gin.Engine) {
	mcpMiddleware := func() []gin.HandlerFunc {
		return []gin.HandlerFunc{
			middleware.TokenAuth(),
		}
	}

	// MCP v1 routes
	mcpV1 := router.Group("/mcp/v1", mcpMiddleware()...)
	{
		// Streamable HTTP transport: single POST request/response
		mcpV1.POST("/message", mcpPkg.HandleStreamableHTTP)

		// SSE transport: long-lived connection + POST for messages
		mcpV1.GET("/sse", mcpPkg.HandleSSEConnection)
		mcpV1.POST("/sse", mcpPkg.HandleSSEMessage)
	}

	// Initialize MCP providers on startup
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()

		// Initialize upstream providers
		mcpPkg.InitUpstreamClients(ctx)
		mcpPkg.StartSyncScheduler(ctx)

		// Initialize builtin providers
		mcpPkg.InitBuiltinProviders()
	}()
}
