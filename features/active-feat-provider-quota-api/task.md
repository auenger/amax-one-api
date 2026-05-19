# Tasks: feat-provider-quota-api
## Task Breakdown
### 1. 数据结构
- [ ] 定义 ChannelQuota / QuotaWindow 结构体 (one-api/model/)
### 2. 提供商适配器
- [ ] 智谱 GLM 配额查询 (coding plan API)
- [ ] MiniMax 配额查询 (coding plan API)
- [ ] DeepSeek 余额查询 (扩展现有)
- [ ] SiliconFlow 余额查询 (扩展现有)
- [ ] OpenRouter 余额查询 (扩展现有)
- [ ] StepFun 余额查询
### 3. API 路由
- [ ] GET /api/channel/:id/quota — 单个 Channel 配额查询
- [ ] GET /api/channel/quota — 批量查询（从缓存）
- [ ] POST /api/channel/:id/quota/refresh — 强制刷新
### 4. 注册路由
- [ ] 在 router 中注册新 API

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Feature created | 提供商配额查询 API |
