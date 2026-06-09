package model

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/yzw/aihub/common"
	"github.com/yzw/aihub/common/config"
	"github.com/yzw/aihub/common/helper"
	"github.com/yzw/aihub/common/logger"
)

type Log struct {
	Id                int    `json:"id"`
	UserId            int    `json:"user_id" gorm:"index"`
	CreatedAt         int64  `json:"created_at" gorm:"bigint;index:idx_created_at_type"`
	Type              int    `json:"type" gorm:"index:idx_created_at_type"`
	Content           string `json:"content"`
	Username          string `json:"username" gorm:"index:index_username_model_name,priority:2;default:''"`
	TokenName         string `json:"token_name" gorm:"index;default:''"`
	ModelName         string `json:"model_name" gorm:"index;index:index_username_model_name,priority:1;default:''"`
	Quota             int    `json:"quota" gorm:"default:0"`
	PromptTokens      int    `json:"prompt_tokens" gorm:"default:0"`
	CompletionTokens  int    `json:"completion_tokens" gorm:"default:0"`
	ChannelId         int    `json:"channel" gorm:"index"`
	RequestId         string `json:"request_id" gorm:"default:''"`
	ElapsedTime       int64  `json:"elapsed_time" gorm:"default:0"` // unit is ms
	ProxyMs           int64  `json:"proxy_ms" gorm:"default:0"`    // middleware/proxy overhead in ms
	IsStream          bool   `json:"is_stream" gorm:"default:false"`
	SystemPromptReset bool   `json:"system_prompt_reset" gorm:"default:false"`
}

const (
	LogTypeUnknown = iota
	LogTypeTopup
	LogTypeConsume
	LogTypeManage
	LogTypeSystem
	LogTypeTest
)

func recordLogHelper(ctx context.Context, log *Log) {
	requestId := helper.GetRequestID(ctx)
	log.RequestId = requestId
	err := LOG_DB.Create(log).Error
	if err != nil {
		logger.Error(ctx, "failed to record log: "+err.Error())
		return
	}
	logger.Infof(ctx, "record log: %+v", log)
}

func RecordLog(ctx context.Context, userId int, logType int, content string) {
	if logType == LogTypeConsume && !config.LogConsumeEnabled {
		return
	}
	log := &Log{
		UserId:    userId,
		Username:  GetUsernameById(userId),
		CreatedAt: helper.GetTimestamp(),
		Type:      logType,
		Content:   content,
	}
	recordLogHelper(ctx, log)
}

func RecordTopupLog(ctx context.Context, userId int, content string, quota int) {
	log := &Log{
		UserId:    userId,
		Username:  GetUsernameById(userId),
		CreatedAt: helper.GetTimestamp(),
		Type:      LogTypeTopup,
		Content:   content,
		Quota:     quota,
	}
	recordLogHelper(ctx, log)
}

func RecordConsumeLog(ctx context.Context, log *Log) {
	if !config.LogConsumeEnabled {
		return
	}
	log.Username = GetUsernameById(log.UserId)
	log.CreatedAt = helper.GetTimestamp()
	log.Type = LogTypeConsume
	recordLogHelper(ctx, log)
}

func RecordTestLog(ctx context.Context, log *Log) {
	log.CreatedAt = helper.GetTimestamp()
	log.Type = LogTypeTest
	recordLogHelper(ctx, log)
}

func GetAllLogs(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, startIdx int, num int, channel int) (logs []*Log, err error) {
	var tx *gorm.DB
	if logType == LogTypeUnknown {
		tx = LOG_DB
	} else {
		tx = LOG_DB.Where("type = ?", logType)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}
	err = tx.Order("id desc").Limit(num).Offset(startIdx).Find(&logs).Error
	return logs, err
}

func GetUserLogs(userId int, logType int, startTimestamp int64, endTimestamp int64, modelName string, tokenName string, startIdx int, num int, channel int) (logs []*Log, err error) {
	var tx *gorm.DB
	if logType == LogTypeUnknown {
		tx = LOG_DB.Where("user_id = ?", userId)
	} else {
		tx = LOG_DB.Where("user_id = ? and type = ?", userId, logType)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}
	err = tx.Order("id desc").Limit(num).Offset(startIdx).Omit("id").Find(&logs).Error
	return logs, err
}

func SearchAllLogs(keyword string) (logs []*Log, err error) {
	err = LOG_DB.Where("type = ? or content LIKE ?", keyword, keyword+"%").Order("id desc").Limit(config.MaxRecentItems).Find(&logs).Error
	return logs, err
}

func SearchUserLogs(userId int, keyword string) (logs []*Log, err error) {
	err = LOG_DB.Where("user_id = ? and type = ?", userId, keyword).Order("id desc").Limit(config.MaxRecentItems).Omit("id").Find(&logs).Error
	return logs, err
}

