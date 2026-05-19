# Tasks: feat-provider-quota-api
## Task Breakdown
### 1. 数据结构
- [x] 定义 ChannelQuota / QuotaWindow 结构体 (one-api/model/quota.go)
### 2. 提供商适配器
- [x] 智谱 GLM 配额查询 (coding plan API)
- [x] MiniMax 配额查询 (coding plan API)
- [x] DeepSeek 余额查询 (扩展现有)
- [x] SiliconFlow 余额查询 (扩展现有)
- [x] OpenRouter 余额查询 (扩展现有)
- [x] StepFun 余额查询
### 3. API 路由
- [x] GET /api/channel/:id/quota — 单个 Channel 配额查询
- [x] GET /api/channel/quota — 批量查询（从缓存）
- [x] POST /api/channel/:id/quota/refresh — 强制刷新
- [x] GET /api/channel/quotas_map — channelId->QuotaSummary 映射
### 4. 注册路由
- [x] 在 router/api.go 中注册新 API

## Files Changed
| File | Action | Description |
|------|--------|-------------|
| one-api/model/quota.go | NEW | ChannelQuota, QuotaWindow, QuotaSummary 结构体 + Redis key helper |
| one-api/controller/channel-quota.go | NEW | 6 个提供商适配器 + Redis 缓存 + 4 个 API handler |
| one-api/router/api.go | MODIFIED | 注册 4 条 quota 路由 |

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Feature created | 提供商配额查询 API |
| 2026-05-19 | Implementation complete | 全部 4 组任务完成，go vet/build 通过 |
