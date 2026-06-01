package mcp

import (
	"context"
	"encoding/json"

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

// handleToolsCall handles a tool invocation. This is a framework stub;
// actual tool execution will be added in feat-mcp-upstream-proxy.
func handleToolsCall(_ context.Context, req *JSONRPCRequest, _ *MCPSession) *JSONRPCResponse {
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
			JSONRPC: "2.0",
			ID:      req.ID,
			Error: &JSONRPCError{
				Code:    -32602,
				Message: "tool not found: " + params.Name,
			},
		}
	}
	if !tool.Enabled {
		return &JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Error: &JSONRPCError{
				Code:    -32602,
				Message: "tool is disabled: " + params.Name,
			},
		}
	}

	// Stub: return a placeholder response
	// Actual upstream dispatching will be implemented in feat-mcp-upstream-proxy
	return &JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result: gin.H{
			"content": []gin.H{
				{
					"type": "text",
					"text": "Tool execution is not yet connected to an upstream provider. This will be available after upstream proxy integration.",
				},
			},
		},
	}
}
