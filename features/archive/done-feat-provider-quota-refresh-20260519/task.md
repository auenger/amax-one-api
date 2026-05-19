# Tasks: feat-provider-quota-refresh
## Task Breakdown
### 1. 缓存层
- [x] Redis 缓存 ChannelQuota (key: channel:quota:{id}) — 已由 feat-provider-quota-api 实现，更新 TTL 到 30 分钟
- [x] 缓存 TTL 30 分钟 — 从 10 分钟更新到 30 分钟 (model.QuotaCacheTTL)
- [x] 新增 channel:quota:last_refresh key — 跟踪上次全量刷新时间戳
### 2. 定时任务
- [x] AutomaticallyUpdateChannelQuotas goroutine — monitor/quota-refresh.go StartQuotaRefresher()
- [x] 并发控制 (max 5 concurrent) — semaphore 模式, 可配置 QUOTA_REFRESH_CONCURRENCY
- [x] 请求间隔 sleep — 1.5s 间隔避免 rate limit
- [x] 注册到 main.go 启动 — monitor.StartQuotaRefresher()
- [x] 手动全量刷新 API — POST /api/channel/quota/refresh
### 3. Gateway 代理
- [x] GET /api/v1/admin/channels/quota — one-api 已有 /api/channel/quota
- [x] POST /api/v1/admin/channels/:channelId/quota/refresh — one-api 已有 /api/channel/:id/quota/refresh
- [ ] Gateway (Fastify) 代理路由 — 延后: Gateway 源码不在仓库中 (仅有 dist/)
### 4. 低配额告警
- [x] 配额超阈值自动标记 Channel degraded — checkLowQuotaAlert() 调用 MarkChannelDegraded()
- [x] 告警日志记录 — logger.SysLog WARNING 级别
- [x] 阈值可配置 — QUOTA_LOW_THRESHOLD 环境变量, 默认 90%

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Feature created | 定时刷新与缓存 |
| 2026-05-19 | Implementation complete | 缓存 TTL 更新 + 定时 goroutine + 低配额告警 + 批量刷新 API |
