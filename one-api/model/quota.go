package model

import "fmt"

// ChannelQuota represents the standardized quota information for a channel.
// It abstracts provider-specific quota APIs into a uniform structure.
type ChannelQuota struct {
	ChannelID   int           `json:"channel_id"`
	ChannelName string        `json:"channel_name"`
	ChannelType int           `json:"channel_type"`
	AccountLevel string       `json:"account_level,omitempty"` // e.g. "Pro", "Max"
	Balance     *float64      `json:"balance,omitempty"`       // monetary balance (if applicable)
	BalanceUnit string        `json:"balance_unit,omitempty"`  // "CNY", "USD", etc.
	Windows     []QuotaWindow `json:"windows"`                 // time-windowed quota usage
	LastUpdated int64         `json:"last_updated"`            // Unix milliseconds
	QueryError  string        `json:"query_error,omitempty"`   // error message if query failed
}

// QuotaWindow represents a single time window of quota usage.
type QuotaWindow struct {
	Label       string  `json:"label"`          // e.g. "5h", "7d", "weekly"
	UsedPercent float64 `json:"used_percent"`   // 0-100
	RemainingMs int64   `json:"remaining_ms"`   // milliseconds until reset
	ResetAt     int64   `json:"reset_at"`       // reset time as Unix milliseconds
}

// QuotaSummary is a lightweight version of ChannelQuota for embedding in other responses.
type QuotaSummary struct {
	AccountLevel string        `json:"account_level,omitempty"`
	Balance      *float64      `json:"balance,omitempty"`
	BalanceUnit  string        `json:"balance_unit,omitempty"`
	Windows      []QuotaWindow `json:"windows,omitempty"`
	LastUpdated  int64         `json:"last_updated"`
}

// Redis key pattern for cached quota data.
const quotaRedisKeyPrefix = "channel:quota:"

// QuotaRedisKey returns the Redis key for a channel's cached quota data.
func QuotaRedisKey(channelId int) string {
	return quotaRedisKeyPrefix + fmt.Sprintf("%d", channelId)
}
