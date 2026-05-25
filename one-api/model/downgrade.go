package model

import (
	"fmt"
	"time"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/logger"
)

// ModelDowngradeRule is DEPRECATED — kept only for AutoMigrate compatibility.
// Downgrade config is now stored directly on Channel (DowngradeThresholdPct, DowngradeTargetModel).
type ModelDowngradeRule struct {
	Id           int    `json:"id" gorm:"primaryKey"`
	ProviderType int    `json:"provider_type" gorm:"uniqueIndex"`
	ThresholdPct int    `json:"threshold_pct" gorm:"default:90"`
	TargetModel  string `json:"target_model" gorm:"type:varchar(128)"`
	Enabled      bool   `json:"enabled" gorm:"default:true"`
	CreatedAt    int64  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    int64  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (ModelDowngradeRule) TableName() string {
	return "model_downgrade_rules"
}

// Redis key patterns for downgrade markers — keyed by channel ID.
const (
	DowngradeRedisKeyPrefix = "channel:downgrade:"
	DowngradeRedisTTL       = 30 * 60 // 30 minutes in seconds
)

// DowngradeRedisKey returns the Redis key for a channel's downgrade marker.
func DowngradeRedisKey(channelId int) string {
	return fmt.Sprintf("%s%d", DowngradeRedisKeyPrefix, channelId)
}

// CheckAndApplyDowngrade checks if a channel has an active downgrade marker in Redis.
// Returns the target model if downgrade is active, empty string otherwise.
func CheckAndApplyDowngrade(channelId int) string {
	if !common.RedisEnabled {
		return ""
	}
	key := DowngradeRedisKey(channelId)
	data, err := common.RedisGet(key)
	if err != nil || data == "" {
		return ""
	}
	return data
}

// SetDowngradeMarker writes a downgrade marker to Redis for a channel.
func SetDowngradeMarker(channelId int, targetModel string) {
	if !common.RedisEnabled {
		return
	}
	key := DowngradeRedisKey(channelId)
	if err := common.RedisSet(key, targetModel, time.Duration(DowngradeRedisTTL)*time.Second); err != nil {
		logger.SysError(fmt.Sprintf("downgrade: failed to set marker for channel %d: %s", channelId, err.Error()))
	}
}

// RemoveDowngradeMarker removes the downgrade marker for a channel.
func RemoveDowngradeMarker(channelId int) {
	if !common.RedisEnabled {
		return
	}
	key := DowngradeRedisKey(channelId)
	if err := common.RedisDel(key); err != nil {
		logger.SysError(fmt.Sprintf("downgrade: failed to remove marker for channel %d: %s", channelId, err.Error()))
	}
}

// DowngradeChannelStatus holds downgrade info for a single channel.
type DowngradeChannelStatus struct {
	ChannelId      int    `json:"channel_id"`
	ChannelName    string `json:"channel_name"`
	ProviderType   int    `json:"provider_type"`
	ThresholdPct   int    `json:"threshold_pct"`
	TargetModel    string `json:"target_model"`
	IsActive       bool   `json:"is_active"`
	ActiveModel    string `json:"active_model,omitempty"`
}

// GetDowngradeStatus returns the downgrade status for all channels with downgrade configured.
func GetDowngradeStatus() ([]DowngradeChannelStatus, error) {
	var channels []Channel
	if err := DB.Where("downgrade_threshold_pct > 0").Find(&channels).Error; err != nil {
		return nil, err
	}

	status := make([]DowngradeChannelStatus, 0, len(channels))
	for _, ch := range channels {
		s := DowngradeChannelStatus{
			ChannelId:    ch.Id,
			ChannelName:  ch.Name,
			ProviderType: ch.Type,
			ThresholdPct: ch.DowngradeThresholdPct,
			TargetModel:  ch.DowngradeTargetModel,
		}
		if common.RedisEnabled {
			if active := CheckAndApplyDowngrade(ch.Id); active != "" {
				s.IsActive = true
				s.ActiveModel = active
			}
		}
		status = append(status, s)
	}
	return status, nil
}

// MigrateDowngradeRulesToChannels performs a one-time migration from the deprecated
// model_downgrade_rules table to per-channel fields. Safe to call on every startup.
func MigrateDowngradeRulesToChannels() {
	// Check if old table exists
	if !DB.Migrator().HasTable(&ModelDowngradeRule{}) {
		return
	}

	var rules []ModelDowngradeRule
	if err := DB.Where("enabled = ?", true).Find(&rules).Error; err != nil {
		logger.SysError(fmt.Sprintf("downgrade-migration: failed to read old rules: %s", err.Error()))
		return
	}
	if len(rules) == 0 {
		return
	}

	for _, rule := range rules {
		result := DB.Model(&Channel{}).
			Where("type = ? AND downgrade_threshold_pct = 0", rule.ProviderType).
			Updates(map[string]interface{}{
				"downgrade_threshold_pct": rule.ThresholdPct,
				"downgrade_target_model":  rule.TargetModel,
			})
		if result.RowsAffected > 0 {
			logger.SysLog(fmt.Sprintf("downgrade-migration: migrated rule for provider %d to %d channels",
				rule.ProviderType, result.RowsAffected))
		}
		if result.Error != nil {
			logger.SysError(fmt.Sprintf("downgrade-migration: failed to migrate provider %d: %s",
				rule.ProviderType, result.Error.Error()))
		}
	}

	// Clean up old markers that use provider-type keys
	if common.RedisEnabled {
		for _, rule := range rules {
			oldKey := fmt.Sprintf("%s%d", DowngradeRedisKeyPrefix, rule.ProviderType)
			_ = common.RedisDel(oldKey)
		}
	}

	logger.SysLog(fmt.Sprintf("downgrade-migration: completed, processed %d rules", len(rules)))
}
