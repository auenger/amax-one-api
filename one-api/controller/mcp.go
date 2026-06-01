package controller

import (
	"context"
	"net/http"
	"strconv"
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

	// Validate required fields
	if provider.Name == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "provider name is required",
		})
		return
	}
	if provider.BaseURL == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "provider base_url is required",
		})
		return
	}

	// Set defaults
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

	// Create and register the upstream client
	client := mcpPkg.NewUpstreamClient(&provider)
	mcpPkg.GlobalUpstreamClients.Register(client)

	// Try to connect in background
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

	// Clean up old client
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

	// Create and register new client with updated config
	client := mcpPkg.NewUpstreamClient(&provider)
	mcpPkg.GlobalUpstreamClients.Register(client)

	// Reconnect in background
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

	// Unregister the upstream client
	mcpPkg.GlobalUpstreamClients.Unregister(uint(id))

	// Delete tools associated with this provider
	tools, _ := model.GetMCPToolsByProviderID(uint(id))
	for _, tool := range tools {
		_ = model.DeleteMCPTool(tool.ID)
	}

	// Delete the provider
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

// TestMCPProvider tests the connectivity to an upstream MCP provider.
func TestMCPProvider(c *gin.Context) {
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
		// Try loading from DB and creating a temporary client
		provider, dbErr := model.GetMCPProviderByID(uint(id))
		if dbErr != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "provider not found",
			})
			return
		}
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

	// Register the client if not already
	if mcpPkg.GlobalUpstreamClients.GetByProviderID(uint(id)) == nil {
		mcpPkg.GlobalUpstreamClients.Register(client)
	}

	tools := client.GetTools()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"connected":    true,
			"latency":      latency,
			"tools_count":  len(tools),
		},
	})
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