func SumUsedQuota(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, channel int) (quota int64) {
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}
	tx := LOG_DB.Table("logs").Select(fmt.Sprintf("%s(sum(quota),0)", ifnull))
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}
	tx.Where("type = ?", LogTypeConsume).Scan(&quota)
	return quota
}

func SumUsedToken(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string) (token int) {
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}
	tx := LOG_DB.Table("logs").Select(fmt.Sprintf("%s(sum(prompt_tokens),0) + %s(sum(completion_tokens),0)", ifnull, ifnull))
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	tx.Where("type = ?", LogTypeConsume).Scan(&token)
	return token
}

func DeleteOldLog(targetTimestamp int64) (int64, error) {
	result := LOG_DB.Where("created_at < ?", targetTimestamp).Delete(&Log{})
	return result.RowsAffected, result.Error
}

// UpdateLogProxyMs updates the proxy_ms field for a log record by request_id.
func UpdateLogProxyMs(ctx context.Context, requestId string, proxyMs int64) {
	err := LOG_DB.Model(&Log{}).Where("request_id = ?", requestId).Update("proxy_ms", proxyMs).Error
	if err != nil {
		logger.Error(ctx, "failed to update log proxy_ms: "+err.Error())
	}
}

type LogStatistic struct {
	Day              string `gorm:"column:day"`
	ModelName        string `gorm:"column:model_name"`
	RequestCount     int    `gorm:"column:request_count"`
	Quota            int    `gorm:"column:quota"`
	PromptTokens     int    `gorm:"column:prompt_tokens"`
	CompletionTokens int    `gorm:"column:completion_tokens"`
}

// ReportData holds the aggregated usage report data.
type ReportData struct {
	Summary     ReportSummary `json:"summary"`
	ByDate      []ReportRow   `json:"by_date"`
	ByDateUser  []ReportRow   `json:"by_date_user"`
	ByUser      []ReportRow   `json:"by_user"`
	ByModel     []ReportRow   `json:"by_model"`
	ByChannel   []ReportRow   `json:"by_channel"`
	Usernames   []string      `json:"usernames"`
	ChannelName []string      `json:"channel_names"`
}

// ReportSummary holds the overall totals.
type ReportSummary struct {
	TotalRequests         int `json:"total_requests"`
	TotalPromptTokens     int `json:"total_prompt_tokens"`
	TotalCompletionTokens int `json:"total_completion_tokens"`
	TotalQuota            int `json:"total_quota"`
}

// ReportRow is a generic aggregation row used in by_date, by_token, by_model, by_channel.
type ReportRow struct {
	Date             string `json:"date,omitempty"`
	Username         string `json:"username,omitempty"`
	TokenName        string `json:"token_name,omitempty"`
	ModelName        string `json:"model_name,omitempty"`
	ChannelName      string `json:"channel_name,omitempty"`
	Requests         int    `json:"requests"`
	PromptTokens     int    `json:"prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens"`
	Quota            int    `json:"quota"`
}

type channelAggRow struct {
	ChannelId        int
	Requests         int
	PromptTokens     int
	CompletionTokens int
	Quota            int
}

// cst is UTC+8 (China Standard Time), used for all report date/hour aggregation.
var cst = time.FixedZone("CST", 8*3600)

func dayExpr() string {
	if common.UsingPostgreSQL {
		return "TO_CHAR(date_trunc('day', to_timestamp(created_at) AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD')"
	}
	if common.UsingSQLite {
		return "strftime('%Y-%m-%d', datetime(created_at, 'unixepoch', '+8 hours'))"
	}
	return "DATE_FORMAT(DATE_ADD(FROM_UNIXTIME(created_at), INTERVAL 8 HOUR), '%Y-%m-%d')"
}

func hourExpr() string {
	if common.UsingPostgreSQL {
		return "TO_CHAR(date_trunc('hour', to_timestamp(created_at) AT TIME ZONE 'Asia/Shanghai'), 'HH24:00')"
	}
	if common.UsingSQLite {
		return "strftime('%H:00', datetime(created_at, 'unixepoch', '+8 hours'))"
	}
	return "DATE_FORMAT(DATE_ADD(FROM_UNIXTIME(created_at), INTERVAL 8 HOUR), '%H:00')"
}

// timeExpr returns the appropriate SQL expression for grouping by time,
// based on the granularity parameter ("hour" or "day").
func timeExpr(granularity string) string {
	if granularity == "hour" {
		return hourExpr()
	}
	return dayExpr()
}

func buildReportBaseQuery(username string, startTimestamp, endTimestamp int64) *gorm.DB {
	tx := LOG_DB.Table("logs").Where("type = ?", LogTypeConsume)
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	return tx
}

