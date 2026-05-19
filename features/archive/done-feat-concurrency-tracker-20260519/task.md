# Tasks: feat-concurrency-tracker

## Task Breakdown
### 1. 后端并发追踪
- [x] 在 monitor 包中新增并发追踪模块 (`monitor/concurrency.go`)
  - Redis key 设计: `channel:concurrency:{channelId}:{model}`
  - IncrConcurrency(channelId, model) / DecrConcurrency(channelId, model)
  - GetConcurrency(channelId, model) / GetAllConcurrency()
- [x] 在 relay 管道 (`controller/relay.go`) 中嵌入并发计数
  - relayHelper 开始时 IncrConcurrency
  - defer DecrConcurrency
- [x] 新增管理员 API: GET /api/channel/concurrency
  - 返回所有渠道+模型的并发数
- [x] 新增用户 API: GET /api/user/model_concurrency
  - 返回用户可用模型的各渠道并发数
  - 短时间缓存 (5s)

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Created | 初始创建 |
| 2026-05-19 | All tasks completed | 4 tasks done, 44 tests pass (4 new + 40 existing) |

## Files Changed

### New files (one-api)
- `one-api/monitor/concurrency.go` — 并发追踪核心模块：IncrConcurrency/DecrConcurrency (Redis INCR/DECR)、GetAllConcurrency (SCAN)、GetUserConcurrency (5s 缓存)、parseConcurrencyKey
- `one-api/monitor/concurrency_test.go` — 单元测试 (7 subtests)：key 解析、无 Redis 降级
- `one-api/controller/concurrency.go` — 并发查询 API：GetChannelConcurrency (管理员)、GetUserModelConcurrency (用户)

### Modified files (one-api)
- `one-api/controller/relay.go` — 添加 IncrConcurrency/defer DecrConcurrency 追踪并发，retry 管道中也加入并发追踪
- `one-api/controller/anthropic_relay.go` — 同步添加并发追踪（主请求和 retry）
- `one-api/model/cache.go` — 新增 ChannelRef 类型和 CacheGetModelChannelRefs 函数
- `one-api/router/api.go` — 注册 /api/channel/concurrency (管理员) 和 /api/user/model_concurrency (用户) 路由
