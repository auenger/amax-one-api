# Tasks: feat-channel-affinity
## Task Breakdown
### 1. conversation_id 提取 (Gateway)
- [x] 在 proxy route 中实现 conversation_id 提取逻辑（header / query param）
- [x] 添加 X-Conversation-Id header 支持

### 2. Redis 亲和映射存储
- [x] 设计 Redis key schema: `affinity:{conversation_id}` → `channel_id`
- [x] 实现映射查询（GET）和存储（SET with TTL）
- [x] 配置 TTL（默认 1h，可通过环境变量 AFFINITY_TTL_SECONDS 调整）

### 3. 渠道选择与绑定
- [x] 实现 Gateway 层获取候选渠道列表的逻辑（查询 one-api API 或数据库）
- [x] 新对话时选择渠道并建立映射（在 Distribute 中调用 RecordAffinityMapping）
- [x] 已有映射时验证渠道可用性（在 Affinity 中间件中验证 channel status + model 支持）

### 4. SpecificChannelId 转发
- [x] 在 proxy 转发时设置 one-api 的 SpecificChannelId 参数（通过 context key）
- [x] 确保通过认证后 one-api 使用指定渠道（Affinity → Distribute 链路）

### 5. 故障重分配
- [x] 当 one-api 返回渠道不可用错误时，清除旧映射并重新选择
- [x] 记录渠道切换事件到日志
- [x] 允许 affinity 渠道失败时触发 retry（修改 shouldRetry 逻辑）

### 6. 测试
- [x] 单元测试：conversation_id 提取（7 cases + 2 edge cases）
- [x] 单元测试：Redis 映射存储与查询（key format, TTL）
- [x] 单元测试：ChannelSupportsModel（6 cases）
- [x] 测试：无 conversation_id 降级场景

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-18 | Created | 初始任务分解 |
| 2026-05-18 | All tasks completed | 17 tests pass, Go build succeeds |

## Files Changed

### New files (one-api)
- `one-api/middleware/affinity.go` — Affinity 中间件：conversation_id 提取、Redis 映射查询、SpecificChannelId 设置
- `one-api/middleware/affinity_test.go` — Affinity 单元测试（12 tests）
- `one-api/model/channel_affinity_test.go` — ChannelSupportsModel 单元测试（7 tests）

### Modified files (one-api)
- `one-api/common/ctxkey/key.go` — 添加 ConversationId context key
- `one-api/model/channel.go` — 添加 ChannelSupportsModel 辅助函数
- `one-api/router/relay.go` — 在 relay 中间件链中插入 Affinity()
- `one-api/middleware/distributor.go` — 分发后调用 RecordAffinityMapping
- `one-api/controller/relay.go` — shouldRetry 支持 affinity 渠道 failover，retry 成功后记录新映射
- `one-api/controller/anthropic_relay.go` — 同步 shouldRetry 亲和重试逻辑
