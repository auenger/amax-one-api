package controller

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/logger"
	mcpPkg "github.com/songquanpeng/one-api/mcp"
	"github.com/songquanpeng/one-api/model"
)

// GetAllMCPProviders returns all MCP providers.
func GetAllMCPProviders(c *gin.Context) {
	providers, err := model.GetMCPProviders()
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
		"data":    providers,
	})
}

// GetMCPProvider returns a single MCP provider by ID.
func GetMCPProvider(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid provider id",
		})
		return
	}
	provider, err := model.GetMCPProviderByID(uint(id))
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
		"data":    provider,
	})
}

// AddMCPProvider creates a new MCP provider.
func AddMCPProvider(c *gin.Context) {
	var provider model.MCPProvider
	if err := c.ShouldBindJSON(&provider); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid request: " + err.Error(),
		})
		return
	}

	if provider.Name == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "provider name is required",
		})
		return
	}

	// Set defaults
	if provider.Type == "" {
		provider.Type = "upstream"
	}

	if provider.IsBuiltin() {
		// Validate builtin config
		config, err := provider.ParseBuiltinConfig()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "invalid builtin_config: " + err.Error(),
			})
			return
		}
		if config.ChannelID <= 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "builtin_config.channel_id is required",
			})
			return
		}
		if config.Model == "" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "builtin_config.model is required",
			})
			return
		}
		// Validate channel exists and is enabled
		channel, err := model.GetChannelById(config.ChannelID, true)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": fmt.Sprintf("channel %d not found", config.ChannelID),
			})
			return
		}
		if channel.Status != model.ChannelStatusEnabled {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": fmt.Sprintf("channel %d (%s) is not enabled", channel.Id, channel.Name),
			})
			return
		}
		// Set defaults for builtin provider
		if provider.ToolPrefix == "" {
			provider.ToolPrefix = provider.Name
		}

		if err := model.CreateMCPProvider(&provider); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		// Register builtin tools
		mcpPkg.InitBuiltinProviders()

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
			"data":    provider,
		})
		return
	}

	// Upstream provider (existing logic)
	if provider.BaseURL == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "provider base_url is required",
		})
		return
	}

	if provider.Transport == "" {
		provider.Transport = "streamable-http"
	}
	if provider.ToolPrefix == "" {
		provider.ToolPrefix = provider.Name
	}

	if err := model.CreateMCPProvider(&provider); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	client := mcpPkg.NewUpstreamClient(&provider)
	mcpPkg.GlobalUpstreamClients.Register(client)

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := client.Connect(ctx); err != nil {
			logger.SysError("MCP: failed to connect new provider " + provider.Name + ": " + err.Error())
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    provider,
	})
}

// UpdateMCPProvider updates an existing MCP provider.
func UpdateMCPProvider(c *gin.Context) {
	var provider model.MCPProvider
	if err := c.ShouldBindJSON(&provider); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid request: " + err.Error(),
		})
		return
	}

	// Set defaults
	if provider.Type == "" {
		provider.Type = "upstream"
	}

	if provider.IsBuiltin() {
		// Builtin provider: unregister old tools, update, re-register
		oldProvider, _ := model.GetMCPProviderByID(provider.ID)
		if oldProvider != nil && oldProvider.IsBuiltin() {
			mcpPkg.UnregisterBuiltinTools(oldProvider)
		}
		if oldProvider != nil && !oldProvider.IsBuiltin() {
			// Type changed from upstream to builtin: cleanup upstream client
			mcpPkg.GlobalUpstreamClients.Unregister(provider.ID)
		}

		if err := model.UpdateMCPProvider(&provider); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		// Re-register builtin tools
		updatedProvider, _ := model.GetMCPProviderByID(provider.ID)
		if updatedProvider != nil && updatedProvider.Enabled {
			mcpPkg.RegisterBuiltinTools(updatedProvider)
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
		})
		return
	}

	// Upstream provider (existing logic)
	oldClient := mcpPkg.GlobalUpstreamClients.GetByProviderID(provider.ID)
	if oldClient != nil {
		mcpPkg.GlobalUpstreamClients.Unregister(provider.ID)
	}

	if err := model.UpdateMCPProvider(&provider); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	client := mcpPkg.NewUpstreamClient(&provider)
	mcpPkg.GlobalUpstreamClients.Register(client)

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := client.Connect(ctx); err != nil {
			logger.SysError("MCP: failed to reconnect provider " + provider.Name + ": " + err.Error())
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// DeleteMCPProvider deletes an MCP provider by ID.
func DeleteMCPProvider(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid provider id",
		})
		return
	}

	provider, _ := model.GetMCPProviderByID(uint(id))
	if provider != nil && provider.IsBuiltin() {
		mcpPkg.UnregisterBuiltinTools(provider)
	} else {
		mcpPkg.GlobalUpstreamClients.Unregister(uint(id))
	}

	tools, _ := model.GetMCPToolsByProviderID(uint(id))
	for _, tool := range tools {
		_ = model.DeleteMCPTool(tool.ID)
	}

	if err := model.DeleteMCPProvider(uint(id)); err != nil {
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

// SyncMCPProvider triggers a manual tool sync for a provider.
func SyncMCPProvider(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid provider id",
		})
		return
	}

	client := mcpPkg.GlobalUpstreamClients.GetByProviderID(uint(id))
	if client == nil {
		// Load from DB and create client
		provider, dbErr := model.GetMCPProviderByID(uint(id))
		if dbErr != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "provider not found in database",
			})
			return
		}
		client = mcpPkg.NewUpstreamClient(provider)
		mcpPkg.GlobalUpstreamClients.Register(client)
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	if err := client.SyncTools(ctx); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "sync failed: " + err.Error(),
		})
		return
	}

	tools := client.GetTools()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"synced_tools": len(tools),
			"provider_id":  id,
		},
	})
}

