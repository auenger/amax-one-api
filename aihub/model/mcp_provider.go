package model

import (
	"encoding/json"
	"fmt"

	"github.com/yzw/aihub/common/helper"
)

// MCPProvider represents an upstream MCP service provider or a built-in tool provider.
type MCPProvider struct {
	ID            uint   `json:"id" gorm:"primaryKey"`
	Name          string `json:"name" gorm:"uniqueIndex;size:128"`
	DisplayName   string `json:"display_name" gorm:"size:256"`
	Type          string `json:"type" gorm:"size:32;default:upstream"` // "upstream" | "builtin"
	BuiltinConfig string `json:"builtin_config" gorm:"type:text"`      // JSON config for builtin tools
	BaseURL       string `json:"base_url" gorm:"size:512"`
	AuthToken     string `json:"auth_token" gorm:"size:512"`
	Transport     string `json:"transport" gorm:"size:32"` // "sse" | "streamable-http"
	ToolPrefix    string `json:"tool_prefix" gorm:"size:64"`
	Enabled       bool   `json:"enabled" gorm:"default:true"`
	AutoSync      bool   `json:"auto_sync" gorm:"default:true"`
	Group         string `json:"group" gorm:"size:256"`
	LastSyncAt    int64  `json:"last_sync_at" gorm:"bigint"`
	CreatedAt     int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt     int64  `json:"updated_at" gorm:"bigint"`
}

func (MCPProvider) TableName() string {
	return "mcp_providers"
}

// GetMCPProviders returns all MCP providers.
func GetMCPProviders() ([]MCPProvider, error) {
	var providers []MCPProvider
	err := DB.Order("id asc").Find(&providers).Error
	return providers, err
}

// GetEnabledMCPProviders returns all enabled MCP providers.
func GetEnabledMCPProviders() ([]MCPProvider, error) {
	var providers []MCPProvider
	err := DB.Where("enabled = ?", true).Find(&providers).Error
	return providers, err
}

// GetMCPProviderByID returns a single MCP provider by its ID.
func GetMCPProviderByID(id uint) (*MCPProvider, error) {
	var provider MCPProvider
	err := DB.First(&provider, "id = ?", id).Error
	return &provider, err
}

// GetMCPProviderByName returns a single MCP provider by its name.
func GetMCPProviderByName(name string) (*MCPProvider, error) {
	var provider MCPProvider
	err := DB.First(&provider, "name = ?", name).Error
	return &provider, err
}

// CreateMCPProvider creates a new MCP provider record.
func CreateMCPProvider(provider *MCPProvider) error {
	provider.CreatedAt = helper.GetTimestamp()
	provider.UpdatedAt = helper.GetTimestamp()
	return DB.Create(provider).Error
}

// UpdateMCPProvider updates an existing MCP provider record.
func UpdateMCPProvider(provider *MCPProvider) error {
	provider.UpdatedAt = helper.GetTimestamp()
	return DB.Model(provider).Updates(map[string]interface{}{
		"name":           provider.Name,
		"display_name":   provider.DisplayName,
		"type":           provider.Type,
		"builtin_config": provider.BuiltinConfig,
		"base_url":       provider.BaseURL,
		"auth_token":     provider.AuthToken,
		"transport":      provider.Transport,
		"tool_prefix":    provider.ToolPrefix,
		"enabled":        provider.Enabled,
		"auto_sync":      provider.AutoSync,
		"group":          provider.Group,
		"updated_at":     provider.UpdatedAt,
	}).Error
}

// DeleteMCPProvider deletes an MCP provider by ID.
func DeleteMCPProvider(id uint) error {
	return DB.Delete(&MCPProvider{}, "id = ?", id).Error
}

// UpdateMCPProviderSyncAt updates the last_sync_at timestamp.
func UpdateMCPProviderSyncAt(id uint) error {
	return DB.Model(&MCPProvider{}).Where("id = ?", id).Update("last_sync_at", helper.GetTimestamp()).Error
}

// GetMCPToolsByProviderID returns all tools for a given provider.
func GetMCPToolsByProviderID(providerID uint) ([]MCPTool, error) {
	var tools []MCPTool
	err := DB.Where("provider_id = ?", providerID).Find(&tools).Error
	return tools, err
}

// BuiltinProviderConfig represents the configuration for a built-in MCP provider.
type BuiltinProviderConfig struct {
	ToolType     string `json:"tool_type"`     // "vision"
	ChannelID    int    `json:"channel_id"`    // the channel to use for relay
	Model        string `json:"model"`         // the model to call
	SystemPrompt string `json:"system_prompt"` // optional system prompt
	MaxTokens    int    `json:"max_tokens"`    // optional max output tokens
}

// ParseBuiltinConfig parses the BuiltinConfig JSON string.
func (p *MCPProvider) ParseBuiltinConfig() (*BuiltinProviderConfig, error) {
	if p.BuiltinConfig == "" {
		return nil, fmt.Errorf("builtin config is empty")
	}
	var config BuiltinProviderConfig
	if err := json.Unmarshal([]byte(p.BuiltinConfig), &config); err != nil {
		return nil, fmt.Errorf("parse builtin config: %w", err)
	}
	return &config, nil
}

// IsBuiltin returns true if the provider is a built-in tool type.
func (p *MCPProvider) IsBuiltin() bool {
	return p.Type == "builtin"
}

// GetBuiltinMCPProviders returns all enabled built-in MCP providers.
func GetBuiltinMCPProviders() ([]MCPProvider, error) {
	var providers []MCPProvider
	err := DB.Where("enabled = ? AND type = ?", true, "builtin").Find(&providers).Error
	return providers, err
}

// GetUpstreamMCPProviders returns all enabled upstream MCP providers.
func GetUpstreamMCPProviders() ([]MCPProvider, error) {
	var providers []MCPProvider
	err := DB.Where("enabled = ? AND (type = ? OR type = '')", true, "upstream").Find(&providers).Error
	return providers, err
}
