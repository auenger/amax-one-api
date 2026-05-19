# Feature: feat-provider-quota-api 提供商配额查询 API

## Basic Information
- **ID**: feat-provider-quota-api
- **Name**: 提供商配额查询 API
- **Priority**: 75
- **Size**: S
- **Dependencies**: none
- **Parent**: feat-provider-quota-monitor
- **Children**: null
- **Created**: 2026-05-19

## Description

在 one-api (Go) 层面扩展 Channel 余额查询，新增配额查询 API，返回标准化的配额结构体（而非单一余额数字）。支持以下提供商：

### 支持的提供商及 API

| 提供商 | API 端点 | 认证方式 | 返回数据 |
|--------|----------|----------|----------|
| 智谱 GLM | `GET https://api.z.ai/api/monitor/usage/quota/limit` | Authorization: {key} (无 Bearer) | level, limits[{type, percentage, nextResetTime}] |
| MiniMax | `GET https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` | Bearer token | model_remains[{current_interval_total/usage, current_weekly_total/usage, end_time}] |
| DeepSeek | `GET https://api.deepseek.com/user/balance` | Bearer token | balance_infos[{currency, total_balance}] |
| SiliconFlow | `GET https://api.siliconflow.cn/v1/user/info` | Bearer token | data.totalBalance |
| OpenRouter | `GET https://openrouter.ai/api/v1/credits` | Bearer token | data.{total_credits, total_usage} |
| StepFun | `GET https://api.stepfun.com/v1/accounts` | Bearer token | balance |

### 标准化配额结构

```go
type ChannelQuota struct {
    ChannelID      int              `json:"channel_id"`
    ChannelName    string           `json:"channel_name"`
    ChannelType    int              `json:"channel_type"`
    AccountLevel   string           `json:"account_level,omitempty"` // Pro, Max, etc.
    Balance        *float64         `json:"balance,omitempty"`       // 余额（有余额概念的提供商）
    BalanceUnit    string           `json:"balance_unit,omitempty"`  // CNY, USD
    Windows        []QuotaWindow    `json:"windows"`                 // 时间窗口配额
    LastUpdated    int64            `json:"last_updated"`            // Unix ms
    QueryError     string           `json:"query_error,omitempty"`   // 查询失败信息
}

type QuotaWindow struct {
    Label        string  `json:"label"`         // "5h", "7d", "weekly"
    UsedPercent  float64 `json:"used_percent"`  // 0-100
    RemainingMs  int64   `json:"remaining_ms"`  // 距重置的毫秒数
    ResetAt      int64   `json:"reset_at"`      // 重置时间 Unix ms
}
```

### API 端点

- `GET /api/channel/:id/quota` — 查询单个 Channel 配额
- `GET /api/channel/quota` — 批量查询所有 Channel 配额（从缓存读取）
- `POST /api/channel/:id/quota/refresh` — 强制刷新单个 Channel 配额
- `GET /api/channel/quotas_map` — 返回 `{channelId: QuotaSummary}` 供模型广场使用

### 扩展 model_channels API

现有 `GET /api/user/model_channels` 返回 `{modelName: [{id, name, type, status}]}`。
扩展 `ChannelInfo` 结构体，附加配额摘要：

```go
type ChannelInfo struct {
    Id      int            `json:"id"`
    Name    string         `json:"name"`
    Type    int            `json:"type"`
    Status  int            `json:"status"`
    Quota   *QuotaSummary  `json:"quota,omitempty"`   // 新增
}

type QuotaSummary struct {
    AccountLevel  string         `json:"account_level,omitempty"` // Pro, Max
    Balance       *float64       `json:"balance,omitempty"`
    BalanceUnit   string         `json:"balance_unit,omitempty"`
    Windows       []QuotaWindow  `json:"windows,omitempty"`
    LastUpdated   int64          `json:"last_updated"`
}
```

数据来源：从 Redis 缓存读取（由 feat-provider-quota-refresh 写入），不实时查询提供商 API。

## User Value Points
1. 统一的配额查询接口，屏蔽各提供商 API 差异
2. 返回丰富的时间窗口配额信息（不只是余额数字）

## Context Analysis
### Reference Code
- `one-api/controller/channel-billing.go` — 现有余额查询框架
- `one-api/relay/channeltype/` — Channel 类型常量
- cc-switch `src-tauri/src/services/coding_plan.rs` — 智谱/MiniMax 配额查询参考实现

## Technical Solution

### 架构设计
- **model/quota.go**: 定义 ChannelQuota、QuotaWindow、QuotaSummary 结构体，提供 Redis key helper
- **controller/channel-quota.go**: 6 个提供商适配器函数 + Redis 缓存层 + 4 个 API handler
- **router/api.go**: 注册 GET /quota, GET /quotas_map, GET /:id/quota, POST /:id/quota/refresh

### 数据流
1. GET /api/channel/:id/quota → 先查 Redis 缓存，miss 时直接查询提供商 API → 结果缓存 10min
2. GET /api/channel/quota → 仅从缓存读取，不触发实时查询
3. POST /api/channel/:id/quota/refresh → 强制查询提供商 API 并更新缓存
4. GET /api/channel/quotas_map → 返回 {channelId: QuotaSummary} 供模型广场使用

### 缓存策略
- Redis key: `channel:quota:{channelId}`
- TTL: 10 分钟
- 错误也缓存（防止频繁重试）

## Acceptance Criteria (Gherkin)
### Scenarios
1. 查询智谱 Channel 配额 → 返回账户等级 + 5小时/周窗口用量百分比
2. 查询 MiniMax Channel 配额 → 返回 5小时/周窗口用量百分比
3. 查询 DeepSeek Channel 配额 → 返回 CNY 余额
4. 不支持的 Channel 类型 → 返回友好错误
5. 提供商 API 不可用 → 返回错误但不影响系统