func GetUsageReport(username string, startTimestamp, endTimestamp int64, granularity string) (*ReportData, error) {
	expr := timeExpr(granularity)

	base := buildReportBaseQuery(username, startTimestamp, endTimestamp)

	// Summary
	var summary ReportSummary
	err := base.Select(
		"COUNT(1) as total_requests",
		"COALESCE(SUM(prompt_tokens),0) as total_prompt_tokens",
		"COALESCE(SUM(completion_tokens),0) as total_completion_tokens",
		"COALESCE(SUM(quota),0) as total_quota",
	).Scan(&summary).Error
	if err != nil {
		return nil, err
	}

	report := &ReportData{Summary: summary}

	// By date (or hour)
	dateBase := buildReportBaseQuery(username, startTimestamp, endTimestamp)
	var byDate []ReportRow
	err = dateBase.Select(
		expr+" as date",
		"COUNT(1) as requests",
		"COALESCE(SUM(prompt_tokens),0) as prompt_tokens",
		"COALESCE(SUM(completion_tokens),0) as completion_tokens",
		"COALESCE(SUM(quota),0) as quota",
	).Group(expr).Order("date ASC").Scan(&byDate).Error
	if err != nil {
		return nil, err
	}
	report.ByDate = byDate

	// By date + username (for multi-user trend chart)
	dateUserBase := buildReportBaseQuery(username, startTimestamp, endTimestamp)
	var byDateUser []ReportRow
	err = dateUserBase.Select(
		expr+" as date",
		"username",
		"COUNT(1) as requests",
		"COALESCE(SUM(prompt_tokens),0) as prompt_tokens",
		"COALESCE(SUM(completion_tokens),0) as completion_tokens",
		"COALESCE(SUM(quota),0) as quota",
	).Group(expr + ", username").Order("date ASC, username ASC").Scan(&byDateUser).Error
	if err != nil {
		return nil, err
	}
	report.ByDateUser = byDateUser

	// Extract distinct usernames from date-user data
	usernameSet := make(map[string]bool)
	for _, row := range byDateUser {
		if row.Username != "" {
			usernameSet[row.Username] = true
		}
	}
	var usernames []string
	for u := range usernameSet {
		usernames = append(usernames, u)
	}
	report.Usernames = usernames

	// By user
	userBase := buildReportBaseQuery(username, startTimestamp, endTimestamp)
	var byUser []ReportRow
	err = userBase.Select(
		"username",
		"COUNT(1) as requests",
		"COALESCE(SUM(prompt_tokens),0) as prompt_tokens",
		"COALESCE(SUM(completion_tokens),0) as completion_tokens",
		"COALESCE(SUM(quota),0) as quota",
	).Group("username").Order("quota DESC").Scan(&byUser).Error
	if err != nil {
		return nil, err
	}
	report.ByUser = byUser

	// By model
	modelBase := buildReportBaseQuery(username, startTimestamp, endTimestamp)
	var byModel []ReportRow
	err = modelBase.Select(
		"model_name",
		"COUNT(1) as requests",
		"COALESCE(SUM(prompt_tokens),0) as prompt_tokens",
		"COALESCE(SUM(completion_tokens),0) as completion_tokens",
		"COALESCE(SUM(quota),0) as quota",
	).Group("model_name").Order("quota DESC").Scan(&byModel).Error
	if err != nil {
		return nil, err
	}
	report.ByModel = byModel

	// By channel
	channelBase := buildReportBaseQuery(username, startTimestamp, endTimestamp)
	var channelAggs []channelAggRow
	err = channelBase.Select(
		"channel_id as channel_id",
		"COUNT(1) as requests",
		"COALESCE(SUM(prompt_tokens),0) as prompt_tokens",
		"COALESCE(SUM(completion_tokens),0) as completion_tokens",
		"COALESCE(SUM(quota),0) as quota",
	).Group("channel_id").Order("quota DESC").Scan(&channelAggs).Error
	if err != nil {
		return nil, err
	}

	if len(channelAggs) > 0 {
		channelIds := make([]int, 0, len(channelAggs))
		for _, agg := range channelAggs {
			if agg.ChannelId > 0 {
				channelIds = append(channelIds, agg.ChannelId)
			}
		}
		channelMap := make(map[int]string)
		if len(channelIds) > 0 {
			var channels []Channel
			DB.Where("id IN ?", channelIds).Find(&channels)
			for _, ch := range channels {
				channelMap[ch.Id] = ch.Name
			}
		}

		byChannel := make([]ReportRow, 0, len(channelAggs))
		channelNameSet := make(map[string]bool)
		for _, agg := range channelAggs {
			name := channelMap[agg.ChannelId]
			if name != "" && agg.ChannelId > 0 {
				name = fmt.Sprintf("%s(#%d)", name, agg.ChannelId)
			} else if name == "" && agg.ChannelId > 0 {
				name = fmt.Sprintf("渠道#%d", agg.ChannelId)
			} else if name == "" {
				name = "未知渠道"
			}
			channelNameSet[name] = true
			byChannel = append(byChannel, ReportRow{
				ChannelName:      name,
				Requests:         agg.Requests,
				PromptTokens:     agg.PromptTokens,
				CompletionTokens: agg.CompletionTokens,
				Quota:            agg.Quota,
			})
		}
		report.ByChannel = byChannel

		var channelNames []string
		for n := range channelNameSet {
			channelNames = append(channelNames, n)
		}
		report.ChannelName = channelNames
	}

	return report, nil
}

