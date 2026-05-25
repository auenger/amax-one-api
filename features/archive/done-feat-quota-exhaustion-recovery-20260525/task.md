# Tasks: feat-quota-exhaustion-recovery

## Task Breakdown

### 1. health.go 扩展 — 配额耗尽标记
- [x] `ChannelHealth` 新增 `Reason string` 字段
- [x] 新增 `MarkChannelQuotaExhausted(channelId int, reason string)` 函数
- [x] 新增 `MarkChannelQuotaRecovered(channelId int)` 函数
- [x] 新增 `IsQuotaExhausted(channelId int) bool` 查询函数
- [x] Redis key `channel:quota:exhausted:{channelId}` 管理

### 2. quota-refresh.go 扩展 — 耗尽检测
- [x] 在 `refreshChannelQuota()` 末尾添加耗尽检测逻辑
- [x] 检查所有 `QuotaWindow.UsedPercent >= QUOTA_EXHAUSTION_THRESHOLD`
- [x] 触发 `MarkChannelQuotaExhausted` 或 `MarkChannelQuotaRecovered`
- [x] 维护内存中的耗尽渠道列表（线程安全）

### 3. quota-refresh.go 新增 — 加速轮询器
- [x] 新增 `StartExhaustionPoller()` goroutine
- [x] 1 分钟间隔遍历已耗尽渠道列表
- [x] 仅查询已耗尽渠道的配额（复用 `queryProviderQuota`）
- [x] 检测恢复后调用 `MarkChannelQuotaRecovered` 并从列表移除
- [x] 环境变量 `QUOTA_EXHAUSTION_POLL_INTERVAL` 配置

### 4. 环境变量与配置
- [x] 新增 `QUOTA_EXHAUSTION_THRESHOLD` (默认 100)
- [x] 新增 `QUOTA_EXHAUSTION_POLL_INTERVAL` (默认 60s)
- [x] 新增 `QUOTA_RECOVERY_THRESHOLD` (默认 95)

### 5. 启动注册
- [x] `main.go` 中注册 `monitor.StartExhaustionPoller()`
- [x] 条件：Redis 启用

### 6. 日志与可观测性
- [x] 耗尽事件日志（channel ID、窗口信息、用量百分比）
- [x] 恢复事件日志
- [x] 加速轮询启动/停止日志

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-25 | Feature created | 需求分析完成，方案设计完成 |
| 2026-05-25 | Implementation complete | health.go + quota-refresh.go + main.go，所有包编译通过 |
