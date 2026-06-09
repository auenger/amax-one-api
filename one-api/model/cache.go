package model

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/yzw/aihub/common"
	"github.com/yzw/aihub/common/config"
	"github.com/yzw/aihub/common/logger"
	"math/rand"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	TokenCacheSeconds         = config.SyncFrequency
	UserId2GroupCacheSeconds  = config.SyncFrequency
	UserId2QuotaCacheSeconds  = config.SyncFrequency
	UserId2StatusCacheSeconds = config.SyncFrequency
	GroupModelsCacheSeconds   = config.SyncFrequency
)

func CacheGetTokenByKey(key string) (*Token, error) {
	keyCol := "`key`"
	if common.UsingPostgreSQL {
		keyCol = `"key"`
	}
	var token Token
	if !common.RedisEnabled {
		err := DB.Where(keyCol+" = ?", key).First(&token).Error
		return &token, err
	}
	tokenObjectString, err := common.RedisGet(fmt.Sprintf("token:%s", key))
	if err != nil {
		err := DB.Where(keyCol+" = ?", key).First(&token).Error
		if err != nil {
			return nil, err
		}
		jsonBytes, err := json.Marshal(token)
		if err != nil {
			return nil, err
		}
		err = common.RedisSet(fmt.Sprintf("token:%s", key), string(jsonBytes), time.Duration(TokenCacheSeconds)*time.Second)
		if err != nil {
			logger.SysError("Redis set token error: " + err.Error())
		}
		return &token, nil
	}
	err = json.Unmarshal([]byte(tokenObjectString), &token)
	return &token, err
}

func CacheGetUserGroup(id int) (group string, err error) {
	if !common.RedisEnabled {
		return GetUserGroup(id)
	}
	group, err = common.RedisGet(fmt.Sprintf("user_group:%d", id))
	if err != nil {
		group, err = GetUserGroup(id)
		if err != nil {
			return "", err
		}
		err = common.RedisSet(fmt.Sprintf("user_group:%d", id), group, time.Duration(UserId2GroupCacheSeconds)*time.Second)
		if err != nil {
			logger.SysError("Redis set user group error: " + err.Error())
		}
	}
	return group, err
}

func fetchAndUpdateUserQuota(ctx context.Context, id int) (quota int64, err error) {
	quota, err = GetUserQuota(id)
	if err != nil {
		return 0, err
	}
	err = common.RedisSet(fmt.Sprintf("user_quota:%d", id), fmt.Sprintf("%d", quota), time.Duration(UserId2QuotaCacheSeconds)*time.Second)
	if err != nil {
		logger.Error(ctx, "Redis set user quota error: "+err.Error())
	}
	return
}

func CacheGetUserQuota(ctx context.Context, id int) (quota int64, err error) {
	if !common.RedisEnabled {
		return GetUserQuota(id)
	}
	quotaString, err := common.RedisGet(fmt.Sprintf("user_quota:%d", id))
	if err != nil {
		return fetchAndUpdateUserQuota(ctx, id)
	}
	quota, err = strconv.ParseInt(quotaString, 10, 64)
	if err != nil {
		return 0, nil
	}
	if quota <= config.PreConsumedQuota { // when user's quota is less than pre-consumed quota, we need to fetch from db
		logger.Infof(ctx, "user %d's cached quota is too low: %d, refreshing from db", quota, id)
		return fetchAndUpdateUserQuota(ctx, id)
	}
	return quota, nil
}

func CacheUpdateUserQuota(ctx context.Context, id int) error {
	if !common.RedisEnabled {
		return nil
	}
	quota, err := CacheGetUserQuota(ctx, id)
	if err != nil {
		return err
	}
	err = common.RedisSet(fmt.Sprintf("user_quota:%d", id), fmt.Sprintf("%d", quota), time.Duration(UserId2QuotaCacheSeconds)*time.Second)
	return err
}

func CacheDecreaseUserQuota(id int, quota int64) error {
	if !common.RedisEnabled {
		return nil
	}
	err := common.RedisDecrease(fmt.Sprintf("user_quota:%d", id), int64(quota))
	return err
}

func CacheIsUserEnabled(userId int) (bool, error) {
	if !common.RedisEnabled {
		return IsUserEnabled(userId)
	}
	enabled, err := common.RedisGet(fmt.Sprintf("user_enabled:%d", userId))
	if err == nil {
		return enabled == "1", nil
	}

	userEnabled, err := IsUserEnabled(userId)
	if err != nil {
		return false, err
	}
	enabled = "0"
	if userEnabled {
		enabled = "1"
	}
	err = common.RedisSet(fmt.Sprintf("user_enabled:%d", userId), enabled, time.Duration(UserId2StatusCacheSeconds)*time.Second)
	if err != nil {
		logger.SysError("Redis set user enabled error: " + err.Error())
	}
	return userEnabled, err
}

