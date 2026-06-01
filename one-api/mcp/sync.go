package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
)

const (
	// DefaultSyncInterval is the default interval for automatic tool sync.
	DefaultSyncInterval = 5 * time.Minute
)

// SyncTools fetches the tool list from the upstream MCP server and updates
// the local database cache.
func (c *UpstreamClient) SyncTools(ctx context.Context) error {
	// Ensure we are connected before syncing
	if !c.IsConnected() {
		if err := c.Connect(ctx); err != nil {
			return fmt.Errorf("reconnect failed: %w", err)
		}
	}

	req := &JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      json.RawMessage(`1`),
		Method:  "tools/list",
	}

	resp, err := c.sendRequest(ctx, req)
	if err != nil {
		return fmt.Errorf("tools/list request: %w", err)
	}
	if resp == nil {
		return fmt.Errorf("tools/list: empty response from upstream")
	}
	if resp.Error != nil {
		return fmt.Errorf("tools/list error: [%d] %s", resp.Error.Code, resp.Error.Message)
	}

	// Parse the tools from the response
	var toolsResult struct {
		Tools []UpstreamTool `json:"tools"`
	}
	if resp.Result != nil {
		resultBytes, _ := json.Marshal(resp.Result)
		if err := json.Unmarshal(resultBytes, &toolsResult); err != nil {
			return fmt.Errorf("parse tools/list response: %w", err)
		}
	}

	prefix := c.Provider.ToolPrefix
	providerID := c.Provider.ID

	// Get existing tools for this provider
	existingTools, _ := model.GetMCPToolsByProviderID(providerID)
	existingMap := make(map[string]*model.MCPTool)
	for i := range existingTools {
		existingMap[existingTools[i].Name] = &existingTools[i]
	}

	// Track which tools are still present upstream
	seenNames := make(map[string]bool)

	for _, tool := range toolsResult.Tools {
		prefixedName := tool.Name
		if prefix != "" {
			prefixedName = prefix + "_" + tool.Name
		}

		seenNames[prefixedName] = true
		inputSchema := ""
		if tool.InputSchema != nil {
			inputSchema = string(tool.InputSchema)
		}

		if existing, ok := existingMap[prefixedName]; ok {
			// Update existing tool
			existing.Description = tool.Description
			existing.InputSchema = inputSchema
			existing.Enabled = true
			_ = model.UpdateMCPTool(existing)
		} else {
			// Create new tool
			newTool := &model.MCPTool{
				Name:        prefixedName,
				DisplayName: prefixedName,
				ProviderID:  providerID,
				Description: tool.Description,
				InputSchema: inputSchema,
				Enabled:     true,
			}
			_ = model.CreateMCPTool(newTool)
		}
	}

	// Disable tools that are no longer present upstream
	for _, existing := range existingTools {
		if !seenNames[existing.Name] {
			existing.Enabled = false
			_ = model.UpdateMCPTool(&existing)
		}
	}

	// Update local cache
	c.mu.Lock()
	c.tools = toolsResult.Tools
	c.lastSync = time.Now()
	c.mu.Unlock()

	// Update sync timestamp on provider
	_ = model.UpdateMCPProviderSyncAt(providerID)

	logger.SysLog(fmt.Sprintf("MCP upstream %s: synced %d tools (prefix=%s)", c.Provider.Name, len(toolsResult.Tools), prefix))

	return nil
}

// SyncAllProviders syncs tools for all enabled providers with auto_sync enabled.
func SyncAllProviders(ctx context.Context) {
	clients := GlobalUpstreamClients.GetAll()
	for _, client := range clients {
		if !client.Provider.Enabled || !client.Provider.AutoSync {
			continue
		}
		if err := client.SyncTools(ctx); err != nil {
			logger.SysError(fmt.Sprintf("MCP sync %s: %v", client.Provider.Name, err))
		}
	}
}

// StartSyncScheduler starts a background goroutine that periodically syncs
// tools from all enabled upstream providers.
func StartSyncScheduler(ctx context.Context) {
	ticker := time.NewTicker(DefaultSyncInterval)
	go func() {
		for {
			select {
			case <-ticker.C:
				syncCtx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
				SyncAllProviders(syncCtx)
				cancel()
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}()
	logger.SysLog("MCP upstream tool sync scheduler started")
}

// InitUpstreamClients loads all enabled MCP providers from the database,
// creates upstream clients, and connects them. Builtin providers are handled
// separately by InitBuiltinProviders.
func InitUpstreamClients(ctx context.Context) {
	providers, err := model.GetUpstreamMCPProviders()
	if err != nil {
		logger.SysError("MCP: failed to load providers: " + err.Error())
		return
	}

	for i := range providers {
		provider := providers[i]
		client := NewUpstreamClient(&provider)
		GlobalUpstreamClients.Register(client)

		if err := client.Connect(ctx); err != nil {
			logger.SysError(fmt.Sprintf("MCP: failed to connect upstream %s: %v", provider.Name, err))
		}
	}

	logger.SysLog(fmt.Sprintf("MCP: initialized %d upstream providers", len(providers)))
}
