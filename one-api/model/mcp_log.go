package model

import "github.com/songquanpeng/one-api/common/helper"

// MCPLog represents a log entry for an MCP tool invocation.
type MCPLog struct {
	ID             uint   `json:"id" gorm:"primaryKey"`
	ProviderID     uint   `json:"provider_id" gorm:"index"`
	ProviderName   string `json:"provider_name" gorm:"size:128"`
	ToolName       string `json:"tool_name" gorm:"size:128;index"`
	ResponseStatus int    `json:"response_status"` // HTTP-like status: 200=success, 500=error
	Duration       int64  `json:"duration"`        // milliseconds
	ErrorMessage   string `json:"error_message" gorm:"type:text"`
	CreatedAt      int64  `json:"created_at" gorm:"bigint;index"`
}

func (MCPLog) TableName() string {
	return "mcp_logs"
}

// CreateMCPLog creates a new MCP log entry.
func CreateMCPLog(log *MCPLog) error {
	log.CreatedAt = helper.GetTimestamp()
	return DB.Create(log).Error
}

// GetMCPLogsByProvider returns logs for a specific provider.
func GetMCPLogsByProvider(providerID uint, startTimestamp, endTimestamp int64) ([]MCPLog, error) {
	var logs []MCPLog
	query := DB.Where("provider_id = ?", providerID)
	if startTimestamp > 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp > 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}
	err := query.Order("id desc").Limit(1000).Find(&logs).Error
	return logs, err
}

// GetMCPLogsByTimeRange returns logs within a time range.
func GetMCPLogsByTimeRange(startTimestamp, endTimestamp int64) ([]MCPLog, error) {
	var logs []MCPLog
	query := DB.Model(&MCPLog{})
	if startTimestamp > 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp > 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}
	err := query.Order("id desc").Limit(1000).Find(&logs).Error
	return logs, err
}

// MCPProviderStats holds aggregated stats for a provider.
type MCPProviderStats struct {
	ProviderID     uint   `json:"provider_id"`
	ProviderName   string `json:"provider_name"`
	TotalCalls     int64  `json:"total_calls"`
	SuccessCalls   int64  `json:"success_calls"`
	FailedCalls    int64  `json:"failed_calls"`
	AvgDuration    float64 `json:"avg_duration"`    // ms
	LastCalledAt   int64   `json:"last_called_at"`
}

// MCPToolStats holds aggregated stats for a tool.
type MCPToolStats struct {
	ToolName     string  `json:"tool_name"`
	TotalCalls   int64   `json:"total_calls"`
	SuccessCalls int64   `json:"success_calls"`
	FailedCalls  int64   `json:"failed_calls"`
	AvgDuration  float64 `json:"avg_duration"`
}

// GetMCPProviderStats returns aggregated stats grouped by provider.
func GetMCPProviderStats(startTimestamp, endTimestamp int64) ([]MCPProviderStats, error) {
	var stats []MCPProviderStats
	query := DB.Model(&MCPLog{}).
		Select("provider_id, provider_name, count(*) as total_calls, "+
			"sum(case when response_status = 200 then 1 else 0 end) as success_calls, "+
			"sum(case when response_status != 200 then 1 else 0 end) as failed_calls, "+
			"coalesce(avg(duration), 0) as avg_duration, "+
			"max(created_at) as last_called_at").
		Group("provider_id, provider_name")

	if startTimestamp > 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp > 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}

	err := query.Find(&stats).Error
	return stats, err
}

// GetMCPToolStats returns aggregated stats grouped by tool name.
func GetMCPToolStats(startTimestamp, endTimestamp int64) ([]MCPToolStats, error) {
	var stats []MCPToolStats
	query := DB.Model(&MCPLog{}).
		Select("tool_name, count(*) as total_calls, "+
			"sum(case when response_status = 200 then 1 else 0 end) as success_calls, "+
			"sum(case when response_status != 200 then 1 else 0 end) as failed_calls, "+
			"coalesce(avg(duration), 0) as avg_duration").
		Group("tool_name")

	if startTimestamp > 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp > 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}

	err := query.Find(&stats).Error
	return stats, err
}
