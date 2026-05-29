package router

import (
	"github.com/songquanpeng/one-api/controller"
	"github.com/songquanpeng/one-api/controller/auth"
	"github.com/songquanpeng/one-api/middleware"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
)

func SetApiRouter(router *gin.Engine) {
	apiRouter := router.Group("/api")
	apiRouter.Use(gzip.Gzip(gzip.DefaultCompression))
	apiRouter.Use(middleware.GlobalAPIRateLimit())
	{
		apiRouter.GET("/status", controller.GetStatus)
		apiRouter.GET("/models", middleware.UserAuth(), controller.DashboardListModels)
		apiRouter.GET("/notice", controller.GetNotice)
		apiRouter.GET("/about", controller.GetAbout)
		apiRouter.GET("/home_page_content", controller.GetHomePageContent)
		apiRouter.GET("/verification", middleware.CriticalRateLimit(), middleware.TurnstileCheck(), controller.SendEmailVerification)
		apiRouter.GET("/reset_password", middleware.CriticalRateLimit(), middleware.TurnstileCheck(), controller.SendPasswordResetEmail)
		apiRouter.POST("/user/reset", middleware.CriticalRateLimit(), controller.ResetPassword)
		apiRouter.GET("/oauth/github", middleware.CriticalRateLimit(), auth.GitHubOAuth)
		apiRouter.GET("/oauth/oidc", middleware.CriticalRateLimit(), auth.OidcAuth)
		apiRouter.GET("/oauth/lark", middleware.CriticalRateLimit(), auth.LarkOAuth)
		apiRouter.GET("/oauth/state", middleware.CriticalRateLimit(), auth.GenerateOAuthCode)
		apiRouter.GET("/oauth/wechat", middleware.CriticalRateLimit(), auth.WeChatAuth)
		apiRouter.GET("/oauth/wechat/bind", middleware.CriticalRateLimit(), middleware.UserAuth(), auth.WeChatBind)
		apiRouter.GET("/oauth/email/bind", middleware.CriticalRateLimit(), middleware.UserAuth(), controller.EmailBind)
		apiRouter.POST("/topup", middleware.AdminAuth(), controller.AdminTopUp)

		userRoute := apiRouter.Group("/user")
		{
			userRoute.POST("/register", middleware.CriticalRateLimit(), middleware.TurnstileCheck(), controller.Register)
			userRoute.POST("/login", middleware.CriticalRateLimit(), controller.Login)
			userRoute.GET("/logout", controller.Logout)

			selfRoute := userRoute.Group("/")
			selfRoute.Use(middleware.UserAuth())
			{
				selfRoute.GET("/dashboard", controller.GetUserDashboard)
				selfRoute.GET("/self", controller.GetSelf)
				selfRoute.PUT("/self", controller.UpdateSelf)
				selfRoute.DELETE("/self", controller.DeleteSelf)
				selfRoute.GET("/token", controller.GenerateAccessToken)
				selfRoute.GET("/aff", controller.GetAffCode)
				selfRoute.POST("/topup", controller.TopUp)
				selfRoute.GET("/available_models", controller.GetUserAvailableModels)
				selfRoute.GET("/model_channels", controller.GetModelChannels)
				selfRoute.GET("/model_concurrency", controller.GetUserModelConcurrency)
				selfRoute.GET("/channel_quotas", controller.GetUserChannelQuotas)
				selfRoute.GET("/channel_names", controller.GetUserChannelNames)
				selfRoute.GET("/report", controller.GetUsageReport)
				selfRoute.GET("/report/daily", controller.GetDailyHourlyReport)
			}

			adminRoute := userRoute.Group("/")
			adminRoute.Use(middleware.AdminAuth())
			{
				adminRoute.GET("/", controller.GetAllUsers)
				adminRoute.GET("/search", controller.SearchUsers)
				adminRoute.GET("/:id", controller.GetUser)
				adminRoute.POST("/", controller.CreateUser)
				adminRoute.POST("/manage", controller.ManageUser)
				adminRoute.PUT("/", controller.UpdateUser)
				adminRoute.DELETE("/:id", controller.DeleteUser)
			}
		}
		optionRoute := apiRouter.Group("/option")
		optionRoute.Use(middleware.RootAuth())
		{
			optionRoute.GET("/", controller.GetOptions)
			optionRoute.PUT("/", controller.UpdateOption)
		}
		channelRoute := apiRouter.Group("/channel")
		channelRoute.Use(middleware.AdminAuth())
		{
			channelRoute.GET("/", controller.GetAllChannels)
			channelRoute.GET("/search", controller.SearchChannels)
			channelRoute.GET("/models", controller.ListAllModels)
			channelRoute.GET("/metrics", controller.GetChannelMetrics)
			channelRoute.GET("/concurrency", controller.GetChannelConcurrency)
			channelRoute.GET("/:id", controller.GetChannel)
			channelRoute.GET("/test", controller.TestChannels)
			channelRoute.GET("/test/:id", controller.TestChannel)
			channelRoute.GET("/update_balance", controller.UpdateAllChannelsBalance)
			channelRoute.GET("/update_balance/:id", controller.UpdateChannelBalance)
			channelRoute.POST("/", controller.AddChannel)
			channelRoute.PUT("/", controller.UpdateChannel)
			channelRoute.DELETE("/disabled", controller.DeleteDisabledChannel)
			channelRoute.DELETE("/:id", controller.DeleteChannel)
			// Enterprise: Budget management
			channelRoute.GET("/budget/:id", controller.GetChannelBudget)
			channelRoute.PUT("/budget/:id", controller.UpdateChannelBudget)
			channelRoute.POST("/budget/:id/reset", controller.ResetChannelBudget)
			// Enterprise: Provider quota query
			channelRoute.GET("/quota", controller.GetAllChannelQuotas)
			channelRoute.GET("/quotas_map", controller.GetChannelQuotasMap)
			channelRoute.POST("/quota/refresh", controller.RefreshAllChannelQuotasHandler)
			channelRoute.GET("/:id/quota", controller.GetChannelQuota)
			channelRoute.POST("/:id/quota/refresh", controller.RefreshChannelQuota)
		}
		routingRoute := apiRouter.Group("/routing")
		routingRoute.Use(middleware.AdminAuth())
		{
			routingRoute.GET("/strategy", controller.GetRoutingStrategy)
			routingRoute.PUT("/strategy", controller.SetRoutingStrategy)
		}
		tokenRoute := apiRouter.Group("/token")
		tokenRoute.Use(middleware.UserAuth())
		{
			tokenRoute.GET("/", controller.GetAllTokens)
			tokenRoute.GET("/search", controller.SearchTokens)
			tokenRoute.GET("/:id", controller.GetToken)
			tokenRoute.POST("/", controller.AddToken)
			tokenRoute.PUT("/", controller.UpdateToken)
			tokenRoute.DELETE("/:id", controller.DeleteToken)
		}
		// Enterprise: Token request/approval workflow
		tokenRequestRoute := apiRouter.Group("/token_request")
		tokenRequestRoute.Use(middleware.UserAuth())
		{
			tokenRequestRoute.POST("/", controller.SubmitTokenRequest)
			tokenRequestRoute.GET("/self", controller.GetUserTokenRequests)
		}
		tokenRequestAdminRoute := apiRouter.Group("/token_request")
		tokenRequestAdminRoute.Use(middleware.AdminAuth())
		{
			tokenRequestAdminRoute.GET("/", controller.GetAllTokenRequests)
			tokenRequestAdminRoute.POST("/:id/approve", controller.ApproveTokenRequest)
			tokenRequestAdminRoute.POST("/:id/reject", controller.RejectTokenRequest)
		}
		redemptionRoute := apiRouter.Group("/redemption")
		redemptionRoute.Use(middleware.AdminAuth())
		{
			redemptionRoute.GET("/", controller.GetAllRedemptions)
			redemptionRoute.GET("/search", controller.SearchRedemptions)
			redemptionRoute.GET("/:id", controller.GetRedemption)
			redemptionRoute.POST("/", controller.AddRedemption)
			redemptionRoute.PUT("/", controller.UpdateRedemption)
			redemptionRoute.DELETE("/:id", controller.DeleteRedemption)
		}
		logRoute := apiRouter.Group("/log")
		logRoute.GET("/", middleware.AdminAuth(), controller.GetAllLogs)
		logRoute.DELETE("/", middleware.AdminAuth(), controller.DeleteHistoryLogs)
		logRoute.GET("/stat", middleware.AdminAuth(), controller.GetLogsStat)
		logRoute.GET("/self/stat", middleware.UserAuth(), controller.GetLogsSelfStat)
		logRoute.GET("/search", middleware.AdminAuth(), controller.SearchAllLogs)
		logRoute.GET("/self", middleware.UserAuth(), controller.GetUserLogs)
		logRoute.GET("/self/search", middleware.UserAuth(), controller.SearchUserLogs)
		groupRoute := apiRouter.Group("/group")
		groupRoute.Use(middleware.AdminAuth())
		{
			groupRoute.GET("/", controller.GetGroups)
		}
		// Enterprise: Request timing logs (admin only)
		timingRoute := apiRouter.Group("/timing")
		timingRoute.Use(middleware.AdminAuth())
		{
			timingRoute.GET("/", controller.GetAllTimings)
			timingRoute.GET("/stats", controller.GetTimingStats)
			timingRoute.DELETE("/", controller.DeleteTimings)
		}
		// Enterprise: Model downgrade status (admin only)
		downgradeRoute := apiRouter.Group("/downgrade")
		downgradeRoute.Use(middleware.AdminAuth())
		{
			downgradeRoute.GET("/status", controller.GetDowngradeStatus)
		}
		// Skill Marketplace
		skillRoute := apiRouter.Group("/skill")
		skillRoute.Use(middleware.UserAuth())
		{
			skillRoute.GET("/", controller.GetAllSkills)
			skillRoute.GET("/search", controller.SearchSkills)
			skillRoute.GET("/self", controller.GetUserSkills)
			skillRoute.GET("/categories", controller.GetSkillCategories)
			skillRoute.GET("/:id", controller.GetSkill)
			skillRoute.POST("/", controller.CreateSkill)
			skillRoute.PUT("/", controller.UpdateSkill)
			skillRoute.PUT("/:id", controller.UpdateSkill)
			skillRoute.DELETE("/:id", controller.DeleteSkill)
			skillRoute.GET("/:id/download", controller.DownloadSkill)
			skillRoute.GET("/:id/install", controller.GetInstallCommand)
			skillRoute.GET("/:id/versions", controller.GetSkillVersions)
			skillRoute.POST("/upgrade", controller.UpgradeSkill)
			skillRoute.POST("/rollback", controller.RollbackSkillVersion)
			skillRoute.DELETE("/:id/version", controller.DeleteSkillVersion)
		}
		// Skill Project
		skillProjectRoute := apiRouter.Group("/skill-project")
		skillProjectRoute.Use(middleware.UserAuth())
		{
			skillProjectRoute.GET("/", controller.GetAllSkillProjects)
			skillProjectRoute.GET("/:id", controller.GetSkillProject)
			skillProjectRoute.POST("/", controller.CreateSkillProject)
			skillProjectRoute.PUT("/:id", controller.UpdateSkillProject)
			skillProjectRoute.DELETE("/:id", controller.DeleteSkillProject)
		}
			// Enterprise: Daily request limit
			selfDailyRoute := userRoute.Group("/")
			selfDailyRoute.Use(middleware.UserAuth())
			{
				selfDailyRoute.GET("/daily-usage", controller.GetSelfDailyLimit)
			}
			dailyLimitAdminRoute := userRoute.Group("/")
			dailyLimitAdminRoute.Use(middleware.AdminAuth())
			{
				dailyLimitAdminRoute.PUT("/:id/daily-limit-exempt", controller.UpdateDailyLimitExempt)
				dailyLimitAdminRoute.POST("/:id/daily-limit-exempt-today", controller.GrantDailyLimitTempExempt)
			}
			dailyLimitRoute := apiRouter.Group("/daily-limit")
			dailyLimitRoute.Use(middleware.AdminAuth())
			{
				dailyLimitRoute.GET("/status", controller.GetDailyLimitStatus)
			}
			dailyLimitConfigRoute := apiRouter.Group("/daily-limit")
			dailyLimitConfigRoute.Use(middleware.RootAuth())
			{
				dailyLimitConfigRoute.GET("/config", controller.GetDailyLimitConfig)
				dailyLimitConfigRoute.PUT("/config", controller.UpdateDailyLimitConfig)
			}
	}
}
