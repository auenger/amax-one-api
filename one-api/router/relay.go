package router

import (
	"github.com/songquanpeng/one-api/controller"
	"github.com/songquanpeng/one-api/middleware"

	"github.com/gin-gonic/gin"
)

func SetRelayRouter(router *gin.Engine) {
	router.Use(middleware.CORS())
	router.Use(middleware.GzipDecodeMiddleware())

	relayMiddleware := func() []gin.HandlerFunc {
		return []gin.HandlerFunc{
			middleware.TimingMiddleware(),
			middleware.RelayPanicRecover(),
			middleware.TokenAuth(),
			middleware.Affinity(),
			middleware.Distribute(),
		}
	}

	// ─── OpenAI Protocol (explicit prefix) ───
	openaiV1 := router.Group("/openai/v1", relayMiddleware()...)
	registerOpenAIRelayRoutes(openaiV1)
	openaiModels := router.Group("/openai/v1/models")
	openaiModels.Use(middleware.TokenAuth())
	{
		openaiModels.GET("", controller.ListModels)
		openaiModels.GET("/:model", controller.RetrieveModel)
	}

	// ─── Anthropic Protocol (explicit prefix) ───
	anthropicV1 := router.Group("/anthropic/v1", relayMiddleware()...)
	anthropicV1.POST("/messages", controller.RelayAnthropic)

	// ─── Legacy /v1/... (backward compatible) ───
	legacyV1 := router.Group("/v1", relayMiddleware()...)
	registerOpenAIRelayRoutes(legacyV1)
	legacyV1.POST("/messages", controller.RelayAnthropic)

	modelsRouter := router.Group("/v1/models")
	modelsRouter.Use(middleware.TokenAuth())
	{
		modelsRouter.GET("", controller.ListModels)
		modelsRouter.GET("/:model", controller.RetrieveModel)
	}
}

func registerOpenAIRelayRoutes(g *gin.RouterGroup) {
	g.Any("/oneapi/proxy/:channelid/*target", controller.Relay)
	g.POST("/completions", controller.Relay)
	g.POST("/chat/completions", controller.Relay)
	g.POST("/edits", controller.Relay)
	g.POST("/images/generations", controller.Relay)
	g.POST("/images/edits", controller.RelayNotImplemented)
	g.POST("/images/variations", controller.RelayNotImplemented)
	g.POST("/embeddings", controller.Relay)
	g.POST("/engines/:model/embeddings", controller.Relay)
	g.POST("/audio/transcriptions", controller.Relay)
	g.POST("/audio/translations", controller.Relay)
	g.POST("/audio/speech", controller.Relay)
	g.GET("/files", controller.RelayNotImplemented)
	g.POST("/files", controller.RelayNotImplemented)
	g.DELETE("/files/:id", controller.RelayNotImplemented)
	g.GET("/files/:id", controller.RelayNotImplemented)
	g.GET("/files/:id/content", controller.RelayNotImplemented)
	g.POST("/fine_tuning/jobs", controller.RelayNotImplemented)
	g.GET("/fine_tuning/jobs", controller.RelayNotImplemented)
	g.GET("/fine_tuning/jobs/:id", controller.RelayNotImplemented)
	g.POST("/fine_tuning/jobs/:id/cancel", controller.RelayNotImplemented)
	g.GET("/fine_tuning/jobs/:id/events", controller.RelayNotImplemented)
	g.DELETE("/models/:model", controller.RelayNotImplemented)
	g.POST("/moderations", controller.Relay)
	g.POST("/assistants", controller.RelayNotImplemented)
	g.GET("/assistants/:id", controller.RelayNotImplemented)
	g.POST("/assistants/:id", controller.RelayNotImplemented)
	g.DELETE("/assistants/:id", controller.RelayNotImplemented)
	g.GET("/assistants", controller.RelayNotImplemented)
	g.POST("/assistants/:id/files", controller.RelayNotImplemented)
	g.GET("/assistants/:id/files/:fileId", controller.RelayNotImplemented)
	g.DELETE("/assistants/:id/files/:fileId", controller.RelayNotImplemented)
	g.GET("/assistants/:id/files", controller.RelayNotImplemented)
	g.POST("/threads", controller.RelayNotImplemented)
	g.GET("/threads/:id", controller.RelayNotImplemented)
	g.POST("/threads/:id", controller.RelayNotImplemented)
	g.DELETE("/threads/:id", controller.RelayNotImplemented)
	g.POST("/threads/:id/messages", controller.RelayNotImplemented)
	g.GET("/threads/:id/messages/:messageId", controller.RelayNotImplemented)
	g.POST("/threads/:id/messages/:messageId", controller.RelayNotImplemented)
	g.GET("/threads/:id/messages/:messageId/files/:filesId", controller.RelayNotImplemented)
	g.GET("/threads/:id/messages/:messageId/files", controller.RelayNotImplemented)
	g.POST("/threads/:id/runs", controller.RelayNotImplemented)
	g.GET("/threads/:id/runs/:runsId", controller.RelayNotImplemented)
	g.POST("/threads/:id/runs/:runsId", controller.RelayNotImplemented)
	g.GET("/threads/:id/runs", controller.RelayNotImplemented)
	g.POST("/threads/:id/runs/:runsId/submit_tool_outputs", controller.RelayNotImplemented)
	g.POST("/threads/:id/runs/:runsId/cancel", controller.RelayNotImplemented)
	g.GET("/threads/:id/runs/:runsId/steps/:stepId", controller.RelayNotImplemented)
	g.GET("/threads/:id/runs/:runsId/steps", controller.RelayNotImplemented)
}
