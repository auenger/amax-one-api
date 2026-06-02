package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/model"
)

const (
	ProtocolVersion = "2024-11-05"
	ServerName      = "AIHub MCP Server"
	ServerVersion   = "1.0.0"
)

// handleInitialize handles the MCP initialize method.
func handleInitialize(_ context.Context, req *JSONRPCRequest, _ *MCPSession) *JSONRPCResponse {
	return &JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result: gin.H{
			"protocolVersion": ProtocolVersion,
			"capabilities": gin.H{
				"tools": gin.H{
					"listChanged": false,
				},
			},
			"serverInfo": gin.H{
				"name":    ServerName,
				"version": ServerVersion,
			},
		},
	}
}

// handlePing handles the MCP ping method.
func handlePing(_ context.Context, req *JSONRPCRequest, _ *MCPSession) *JSONRPCResponse {
	return &JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result:  gin.H{},
	}
}

// handleToolsList returns the list of available MCP tools.
func handleToolsList(_ context.Context, req *JSONRPCRequest, _ *MCPSession) *JSONRPCResponse {
	tools, err := model.GetMCPTools()
	if err != nil {
		return &JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Error: &JSONRPCError{
				Code:    -32603,
				Message: "failed to list tools: " + err.Error(),
			},
		}
	}

	result := make([]gin.H, 0, len(tools))
	for _, tool := range tools {
		var inputSchema interface{}
		if tool.InputSchema != "" {
			_ = json.Unmarshal([]byte(tool.InputSchema), &inputSchema)
		}
		if inputSchema == nil {
			inputSchema = gin.H{
				"type":       "object",
				"properties": gin.H{},
			}
		}
		result = append(result, gin.H{
			"name":        tool.Name,
			"description": tool.Description,
			"inputSchema": inputSchema,
		})
	}

	return &JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result: gin.H{
			"tools": result,
		},
	}
}

// handleToolsCall handles a tool invocation by routing to the appropriate
// upstream MCP provider or builtin tool based on the provider type.
func handleToolsCall(ctx context.Context, req *JSONRPCRequest, session *MCPSession) *JSONRPCResponse {
	var params struct {
		Name      string          `json:"name"`
		Arguments json.RawMessage `json:"arguments,omitempty"`
	}
	if req.Params != nil {
		_ = json.Unmarshal(req.Params, &params)
	}

	// Look up the tool
	tool, err := model.GetMCPToolByName(params.Name)
	if err != nil {
		return &JSONRPCResponse{
			Error: &JSONRPCError{
				Code:    -32602,
				Message: "tool not found: " + params.Name,
			},
		}
	}
	if !tool.Enabled {
		return &JSONRPCResponse{
			Error: &JSONRPCError{
				Code:    -32602,
				Message: "tool is disabled: " + params.Name,
			},
		}
	}

	// Look up the provider to determine the routing strategy
	provider, err := model.GetMCPProviderByID(tool.ProviderID)
	if err != nil {
		return &JSONRPCResponse{
			Error: &JSONRPCError{
				Code:    -32603,
				Message: "provider not found for tool: " + params.Name,
			},
		}
	}

	if !provider.Enabled {
		return &JSONRPCResponse{
			Error: &JSONRPCError{
				Code:    -32603,
				Message: "provider is disabled: " + provider.Name,
			},
		}
	}

	// Route to builtin handler if provider is builtin type
	if provider.IsBuiltin() {
		return callBuiltinTool(ctx, provider, params.Arguments)
	}

	// Route to upstream provider
	return callUpstreamTool(ctx, provider, tool, params.Name, params.Arguments, session)
}

// callUpstreamTool handles tool calls for upstream (external) MCP providers.
func callUpstreamTool(ctx context.Context, provider *model.MCPProvider, tool *model.MCPTool, toolName string, arguments json.RawMessage, session *MCPSession) *JSONRPCResponse {
	client, originalName, found := GlobalUpstreamClients.ResolveProvider(toolName)
	if !found {
		if tool.ProviderID > 0 {
			client = GlobalUpstreamClients.GetByProviderID(tool.ProviderID)
			if client != nil {
				if client.Provider.ToolPrefix != "" {
					prefix := client.Provider.ToolPrefix + "_"
					originalName = strings.TrimPrefix(toolName, prefix)
				} else {
					originalName = toolName
				}
				found = true
			}
		}
	}

	if !found || client == nil {
		return &JSONRPCResponse{
			Error: &JSONRPCError{
				Code:    -32603,
				Message: fmt.Sprintf("no upstream provider configured for tool: %s", toolName),
			},
		}
	}

	if !client.IsConnected() {
		if connectErr := client.Connect(ctx); connectErr != nil {
			return &JSONRPCResponse{
				Error: &JSONRPCError{
					Code:    -32603,
					Message: fmt.Sprintf("upstream provider %s is unavailable: %v", client.Provider.Name, connectErr),
				},
			}
		}
	}

	startTime := time.Now()
	upstreamResp, err := client.CallTool(ctx, originalName, arguments)
	duration := time.Since(startTime).Milliseconds()

	mcpLog := &model.MCPLog{
		ProviderID:   client.Provider.ID,
		ProviderName: client.Provider.Name,
		ToolName:     toolName,
		Duration:     duration,
	}
	if session != nil {
		mcpLog.UserID = session.UserID
		mcpLog.TokenID = session.TokenID
		// Resolve username from DB
		if session.UserID > 0 {
			if user, err := model.GetUserById(session.UserID, false); err == nil {
				mcpLog.UserName = user.Username
			}
		}
	}
	if err != nil {
		mcpLog.ResponseStatus = 500
		mcpLog.ErrorMessage = err.Error()
	} else if upstreamResp.Error != nil {
		mcpLog.ResponseStatus = 500
		mcpLog.ErrorMessage = upstreamResp.Error.Message
	} else {
		mcpLog.ResponseStatus = 200
	}
	_ = model.CreateMCPLog(mcpLog)

	if err != nil {
		return &JSONRPCResponse{
			Error: &JSONRPCError{
				Code:    -32603,
				Message: fmt.Sprintf("upstream tool call failed for %s (via %s): %v", originalName, client.Provider.Name, err),
			},
		}
	}

	if upstreamResp.Error != nil {
		return &JSONRPCResponse{
			Error: upstreamResp.Error,
		}
	}

	return &JSONRPCResponse{
		Result: upstreamResp.Result,
	}
}
