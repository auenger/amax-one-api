package controller

import (
	"context"
	"net/http"
	"strconv"

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
		ctx, cancel := context.WithTimeout(context.Background(), 30)
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
		ctx, cancel := context.WithTimeout(context.Background(), 30)
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
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "provider client not found, may not be connected",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60)
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
	ctx, cancel := context.WithTimeout(c.Request.Context(), 120)
	defer cancel()

	mcpPkg.SyncAllProviders(ctx)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
