package model

import (
	"fmt"
	"time"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/logger"
)

// ModelDowngradeRule defines a rule that triggers model downgrade
// when a provider's quota usage reaches the configured threshold.
type ModelDowngradeRule struct {
	Id           int    `json:"id" gorm:"primaryKey"`
	ProviderType int    `json:"provider_type" gorm:"uniqueIndex"` // Channel.Type (provider type)
	ThresholdPct int    `json:"threshold_pct" gorm:"default:90"`  // Trigger threshold (0-100)
	TargetModel  string `json:"target_model" gorm:"type:varchar(128)"`
	Enabled      bool   `json:"enabled" gorm:"default:true"`
	CreatedAt    int64  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    int64  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (ModelDowngradeRule) TableName() string {
	return "model_downgrade_rules"
}

// Redis key patterns for downgrade markers.
const (
	DowngradeRedisKeyPrefix = "channel:downgrade:"
	DowngradeRedisTTL       = 30 * 60 // 30 minutes in seconds
)

// DowngradeRedisKey returns the Redis key for a provider type's downgrade marker.
func DowngradeRedisKey(providerType int) string {
	return fmt.Sprintf("%s%d", DowngradeRedisKeyPrefix, providerType)
}

// GetDowngradeRules returns all downgrade rules.
func GetDowngradeRules() ([]ModelDowngradeRule, error) {
	var rules []ModelDowngradeRule
	err := DB.Order("id asc").Find(&rules).Error
	return rules, err
}

// GetEnabledDowngradeRules returns only enabled downgrade rules.
func GetEnabledDowngradeRules() ([]ModelDowngradeRule, error) {
	var rules []ModelDowngradeRule
	err := DB.Where("enabled = ?", true).Find(&rules).Error
	return rules, err
}

// GetDowngradeRuleByProvider returns the downgrade rule for a specific provider type.
func GetDowngradeRuleByProvider(providerType int) (*ModelDowngradeRule, error) {
	var rule ModelDowngradeRule
	err := DB.Where("provider_type = ? AND enabled = ?", providerType, true).First(&rule).Error
	if err != nil {
		return nil, err
	}
	return &rule, nil
}

// CreateDowngradeRule creates a new downgrade rule.
func CreateDowngradeRule(rule *ModelDowngradeRule) error {
	rule.CreatedAt = time.Now().Unix()
	rule.UpdatedAt = time.Now().Unix()
	return DB.Create(rule).Error
}

// UpdateDowngradeRule updates an existing downgrade rule.
func UpdateDowngradeRule(rule *ModelDowngradeRule) error {
	rule.UpdatedAt = time.Now().Unix()
	return DB.Save(rule).Error
}

// DeleteDowngradeRule deletes a downgrade rule by ID.
func DeleteDowngradeRule(id int) error {
	return DB.Delete(&ModelDowngradeRule{}, id).Error
}

// GetDowngradeStatus returns the current downgrade status for all providers.
// It reads the Redis markers to determine which providers are currently downgraded.
func GetDowngradeStatus() (map[int]string, error) {
	rules, err := GetDowngradeRules()
	if err != nil {
		return nil, err
	}

	status := make(map[int]string)
	if !common.RedisEnabled {
		return status, nil
	}

	for _, rule := range rules {
		key := DowngradeRedisKey(rule.ProviderType)
		data, err := common.RedisGet(key)
		if err == nil && data != "" {
			status[rule.ProviderType] = data
		}
	}
	return status, nil
}

// CheckAndApplyDowngrade checks if a provider type has an active downgrade marker in Redis.
// Returns the target model if downgrade is active, empty string otherwise.
func CheckAndApplyDowngrade(providerType int) string {
	if !common.RedisEnabled {
		return ""
	}
	key := DowngradeRedisKey(providerType)
	data, err := common.RedisGet(key)
	if err != nil || data == "" {
		return ""
	}
	return data
}

// SetDowngradeMarker writes a downgrade marker to Redis for a provider type.
func SetDowngradeMarker(providerType int, targetModel string) {
	if !common.RedisEnabled {
		return
	}
	key := DowngradeRedisKey(providerType)
	if err := common.RedisSet(key, targetModel, time.Duration(DowngradeRedisTTL)*time.Second); err != nil {
		logger.SysError(fmt.Sprintf("downgrade: failed to set marker for provider %d: %s", providerType, err.Error()))
	}
}

// RemoveDowngradeMarker removes the downgrade marker for a provider type.
func RemoveDowngradeMarker(providerType int) {
	if !common.RedisEnabled {
		return
	}
	key := DowngradeRedisKey(providerType)
	if err := common.RedisDel(key); err != nil {
		logger.SysError(fmt.Sprintf("downgrade: failed to remove marker for provider %d: %s", providerType, err.Error()))
	}
}
