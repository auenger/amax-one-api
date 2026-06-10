package model

import (
	"strings"
	"sync"

	"github.com/yzw/aihub/common/helper"
)

// ModelMeta stores per-model metadata such as multimodal capability.
type ModelMeta struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	ModelName  string `json:"model_name" gorm:"uniqueIndex;size:128;not null"`
	Multimodal bool   `json:"multimodal" gorm:"default:false"`
	CreatedAt  int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt  int64  `json:"updated_at" gorm:"bigint"`
}

func (ModelMeta) TableName() string {
	return "model_metas"
}

// multimodalKeywords is used for initial seeding and as fallback detection.
var multimodalKeywords = []string{
	"vision", "gpt-4o", "gpt-4-turbo", "claude-3",
	"gemini", "qwen-vl", "glm-4v",
}

// multimodalCache caches the multimodal model name set in memory.
var (
	multimodalCache     map[string]bool
	multimodalCacheLock sync.RWMutex
)

// GetModelMetas returns all model metadata records.
func GetModelMetas() ([]ModelMeta, error) {
	var metas []ModelMeta
	err := DB.Order("model_name asc").Find(&metas).Error
	return metas, err
}

// GetMultimodalModelNames returns a set of model names marked as multimodal.
// Uses an in-memory cache to avoid repeated DB queries.
func GetMultimodalModelNames() (map[string]bool, error) {
	multimodalCacheLock.RLock()
	if multimodalCache != nil {
		result := multimodalCache
		multimodalCacheLock.RUnlock()
		return result, nil
	}
	multimodalCacheLock.RUnlock()

	var metas []ModelMeta
	err := DB.Where("multimodal = ?", true).Find(&metas).Error
	if err != nil {
		return nil, err
	}

	result := make(map[string]bool, len(metas))
	for _, m := range metas {
		result[m.ModelName] = true
	}

	multimodalCacheLock.Lock()
	multimodalCache = result
	multimodalCacheLock.Unlock()

	return result, nil
}

// InvalidateMultimodalCache clears the in-memory cache.
func InvalidateMultimodalCache() {
	multimodalCacheLock.Lock()
	multimodalCache = nil
	multimodalCacheLock.Unlock()
}

// UpsertModelMeta creates or updates a model metadata record.
func UpsertModelMeta(meta *ModelMeta) error {
	meta.ModelName = strings.ToLower(strings.TrimSpace(meta.ModelName))
	meta.UpdatedAt = helper.GetTimestamp()

	var existing ModelMeta
	err := DB.Where("model_name = ?", meta.ModelName).First(&existing).Error
	if err != nil {
		// Record doesn't exist, create it
		meta.CreatedAt = helper.GetTimestamp()
		return DB.Create(meta).Error
	}

	// Update existing record
	return DB.Model(&existing).Updates(map[string]interface{}{
		"multimodal": meta.Multimodal,
		"updated_at": meta.UpdatedAt,
	}).Error
}

// BatchUpsertModelMetas creates multiple model metadata records in a transaction.
func BatchUpsertModelMetas(metas []ModelMeta) error {
	if len(metas) == 0 {
		return nil
	}
	tx := DB.Begin()
	for i := range metas {
		metas[i].ModelName = strings.ToLower(strings.TrimSpace(metas[i].ModelName))
		if metas[i].ModelName == "" {
			continue
		}
		var existing ModelMeta
		err := tx.Where("model_name = ?", metas[i].ModelName).First(&existing).Error
		if err != nil {
			// Create new
			metas[i].CreatedAt = helper.GetTimestamp()
			metas[i].UpdatedAt = helper.GetTimestamp()
			if err := tx.Create(&metas[i]).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
		// Existing records are left unchanged during batch seed
	}
	return tx.Commit().Error
}

// IsMultimodalByKeywords checks if a model name matches known multimodal patterns.
func IsMultimodalByKeywords(modelName string) bool {
	mLower := strings.ToLower(modelName)
	for _, kw := range multimodalKeywords {
		if strings.Contains(mLower, kw) {
			return true
		}
	}
	return false
}

// SeedModelMetasIfNeeded populates the model_metas table on first run.
func SeedModelMetasIfNeeded() {
	var count int64
	DB.Model(&ModelMeta{}).Count(&count)
	if count > 0 {
		return
	}

	channels, err := GetAllChannels(0, 0, "all")
	if err != nil {
		return
	}

	seen := make(map[string]bool)
	var metas []ModelMeta
	for _, ch := range channels {
		for _, m := range strings.Split(ch.Models, ",") {
			m = strings.ToLower(strings.TrimSpace(m))
			if m == "" || seen[m] {
				continue
			}
			seen[m] = true
			metas = append(metas, ModelMeta{
				ModelName:  m,
				Multimodal: IsMultimodalByKeywords(m),
			})
		}
	}

	_ = BatchUpsertModelMetas(metas)
	InvalidateMultimodalCache()
}

// ScanNewModels scans all channels and creates ModelMeta records for models
// not yet in the table. Returns the total number of channel models and new count.
func ScanNewModels() (int, int, error) {
	channels, err := GetAllChannels(0, 0, "all")
	if err != nil {
		return 0, 0, err
	}

	// Get existing model names
	var existing []ModelMeta
	DB.Find(&existing)
	existingSet := make(map[string]bool, len(existing))
	for _, m := range existing {
		existingSet[m.ModelName] = true
	}

	seen := make(map[string]bool)
	var newMetas []ModelMeta
	for _, ch := range channels {
		for _, m := range strings.Split(ch.Models, ",") {
			m = strings.ToLower(strings.TrimSpace(m))
			if m == "" || seen[m] {
				continue
			}
			seen[m] = true
			if existingSet[m] {
				continue
			}
			newMetas = append(newMetas, ModelMeta{
				ModelName:  m,
				Multimodal: IsMultimodalByKeywords(m),
			})
		}
	}

	if len(newMetas) > 0 {
		if err := BatchUpsertModelMetas(newMetas); err != nil {
			return 0, 0, err
		}
		InvalidateMultimodalCache()
	}

	return len(seen), len(newMetas), nil
}