func CacheGetGroupModels(ctx context.Context, group string) ([]string, error) {
	if !common.RedisEnabled {
		return GetGroupModels(ctx, group)
	}
	modelsStr, err := common.RedisGet(fmt.Sprintf("group_models:%s", group))
	if err == nil {
		return strings.Split(modelsStr, ","), nil
	}
	models, err := GetGroupModels(ctx, group)
	if err != nil {
		return nil, err
	}
	err = common.RedisSet(fmt.Sprintf("group_models:%s", group), strings.Join(models, ","), time.Duration(GroupModelsCacheSeconds)*time.Second)
	if err != nil {
		logger.SysError("Redis set group models error: " + err.Error())
	}
	return models, nil
}

var group2model2channels map[string]map[string][]*Channel
var channelSyncLock sync.RWMutex

func InitChannelCache() {
	newChannelId2channel := make(map[int]*Channel)
	var channels []*Channel
	DB.Where("status = ?", ChannelStatusEnabled).Find(&channels)
	for _, channel := range channels {
		newChannelId2channel[channel.Id] = channel
	}
	var abilities []*Ability
	DB.Find(&abilities)
	groups := make(map[string]bool)
	for _, ability := range abilities {
		groups[ability.Group] = true
	}
	newGroup2model2channels := make(map[string]map[string][]*Channel)
	for group := range groups {
		newGroup2model2channels[group] = make(map[string][]*Channel)
	}
	for _, channel := range channels {
		groups := strings.Split(channel.Group, ",")
		for _, group := range groups {
			models := strings.Split(channel.Models, ",")
			for _, model := range models {
				if _, ok := newGroup2model2channels[group][model]; !ok {
					newGroup2model2channels[group][model] = make([]*Channel, 0)
				}
				newGroup2model2channels[group][model] = append(newGroup2model2channels[group][model], channel)
			}
		}
	}

	// sort by priority
	for group, model2channels := range newGroup2model2channels {
		for model, channels := range model2channels {
			sort.Slice(channels, func(i, j int) bool {
				return channels[i].GetPriority() > channels[j].GetPriority()
			})
			newGroup2model2channels[group][model] = channels
		}
	}

	channelSyncLock.Lock()
	group2model2channels = newGroup2model2channels
	channelSyncLock.Unlock()
	logger.SysLog("channels synced from database")
}

func SyncChannelCache(frequency int) {
	for {
		time.Sleep(time.Duration(frequency) * time.Second)
		logger.SysLog("syncing channels from database")
		InitChannelCache()
	}
}

// CacheGetSatisfiedChannels returns all candidate channels for a group+model.
// Returns the top-priority batch of channels suitable for smart load balancing.
func CacheGetSatisfiedChannels(group string, modelName string) []*Channel {
	if !config.MemoryCacheEnabled {
		// Fallback: query DB and return first match
		ch, err := GetRandomSatisfiedChannel(group, modelName, false)
		if err != nil {
			return nil
		}
		return []*Channel{ch}
	}
	channelSyncLock.RLock()
	defer channelSyncLock.RUnlock()
	channels := group2model2channels[group][modelName]
	if len(channels) == 0 {
		return nil
	}
	// Return channels from the top priority tier
	firstChannel := channels[0]
	endIdx := len(channels)
	if firstChannel.GetPriority() > 0 {
		for i := range channels {
			if channels[i].GetPriority() != firstChannel.GetPriority() {
				endIdx = i
				break
			}
		}
	}
	return channels[:endIdx]
}

func CacheGetRandomSatisfiedChannel(group string, model string, ignoreFirstPriority bool) (*Channel, error) {
	if !config.MemoryCacheEnabled {
		return GetRandomSatisfiedChannel(group, model, ignoreFirstPriority)
	}
	channelSyncLock.RLock()
	defer channelSyncLock.RUnlock()
	channels := group2model2channels[group][model]
	if len(channels) == 0 {
		return nil, errors.New("channel not found")
	}
	endIdx := len(channels)
	// choose by priority
	firstChannel := channels[0]
	if firstChannel.GetPriority() > 0 {
		for i := range channels {
			if channels[i].GetPriority() != firstChannel.GetPriority() {
				endIdx = i
				break
			}
		}
	}
	// determine the candidate pool
	startIdx := 0
	if ignoreFirstPriority {
		if endIdx < len(channels) { // which means there are more than one priority
			startIdx = endIdx
			endIdx = len(channels)
		} else {
			// no lower priority channels available, return nil
			return nil, errors.New("no lower priority channel available")
		}
	}
	// weighted random selection (roulette wheel algorithm)
	return weightedRandomSelect(channels[startIdx:endIdx]), nil
}

