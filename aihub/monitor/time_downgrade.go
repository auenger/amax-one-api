package monitor

import (
	"time"

	"github.com/yzw/aihub/common/config"
)

// beijingLoc is the Beijing timezone (UTC+8).
var beijingLoc = time.FixedZone("CST", 8*3600)

// CheckTimeDowngrade checks if a channel should be time-downgraded.
// Returns the target model name if downgrade is active, empty string otherwise.
func CheckTimeDowngrade(channelId int) string {
	config.OptionMapRWMutex.RLock()
	enabled := config.TimeDowngradeEnabled
	rules := config.TimeDowngradeRules
	config.OptionMapRWMutex.RUnlock()

	if !enabled || len(rules) == 0 {
		return ""
	}

	now := time.Now().In(beijingLoc)
	hour := now.Hour()

	for _, rule := range rules {
		// Check if channel is in this rule
		found := false
		for _, id := range rule.ChannelIds {
			if id == channelId {
				found = true
				break
			}
		}
		if !found {
			continue
		}
		// Check time window
		if rule.StartHour < rule.EndHour {
			// Normal range, e.g. 13-18
			if hour >= rule.StartHour && hour < rule.EndHour {
				return rule.TargetModel
			}
		}
		// rule is invalid (start >= end), skip
	}
	return ""
}