// SyncAllMCPProviders triggers a manual tool sync for all enabled providers.
func SyncAllMCPProviders(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 120*time.Second)
	defer cancel()

	mcpPkg.SyncAllProviders(ctx)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// TestMCPProvider tests the connectivity to an upstream MCP provider or builtin tool.
func TestMCPProvider(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid provider id",
		})
		return
	}

	provider, dbErr := model.GetMCPProviderByID(uint(id))
	if dbErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "provider not found",
		})
		return
	}

	if provider.IsBuiltin() {
		testBuiltinProvider(c, provider)
		return
	}

	// Upstream provider test (existing logic)
	client := mcpPkg.GlobalUpstreamClients.GetByProviderID(uint(id))
	if client == nil {
		client = mcpPkg.NewUpstreamClient(provider)
	}

	start := time.Now()
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	connectErr := client.Connect(ctx)
	latency := time.Since(start).Milliseconds()

	if connectErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "连接失败: " + connectErr.Error(),
			"data": gin.H{
				"connected": false,
				"latency":   latency,
			},
		})
		return
	}

	if mcpPkg.GlobalUpstreamClients.GetByProviderID(uint(id)) == nil {
		mcpPkg.GlobalUpstreamClients.Register(client)
	}

	tools := client.GetTools()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"connected":   true,
			"latency":     latency,
			"tools_count": len(tools),
		},
	})
}

// testBuiltinProvider tests a builtin provider by sending a test image analysis.
func testBuiltinProvider(c *gin.Context, provider *model.MCPProvider) {
	config, err := provider.ParseBuiltinConfig()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid builtin config: " + err.Error(),
		})
		return
	}

	channel, err := model.GetChannelById(config.ChannelID, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("channel %d not found", config.ChannelID),
		})
		return
	}
	if channel.Status != model.ChannelStatusEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("channel %d (%s) is disabled", channel.Id, channel.Name),
		})
		return
	}

	if mcpPkg.VisionRelayFunc == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "vision relay not initialized",
		})
		return
	}

	// Use a minimal test request
	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	start := time.Now()
	_, callErr := mcpPkg.VisionRelayFunc(ctx, config.ChannelID, config.Model, "", 0,
		"https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png",
		"Describe this image in one word.")
	latency := time.Since(start).Milliseconds()

	if callErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "测试失败: " + callErr.Error(),
			"data": gin.H{
				"connected": false,
				"latency":   latency,
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"connected": true,
			"latency":   latency,
		},
	})
}

// GetVisionChannels returns channels that support multimodal (vision) models.
func GetVisionChannels(c *gin.Context) {
	channels, err := model.GetAllChannels(0, 0, "all")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	type ChannelOption struct {
		ID     int      `json:"id"`
		Name   string   `json:"name"`
		Type   int      `json:"type"`
		Models []string `json:"models"`
	}

	// Load multimodal model set from ModelMeta
	multimodalSet, _ := model.GetMultimodalModelNames()

	result := make([]ChannelOption, 0)

	for _, ch := range channels {
		if ch.Status != model.ChannelStatusEnabled {
			continue
		}
		var allModels []string
		for _, m := range strings.Split(ch.Models, ",") {
			m = strings.TrimSpace(m)
			if m != "" {
				allModels = append(allModels, m)
			}
		}

		var visionModels []string
		for _, m := range allModels {
			if isMultimodalModel(m, multimodalSet) {
				visionModels = append(visionModels, m)
			}
		}

		if len(visionModels) > 0 {
			result = append(result, ChannelOption{
				ID:     ch.Id,
				Name:   ch.Name,
				Type:   ch.Type,
				Models: visionModels,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    result,
	})
}

// isMultimodalModel checks if a model is marked as multimodal in ModelMeta,
// falling back to keyword matching for unregistered models.
func isMultimodalModel(modelName string, multimodalSet map[string]bool) bool {
	mLower := strings.ToLower(modelName)
	if multimodalSet != nil && multimodalSet[mLower] {
		return true
	}
	return model.IsMultimodalByKeywords(modelName)
}

// GetMCPProviderTools returns all tools for a specific provider.
func GetMCPProviderTools(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid provider id",
		})
		return
	}

	tools, err := model.GetMCPToolsByProviderID(uint(id))
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
		"data":    tools,
	})
}

// UpdateMCPToolStatus updates the enabled status of an MCP tool.
func UpdateMCPToolStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid tool id",
		})
		return
	}

	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid request: " + err.Error(),
		})
		return
	}

	tool, err := model.GetMCPToolByID(uint(id))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "tool not found",
		})
		return
	}

	tool.Enabled = body.Enabled
	if err := model.UpdateMCPTool(tool); err != nil {
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

// GetMCPStats returns aggregated MCP usage statistics.
func GetMCPStats(c *gin.Context) {
	startStr := c.Query("start")
	endStr := c.Query("end")

	var startTimestamp, endTimestamp int64
	if startStr != "" {
		startTimestamp, _ = strconv.ParseInt(startStr, 10, 64)
	}
	if endStr != "" {
		endTimestamp, _ = strconv.ParseInt(endStr, 10, 64)
	}

	providerStats, err := model.GetMCPProviderStats(startTimestamp, endTimestamp)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	toolStats, err := model.GetMCPToolStats(startTimestamp, endTimestamp)
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
		"data": gin.H{
			"providers": providerStats,
			"tools":     toolStats,
		},
	})
}
