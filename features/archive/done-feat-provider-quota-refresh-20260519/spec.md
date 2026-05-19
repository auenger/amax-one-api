# Feature: feat-provider-quota-refresh 定时刷新与缓存

## Basic Information
- **ID**: feat-provider-quota-refresh
- **Name**: 定时刷新与缓存
- **Priority**: 75
- **Size**: S
- **Dependencies**: feat-provider-quota-api
- **Parent**: feat-provider-quota-monitor
- **Children**: null
- **Created**: 2026-05-19

## Description

在配额查询 API 基础上，实现缓存层和定时刷新机制：

1. **Redis 缓存**: ChannelQuota 缓存在 Redis，TTL 30 分钟
2. **定时刷新**: 后台 goroutine 每 30 分钟自动刷新所有已启用 Channel 的配额
3. **低配额告警**: 用量超阈值（默认 90%）时自动将 Channel 标记为 degraded
4. **API 端点**: 通过 Gateway 暴露配额查询给前端

### 缓存结构

Redis Key: `channel:quota:{channel_id}` — JSON 序列化的 ChannelQuota
Redis Key: `channel:quota:last_refresh` — 上次全量刷新时间戳

### Gateway API

Gateway 通过调用 one-api 的 `/api/channel/quota` 和 `/api/channel/:id/quota/refresh` 代理配额数据：

- `GET /api/v1/admin/channels/quota` — 获取所有 Channel 配额（从缓存）
- `POST /api/v1/admin/channels/:channelId/quota/refresh` — 强制刷新

### 定时任务

- one-api 现有 `AutomaticallyUpdateChannels()` 模式
- 新增 `AutomaticallyUpdateChannelQuotas(frequency)` goroutine
- 并发控制：最多 5 个并发查询，避免触发提供商 rate limit
- 请求间隔：每个查询之间 sleep 1-2 秒

### 低配额处理

```go
if quota.WindowUsedPercent > 90% {
    // 记录告警
    logger.Warn("Channel quota low", channelID, usedPercent)
    // 可选: 自动标记为 degraded
    monitor.MarkChannelDegraded(channelID, "配额使用率超过90%")
}
```

## User Value Points
1. 自动定时刷新，管理员无需手动查询
2. 低配额自动告警，避免服务中断

## Technical Solution

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `one-api/monitor/quota-refresh.go` | NEW | 定时刷新 goroutine: StartQuotaRefresher(), RefreshAllChannelQuotas(), 并发控制 + 低配额告警 |
| `one-api/model/quota.go` | MODIFIED | 新增 QuotaLastRefreshKey(), QuotaCacheTTL 常量 (30 min) |
| `one-api/controller/channel-quota.go` | MODIFIED | TTL 从 10min 更新到 30min, init() 注册 DI 函数, 新增 RefreshAllChannelQuotasHandler |
| `one-api/router/api.go` | MODIFIED | 新增 POST /api/channel/quota/refresh 路由 |
| `one-api/main.go` | MODIFIED | 启动 monitor.StartQuotaRefresher() |

### Architecture

```
StartQuotaRefresher() — goroutine, 每 30 分钟
  → runQuotaRefresh()
    → getEnabledChannels() — DB 查询所有 enabled channels
    → refreshChannelQuotas(channels) — 并发控制 (semaphore, max 5)
      → queryAndCacheQuota(channel) — 调用 controller.queryProviderQuota (via DI)
        → cacheQuotaData(quota) — 写入 Redis, TTL 30min
        → checkLowQuotaAlert() — 检查阈值, MarkChannelDegraded()
    → updateLastRefreshTime() — 更新 channel:quota:last_refresh

依赖注入: controller/channel-quota.go init() 调用 monitor.RegisterQuotaQueryFunc()
避免 monitor → controller 循环依赖
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `QUOTA_REFRESH_INTERVAL` | 30 | 刷新间隔 (分钟) |
| `QUOTA_REFRESH_CONCURRENCY` | 5 | 最大并发查询数 |
| `QUOTA_LOW_THRESHOLD` | 90 | 低配额告警阈值 (%) |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/channel/quota` | 获取所有 Channel 配额 (from cache) |
| GET | `/api/channel/:id/quota` | 获取单个 Channel 配额 |
| POST | `/api/channel/:id/quota/refresh` | 强制刷新单个 Channel |
| POST | `/api/channel/quota/refresh` | **新增** 强制全量刷新 |

## Acceptance Criteria (Gherkin)
1. 定时任务每 30 分钟自动刷新 → 缓存数据更新
2. 手动触发刷新 → 立即返回最新数据
3. 配额超 90% → Channel 标记为 degraded + 告警日志
4. 提供商 API 超时 → 使用缓存数据，不阻塞

## Merge Record
- **Completed**: 2026-05-19
- **Merged Branch**: feature/provider-quota-refresh
- **Merge Commit**: 15cd7c1
- **Archive Tag**: feat-provider-quota-refresh-20260519
- **Conflicts**: none
- **Verification**: 4/4 Gherkin scenarios PASS, 13/14 tasks complete
- **Duration**: started 2026-05-19T15:00:00
- **Stats**: 1 commit, 5 files changed, 326 insertions, 4 deletions
