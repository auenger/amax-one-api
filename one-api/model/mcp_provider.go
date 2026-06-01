package model

import "github.com/songquanpeng/one-api/common/helper"

// MCPProvider represents an upstream MCP service provider.
type MCPProvider struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"uniqueIndex;size:128"`
	DisplayName string `json:"display_name" gorm:"size:256"`
	BaseURL     string `json:"base_url" gorm:"size:512"`
	AuthToken   string `json:"auth_token" gorm:"size:512"`
	Transport   string `json:"transport" gorm:"size:32"` // "sse" | "streamable-http"
	ToolPrefix  string `json:"tool_prefix" gorm:"size:64"`
	Enabled     bool   `json:"enabled" gorm:"default:true"`
	AutoSync    bool   `json:"auto_sync" gorm:"default:true"`
	Group       string `json:"group" gorm:"size:256"`
	LastSyncAt  int64  `json:"last_sync_at" gorm:"bigint"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt   int64  `json:"updated_at" gorm:"bigint"`
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
		"name":         provider.Name,
		"display_name": provider.DisplayName,
		"base_url":     provider.BaseURL,
		"auth_token":   provider.AuthToken,
		"transport":    provider.Transport,
		"tool_prefix":  provider.ToolPrefix,
		"enabled":      provider.Enabled,
		"auto_sync":    provider.AutoSync,
		"group":        provider.Group,
		"updated_at":   provider.UpdatedAt,
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
