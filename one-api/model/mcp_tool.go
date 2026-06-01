package model

import "github.com/songquanpeng/one-api/common/helper"

// MCPTool represents a tool exposed via the MCP protocol.
type MCPTool struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"uniqueIndex;size:128"`
	DisplayName string `json:"display_name" gorm:"size:256"`
	ProviderID  uint   `json:"provider_id" gorm:"index"`
	Description string `json:"description" gorm:"type:text"`
	InputSchema string `json:"input_schema" gorm:"type:text"`
	Enabled     bool   `json:"enabled" gorm:"default:true"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt   int64  `json:"updated_at" gorm:"bigint"`
}

func (MCPTool) TableName() string {
	return "mcp_tools"
}

// GetMCPTools returns all enabled MCP tools.
func GetMCPTools() ([]MCPTool, error) {
	var tools []MCPTool
	err := DB.Where("enabled = ?", true).Find(&tools).Error
	return tools, err
}

// GetAllMCPTools returns all MCP tools (including disabled).
func GetAllMCPTools() ([]MCPTool, error) {
	var tools []MCPTool
	err := DB.Order("id asc").Find(&tools).Error
	return tools, err
}

// GetMCPToolByID returns a single MCP tool by its ID.
func GetMCPToolByID(id uint) (*MCPTool, error) {
	var tool MCPTool
	err := DB.First(&tool, "id = ?", id).Error
	return &tool, err
}

// GetMCPToolByName returns a single MCP tool by its name.
func GetMCPToolByName(name string) (*MCPTool, error) {
	var tool MCPTool
	err := DB.First(&tool, "name = ?", name).Error
	return &tool, err
}

// CreateMCPTool creates a new MCP tool record.
func CreateMCPTool(tool *MCPTool) error {
	tool.CreatedAt = helper.GetTimestamp()
	tool.UpdatedAt = helper.GetTimestamp()
	return DB.Create(tool).Error
}

// UpdateMCPTool updates an existing MCP tool record.
func UpdateMCPTool(tool *MCPTool) error {
	tool.UpdatedAt = helper.GetTimestamp()
	return DB.Model(tool).Updates(map[string]interface{}{
		"name":         tool.Name,
		"display_name": tool.DisplayName,
		"provider_id":  tool.ProviderID,
		"description":  tool.Description,
		"input_schema": tool.InputSchema,
		"enabled":      tool.Enabled,
		"updated_at":   tool.UpdatedAt,
	}).Error
}

// DeleteMCPTool deletes an MCP tool by ID.
func DeleteMCPTool(id uint) error {
	return DB.Delete(&MCPTool{}, "id = ?", id).Error
}
