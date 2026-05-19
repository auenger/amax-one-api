package monitor

import (
	"context"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/songquanpeng/one-api/common"
)

// ────────────────────────────────────────────────────────────
// Concurrency Tracking — per channel+model dimension
// ────────────────────────────────────────────────────────────

const (
	// concurrencyKeyPrefix is the Redis key prefix for concurrency counters.
	// Full key format: channel:concurrency:{channelId}:{model}
	concurrencyKeyPrefix = "channel:concurrency:"

	// concurrencyKeyTTL prevents stale keys from accumulating.
	// Each Incr/Decr resets the TTL to this value.
	concurrencyKeyTTL = 10 * time.Minute

	// userConcurrencyCacheTTL is the short-lived cache TTL for user-facing API responses.
	userConcurrencyCacheTTL = 5 * time.Second
)

// ConcurrencyEntry represents the concurrency count for a single channel+model pair.
type ConcurrencyEntry struct {
	ChannelID   int    `json:"channel_id"`
	ChannelName string `json:"channel_name,omitempty"`
	Model       string `json:"model"`
	Count       int64  `json:"count"`
}

// ConcurrencyResponse is the API response for concurrency queries.
type ConcurrencyResponse struct {
	Success bool               `json:"success"`
	Message string             `json:"message,omitempty"`
	Data    []ConcurrencyEntry `json:"data,omitempty"`
}

// UserConcurrencyEntry represents concurrency info for a single model (user-facing).
type UserConcurrencyEntry struct {
	Model string              `json:"model"`
	Items []ConcurrencyDetail `json:"items"`
}

// ConcurrencyDetail shows per-channel concurrency for a model.
type ConcurrencyDetail struct {
	ChannelID   int    `json:"channel_id"`
	ChannelName string `json:"channel_name,omitempty"`
	Count       int64  `json:"count"`
}

// ChannelRef is a lightweight reference to a channel (id + name).
type ChannelRef struct {
	Id   int
	Name string
}

// concurrencyCache caches the user-facing concurrency response per group.
var (
	userConcurrencyCache   = make(map[string]*userCacheEntry)
	userConcurrencyCacheMu sync.RWMutex
)

type userCacheEntry struct {
	data      []UserConcurrencyEntry
	expiresAt time.Time
}

// IncrConcurrency atomically increments the concurrency counter for a channel+model.
func IncrConcurrency(channelId int, model string) {
	if !common.RedisEnabled || common.RDB == nil {
		return
	}
	ctx := context.Background()
	key := fmt.Sprintf("%s%d:%s", concurrencyKeyPrefix, channelId, model)
	common.RDB.Incr(ctx, key)
	common.RDB.Expire(ctx, key, concurrencyKeyTTL)
}

// DecrConcurrency atomically decrements the concurrency counter for a channel+model.
// It ensures the counter never goes below 0.
func DecrConcurrency(channelId int, model string) {
	if !common.RedisEnabled || common.RDB == nil {
		return
	}
	ctx := context.Background()
	key := fmt.Sprintf("%s%d:%s", concurrencyKeyPrefix, channelId, model)
	// Decr and clamp to >= 0
	val, err := common.RDB.Decr(ctx, key).Result()
	if err != nil {
		return
	}
	if val < 0 {
		// Reset to 0 if it went negative (e.g., due to crash recovery)
		common.RDB.Set(ctx, key, 0, concurrencyKeyTTL)
	}
	common.RDB.Expire(ctx, key, concurrencyKeyTTL)
}

// GetConcurrency returns the current concurrency count for a specific channel+model.
func GetConcurrency(channelId int, model string) int64 {
	if !common.RedisEnabled || common.RDB == nil {
		return 0
	}
	ctx := context.Background()
	key := fmt.Sprintf("%s%d:%s", concurrencyKeyPrefix, channelId, model)
	val, err := common.RDB.Get(ctx, key).Int64()
	if err != nil {
		return 0
	}
	return val
}

// GetAllConcurrency returns all concurrency entries by scanning Redis keys.
func GetAllConcurrency() []ConcurrencyEntry {
	if !common.RedisEnabled || common.RDB == nil {
		return nil
	}
	ctx := context.Background()
	var cursor uint64
	var entries []ConcurrencyEntry

	for {
		keys, nextCursor, err := common.RDB.Scan(ctx, cursor, concurrencyKeyPrefix+"*", 100).Result()
		if err != nil {
			break
		}
		for _, key := range keys {
			entry := parseConcurrencyKey(key)
			if entry == nil {
				continue
			}
			val, err := common.RDB.Get(ctx, key).Int64()
			if err != nil || val <= 0 {
				continue
			}
			entry.Count = val
			entries = append(entries, *entry)
		}
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
	if entries == nil {
		entries = []ConcurrencyEntry{}
	}
	return entries
}

// GetUserConcurrency returns cached concurrency data for a user group.
// modelChannels maps model name -> list of channels (as ChannelRef).
// The result is cached for 5 seconds to reduce Redis pressure.
func GetUserConcurrency(group string, modelChannels map[string][]ChannelRef) []UserConcurrencyEntry {
	// Check cache
	userConcurrencyCacheMu.RLock()
	if cached, ok := userConcurrencyCache[group]; ok && time.Now().Before(cached.expiresAt) {
		userConcurrencyCacheMu.RUnlock()
		return cached.data
	}
	userConcurrencyCacheMu.RUnlock()

	// Build result from all Redis concurrency data
	allEntries := GetAllConcurrency()
	entryMap := make(map[string]map[int]int64) // model -> channelId -> count
	for _, e := range allEntries {
		if _, ok := entryMap[e.Model]; !ok {
			entryMap[e.Model] = make(map[int]int64)
		}
		entryMap[e.Model][e.ChannelID] = e.Count
	}

	result := make([]UserConcurrencyEntry, 0, len(modelChannels))
	for model, channels := range modelChannels {
		entry := UserConcurrencyEntry{
			Model: model,
			Items: make([]ConcurrencyDetail, 0, len(channels)),
		}
		for _, ch := range channels {
			count := int64(0)
			if m, ok := entryMap[model]; ok {
				count = m[ch.Id]
			}
			entry.Items = append(entry.Items, ConcurrencyDetail{
				ChannelID:   ch.Id,
				ChannelName: ch.Name,
				Count:       count,
			})
		}
		result = append(result, entry)
	}

	// Update cache
	userConcurrencyCacheMu.Lock()
	userConcurrencyCache[group] = &userCacheEntry{
		data:      result,
		expiresAt: time.Now().Add(userConcurrencyCacheTTL),
	}
	userConcurrencyCacheMu.Unlock()

	return result
}

// parseConcurrencyKey extracts channelId and model from a Redis key.
// Key format: channel:concurrency:{channelId}:{model}
func parseConcurrencyKey(key string) *ConcurrencyEntry {
	prefix := concurrencyKeyPrefix
	if len(key) <= len(prefix) {
		return nil
	}
	remainder := key[len(prefix):]
	// Split on the first colon to separate channelId from model
	for i, ch := range remainder {
		if ch == ':' {
			channelIdStr := remainder[:i]
			model := remainder[i+1:]
			channelId, err := strconv.Atoi(channelIdStr)
			if err != nil {
				return nil
			}
			return &ConcurrencyEntry{
				ChannelID: channelId,
				Model:     model,
			}
		}
	}
	return nil
}
