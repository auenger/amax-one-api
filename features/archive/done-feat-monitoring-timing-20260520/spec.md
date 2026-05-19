# Feature: feat-monitoring-timing 监控数据时序优化

## Basic Information
- **ID**: feat-monitoring-timing
- **Name**: 监控数据时序优化
- **Priority**: 70
- **Size**: S
- **Dependencies**: feat-concurrency-tracker, feat-provider-quota-refresh
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-20

## Description

优化并发计数和配额刷新的时序参数，解决模型广场并发始终为 0 的问题。

核心变更：
1. **并发延迟递减**: 请求完成后不再立即 -1，改为延迟 1 分钟再递减。这让并发计数在 30 秒轮询窗口内更容易被捕获，避免因请求处理过快（毫秒级）导致计数始终为 0。
2. **前端轮询加速**: 并发数据轮询间隔从 30 秒缩短为 15 秒。
3. **配额刷新加速**: 后台定时刷新间隔从 30 分钟缩短为 10 分钟，Redis 缓存 TTL 从 30 分钟缩短为 10 分钟。

## User Value Points

### VP1: 可观测并发数据
用户在模型广场能看到非零的并发计数和正确的负载等级，而不是一直显示 "并发: 0 空闲"。

### VP2: 更及时的配额状态
配额数据从 30 分钟刷新一次提升到 10 分钟，用户能更快看到配额窗口的变化。

## Context Analysis

### Reference Code
- `one-api/monitor/concurrency.go` — IncrConcurrency / DecrConcurrency，当前 TTL 10 分钟，立即 decr
- `one-api/controller/relay.go:57-59` — 请求进入 Incr + defer Decr
- `one-api/controller/anthropic_relay.go:157-159` — Anthropic 路径同样模式
- `one-api/monitor/quota-refresh.go:21` — defaultQuotaRefreshInterval = 30 分钟
- `one-api/model/quota.go:40` — QuotaCacheTTL = 30 * 60 秒
- `one-api/web/berry/src/hooks/useConcurrencyData.js:7` — DEFAULT_REFRESH_INTERVAL = 30000ms

### Related Documents
- project-context.md — 配额监控、并发追踪章节

### Related Features
- feat-concurrency-tracker (并发追踪后端)
- feat-concurrency-market (广场并发数据对接)
- feat-provider-quota-refresh (定时刷新与缓存)

## Technical Solution

### 1. 并发延迟递减 (Backend)

**文件**: `one-api/monitor/concurrency.go`

将 `DecrConcurrency` 改为延迟执行：

```go
// DecrConcurrency 延迟 1 分钟后递减并发计数器。
// 延迟使得前端轮询有足够时间捕获并发状态。
func DecrConcurrency(channelId int, model string) {
    if !common.RedisEnabled || common.RDB == nil {
        return
    }
    go func() {
        time.Sleep(1 * time.Minute)
        // ... decr + clamp logic
    }()
}
```

同时调整 `concurrencyKeyTTL` 从 10 分钟增加到 2 分钟以上（确保延迟 decr 不会因 TTL 过期而丢失），保持 10 分钟即可，因为 Incr 会重置 TTL。

**注意**: relay.go 和 anthropic_relay.go 中使用 `defer monitor.DecrConcurrency(...)`，改为延迟后 defer 只需启动 goroutine，不阻塞请求返回。

### 2. 前端轮询间隔 (Frontend)

**文件**: `one-api/web/berry/src/hooks/useConcurrencyData.js`

```js
const DEFAULT_REFRESH_INTERVAL = 15000; // 30s → 15s
```

### 3. 配额刷新间隔 (Backend)

**文件**: `one-api/monitor/quota-refresh.go`

```go
defaultQuotaRefreshInterval = 10 // 30 → 10 分钟
```

**文件**: `one-api/model/quota.go`

```go
QuotaCacheTTL = 10 * 60 // 30 分钟 → 10 分钟
```

## Acceptance Criteria (Gherkin)

### Scenarios

```gherkin
Scenario: 并发计数在请求完成后保持可见
  Given 一个启用了 Redis 的 AIHub 实例
  When 用户发送一个 API 请求到某渠道
  And 请求在 500ms 内完成
  And 前端在 15 秒内轮询并发数据
  Then 返回的并发计数应 >= 1
  And 1 分钟后再次轮询计数应回到 0

Scenario: 前端每 15 秒刷新并发数据
  Given 模型广场页面已加载
  When 等待 15 秒
  Then 应触发一次并发数据 API 请求
  And 不是 30 秒

Scenario: 配额数据每 10 分钟刷新
  Given 后台配额刷新器已启动
  When 等待 10 分钟
  Then 应触发一次全量配额查询
  And 缓存 TTL 为 600 秒
```

### General Checklist
- [ ] DecrConcurrency 改为延迟 1 分钟异步执行
- [ ] 延迟 decr 不阻塞 relay 响应
- [ ] 前端轮询间隔改为 15 秒
- [ ] 配额刷新间隔改为 10 分钟
- [ ] 配额缓存 TTL 改为 10 分钟
- [ ] 环境变量 QUOTA_REFRESH_INTERVAL 仍然生效
