# Tasks: feat-channel-smart-lb
## Task Breakdown
### 1. 指标采集层
- [x] 实现 Redis 滑动窗口指标存储（延迟、成功率、token 消耗）
- [x] 在请求完成后异步记录指标（fire-and-forget）
- [x] 实现指标聚合计算（P50/P95/P99、成功率）

### 2. 渠道评分模型
- [x] 实现 latency_score、reliability_score、quota_score 计算
- [x] 实现可配置权重组合（w1/w2/w3）
- [x] 实现综合评分算法

### 3. 路由策略引擎
- [x] 实现 balanced 策略（综合评分加权随机）
- [x] 实现 latency-first 策略
- [x] 实现 cost-first 策略
- [x] 实现 round-robin 策略
- [x] 策略可配置化（Redis / 数据库存储当前策略）

### 4. 智能选路集成
- [x] 新对话首次请求使用智能评分选路
- [x] 与 feat-channel-affinity 集成（首次选路 → 建立映射）
- [x] 与 feat-channel-failover 集成（故障重选时使用智能评分）

### 5. 管理接口
- [x] GET /api/channel/metrics — 渠道实时指标
- [x] GET /api/routing/strategy — 当前策略
- [x] PUT /api/routing/strategy — 设置策略

### 6. 测试
- [x] 单元测试：评分模型
- [x] 单元测试：各路由策略
- [x] 集成测试：指标采集 → 评分 → 选路完整链路
- [x] 性能测试：评分计算延迟 < 1ms

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-18 | Created | 初始任务分解 |
| 2026-05-18 | All tasks completed | 36 tests pass (17 health + 19 loadbalancer), Go build succeeds |

## Files Changed

### New files (one-api)
- `one-api/monitor/loadbalancer.go` — 智能负载均衡核心：指标采集（Redis 滑动窗口）、渠道评分模型（latency/reliability/quota 加权）、路由策略引擎（balanced/latency-first/cost-first/round-robin）、SmartChannelSelect 加权随机选路
- `one-api/monitor/loadbalancer_test.go` — 负载均衡单元测试（19 tests）：评分模型、策略权重、延迟/配额计算、指标解析、选路一致性
- `one-api/controller/routing.go` — 路由管理 API：GetChannelMetrics（渠道实时指标）、GetRoutingStrategy（当前策略查询）、SetRoutingStrategy（策略设置）

### Modified files (one-api)
- `one-api/middleware/distributor.go` — 替换静态随机选择为 smartSelectChannel 智能选路：获取候选渠道 → 过滤不健康渠道 → SmartChannelSelect 加权选择；新增 filterHealthyChannels 和 CacheGetSatisfiedChannels 支持
- `one-api/model/cache.go` — 新增 CacheGetSatisfiedChannels 函数：返回指定分组+模型的所有候选渠道（用于智能选路）
- `one-api/controller/relay.go` — 添加请求延迟计时和 RecordMetrics 调用（成功/失败均记录）
- `one-api/controller/anthropic_relay.go` — 同步添加请求延迟计时和 RecordMetrics 调用
- `one-api/main.go` — 添加 monitor.StartMetricsCollector() 启动调用
- `one-api/router/api.go` — 注册渠道指标和路由策略管理接口（GET /api/channel/metrics, GET/PUT /api/routing/strategy）
