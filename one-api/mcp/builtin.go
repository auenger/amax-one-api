package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
)

// BuiltinToolConfig defines the input schema for the vision_analyze tool.
var visionAnalyzeInputSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"image": map[string]interface{}{
			"type":        "string",
			"description": "Image URL or base64 encoded image data (data:image/...;base64,...)",
		},
		"prompt": map[string]interface{}{
			"type":        "string",
			"description": "The prompt describing what you want to know about the image",
		},
	},
	"required": []string{"image", "prompt"},
}

// VisionRelayFunc is set during initialization to avoid circular dependencies.
// It makes an internal relay call to process a vision request through a specific channel.
var VisionRelayFunc func(ctx context.Context, channelID int, modelName string, systemPrompt string, maxTokens int, image string, prompt string) (string, error)

// RegisterBuiltinTools creates the built-in tools for a builtin provider.
func RegisterBuiltinTools(provider *model.MCPProvider) error {
	config, err := provider.ParseBuiltinConfig()
	if err != nil {
		return fmt.Errorf("parse builtin config: %w", err)
	}

	prefix := provider.ToolPrefix
	toolName := prefix + "_vision_analyze"
	if prefix == "" {
		toolName = "vision_analyze"
	}

	schemaJSON, _ := json.Marshal(visionAnalyzeInputSchema)

	tool := &model.MCPTool{
		Name:        toolName,
		DisplayName: "Vision Analyze (" + config.Model + ")",
		ProviderID:  provider.ID,
		Description: "Analyze an image using the " + config.Model + " multimodal model. Provide an image (URL or base64) and a prompt describing what you want to know.",
		InputSchema: string(schemaJSON),
		Enabled:     true,
	}

	existing, err := model.GetMCPToolByName(toolName)
	if err == nil && existing != nil {
		existing.DisplayName = tool.DisplayName
		existing.Description = tool.Description
		existing.InputSchema = tool.InputSchema
		existing.ProviderID = tool.ProviderID
		existing.Enabled = true
		return model.UpdateMCPTool(existing)
	}

	return model.CreateMCPTool(tool)
}

// UnregisterBuiltinTools removes the built-in tools for a builtin provider.
func UnregisterBuiltinTools(provider *model.MCPProvider) {
	tools, err := model.GetMCPToolsByProviderID(provider.ID)
	if err != nil {
		return
	}
	for _, tool := range tools {
		_ = model.DeleteMCPTool(tool.ID)
	}
}

// callBuiltinTool handles a builtin tool invocation by making an internal relay
// call to the configured channel+model.
func callBuiltinTool(ctx context.Context, provider *model.MCPProvider, arguments json.RawMessage) *JSONRPCResponse {
	config, err := provider.ParseBuiltinConfig()
	if err != nil {
		return builtinError(fmt.Sprintf("invalid builtin config: %v", err))
	}

	var args struct {
		Image  string `json:"image"`
		Prompt string `json:"prompt"`
	}
	if err := json.Unmarshal(arguments, &args); err != nil {
		return builtinError(fmt.Sprintf("invalid arguments: %v", err))
	}
	if args.Image == "" || args.Prompt == "" {
		return builtinError("image and prompt are required")
	}

	// Validate channel availability
	channel, err := model.GetChannelById(config.ChannelID, true)
	if err != nil {
		return builtinError(fmt.Sprintf("channel %d not found", config.ChannelID))
	}
	if channel.Status != model.ChannelStatusEnabled {
		return builtinError(fmt.Sprintf("channel %d (%s) is disabled", channel.Id, channel.Name))
	}

	if VisionRelayFunc == nil {
		return builtinError("vision relay not initialized")
	}

	startTime := time.Now()
	result, callErr := VisionRelayFunc(ctx, config.ChannelID, config.Model, config.SystemPrompt, config.MaxTokens, args.Image, args.Prompt)
	duration := time.Since(startTime).Milliseconds()

	// Log the invocation
	mcpLog := &model.MCPLog{
		ProviderID:   provider.ID,
		ProviderName: provider.Name,
		ToolName:     buildToolName(provider),
		Duration:     duration,
	}
	if callErr != nil {
		mcpLog.ResponseStatus = 500
		mcpLog.ErrorMessage = callErr.Error()
	} else {
		mcpLog.ResponseStatus = 200
	}
	_ = model.CreateMCPLog(mcpLog)

	if callErr != nil {
		return builtinError(fmt.Sprintf("vision analysis failed: %v", callErr))
	}

	return &JSONRPCResponse{
		Result: map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": result,
				},
			},
		},
	}
}

// buildToolName constructs the full tool name for a builtin provider.
func buildToolName(provider *model.MCPProvider) string {
	prefix := provider.ToolPrefix
	if prefix == "" {
		return "vision_analyze"
	}
	return prefix + "_vision_analyze"
}

// builtinError creates a JSON-RPC error response for builtin tool failures.
func builtinError(message string) *JSONRPCResponse {
	return &JSONRPCResponse{
		Error: &JSONRPCError{
			Code:    -32603,
			Message: message,
		},
	}
}

// InitBuiltinProviders loads all enabled builtin providers and registers their tools.
func InitBuiltinProviders() {
	providers, err := model.GetBuiltinMCPProviders()
	if err != nil {
		logger.SysError("MCP builtin: failed to load providers: " + err.Error())
		return
	}

	for i := range providers {
		provider := providers[i]
		if err := RegisterBuiltinTools(&provider); err != nil {
			logger.SysError(fmt.Sprintf("MCP builtin: failed to register tools for %s: %v", provider.Name, err))
		} else {
			logger.SysLog(fmt.Sprintf("MCP builtin: registered tools for provider %s", provider.Name))
		}
	}

	logger.SysLog(fmt.Sprintf("MCP builtin: initialized %d builtin providers", len(providers)))
}