type DailyHourlyReport struct {
	Hours        []string    `json:"hours"`
	ByUserHourly []ReportRow `json:"by_user_hourly"`
	Usernames    []string    `json:"usernames"`
}

func GetDailyHourlyData(username string, dateStr string) (*DailyHourlyReport, error) {
	var t time.Time
	if dateStr != "" {
		var err error
		t, err = time.ParseInLocation("2006-01-02", dateStr, cst)
		if err != nil {
			return nil, fmt.Errorf("invalid date format, expected YYYY-MM-DD")
		}
	} else {
		t = time.Now().In(cst)
	}

	year, month, day := t.Date()
	startTs := time.Date(year, month, day, 0, 0, 0, 0, cst).Unix()
	endTs := time.Date(year, month, day, 23, 59, 59, 0, cst).Unix()

	expr := hourExpr()
	base := buildReportBaseQuery(username, startTs, endTs)
	var rows []ReportRow
	err := base.Select(
		expr+" as date",
		"username",
		"COUNT(1) as requests",
		"COALESCE(SUM(prompt_tokens),0) as prompt_tokens",
		"COALESCE(SUM(completion_tokens),0) as completion_tokens",
		"COALESCE(SUM(quota),0) as quota",
	).Group(expr + ", username").Order("date ASC, username ASC").Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	usernameSet := make(map[string]bool)
	for _, row := range rows {
		if row.Username != "" {
			usernameSet[row.Username] = true
		}
	}
	var usernames []string
	for u := range usernameSet {
		usernames = append(usernames, u)
	}

	hours := make([]string, 24)
	for i := 0; i < 24; i++ {
		hours[i] = fmt.Sprintf("%02d:00", i)
	}

	return &DailyHourlyReport{
		Hours:        hours,
		ByUserHourly: rows,
		Usernames:    usernames,
	}, nil
}

func SearchLogsByDayAndModel(userId, start, end int) (LogStatistics []*LogStatistic, err error) {
	groupSelect := "DATE_FORMAT(DATE_ADD(FROM_UNIXTIME(created_at), INTERVAL 8 HOUR), '%Y-%m-%d') as day"

	if common.UsingPostgreSQL {
		groupSelect = "TO_CHAR(date_trunc('day', to_timestamp(created_at) AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD') as day"
	}

	if common.UsingSQLite {
		groupSelect = "strftime('%Y-%m-%d', datetime(created_at, 'unixepoch', '+8 hours')) as day"
	}

	err = LOG_DB.Raw(`
		SELECT `+groupSelect+`,
		model_name, count(1) as request_count,
		sum(quota) as quota,
		sum(prompt_tokens) as prompt_tokens,
		sum(completion_tokens) as completion_tokens
		FROM logs
		WHERE type=2
		AND user_id= ?
		AND created_at BETWEEN ? AND ?
		GROUP BY day, model_name
		ORDER BY day, model_name
	`, userId, start, end).Scan(&LogStatistics).Error

	return LogStatistics, err
}

// SearchLogsByGranularityAndModel aggregates logs grouped by the given granularity ("hour" or "day") and model.
func SearchLogsByGranularityAndModel(userId, start, end int, granularity string) (LogStatistics []*LogStatistic, err error) {
	expr := timeExpr(granularity)
	alias := "day" // reuse the same LogStatistic.Day field

	err = LOG_DB.Raw(`
		SELECT `+expr+` as `+alias+`,
		model_name, count(1) as request_count,
		sum(quota) as quota,
		sum(prompt_tokens) as prompt_tokens,
		sum(completion_tokens) as completion_tokens
		FROM logs
		WHERE type=2
		AND user_id= ?
		AND created_at BETWEEN ? AND ?
		GROUP BY `+alias+`, model_name
		ORDER BY `+alias+`, model_name
	`, userId, start, end).Scan(&LogStatistics).Error

	return LogStatistics, err
}