// weightedRandomSelect selects a channel using weighted random (roulette wheel) algorithm.
// Channels with higher weight have proportionally higher chance of being selected.
func weightedRandomSelect(channels []*Channel) *Channel {
	if len(channels) == 0 {
		return nil
	}
	if len(channels) == 1 {
		return channels[0]
	}
	// calculate total weight
	totalWeight := uint(0)
	for _, ch := range channels {
		totalWeight += ch.GetWeight()
	}
	// roulette wheel selection
	target := rand.Uint32() % uint32(totalWeight)
	cumulative := uint(0)
	for _, ch := range channels {
		cumulative += ch.GetWeight()
		if uint32(cumulative) > target {
			return ch
		}
	}
	// fallback to last channel (should not reach here)
	return channels[len(channels)-1]
}

// IsChannelInGroup checks whether a channel belongs to the specified user group.
// It uses the in-memory channel cache (group2model2channels) for fast lookup.
func IsChannelInGroup(channelIdStr string, userGroup string) bool {
	if channelIdStr == "" || userGroup == "" {
		return false
	}
	channelId, err := strconv.Atoi(channelIdStr)
	if err != nil {
		return false
	}
	if !config.MemoryCacheEnabled {
		// Fallback: query DB directly
		var channel Channel
		if err := DB.Where("id = ?", channelId).Select("id", "status", "group").First(&channel).Error; err != nil {
			return false
		}
		groups := strings.Split(channel.Group, ",")
		for _, g := range groups {
			if strings.TrimSpace(g) == userGroup {
				return true
			}
		}
		return false
	}
	channelSyncLock.RLock()
	defer channelSyncLock.RUnlock()
	for _, channels := range group2model2channels[userGroup] {
		for _, ch := range channels {
			if ch.Id == channelId {
				return true
			}
		}
	}
	return false
}

// CacheGetModelChannels returns a map of model name -> channel info list for a given group.
// This is used by the model marketplace to show available channels per model.
func CacheGetModelChannels(group string) map[string][]ChannelInfo {
	if !config.MemoryCacheEnabled {
		// Fallback: not available without memory cache
		return nil
	}
	channelSyncLock.RLock()
	defer channelSyncLock.RUnlock()
	model2channels, ok := group2model2channels[group]
	if !ok {
		return nil
	}
	result := make(map[string][]ChannelInfo)
	for modelName, channels := range model2channels {
		infos := make([]ChannelInfo, 0, len(channels))
		for _, ch := range channels {
			infos = append(infos, ChannelInfo{
				Id:     ch.Id,
				Name:   ch.Name,
				Type:   ch.Type,
				Status: ch.Status,
			})
		}
		result[modelName] = infos
	}
	return result
}

// ChannelInfo represents a channel's basic info for the marketplace.
type ChannelInfo struct {
	Id           int    `json:"id"`
	Name         string `json:"name"`
	Type         int    `json:"type"`
	Status       int    `json:"status"`
	HealthStatus string `json:"health_status"`
	HealthReason string `json:"health_reason,omitempty"`
}

// ChannelRef is a lightweight channel reference (id + name) for concurrency tracking.
type ChannelRef struct {
	Id   int
	Name string
}

// CacheGetModelChannelRefs returns a map of model name -> ChannelRef list for a given group.
// This is used by the concurrency tracking API to show channel concurrency per model.
func CacheGetModelChannelRefs(group string) map[string][]ChannelRef {
	if !config.MemoryCacheEnabled {
		return nil
	}
	channelSyncLock.RLock()
	defer channelSyncLock.RUnlock()
	model2channels, ok := group2model2channels[group]
	if !ok {
		return nil
	}
	result := make(map[string][]ChannelRef)
	for modelName, channels := range model2channels {
		refs := make([]ChannelRef, 0, len(channels))
		for _, ch := range channels {
			refs = append(refs, ChannelRef{
				Id:   ch.Id,
				Name: ch.Name,
			})
		}
		result[modelName] = refs
	}
	return result
}
