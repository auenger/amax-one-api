# Tasks: feat-channel-failover
## Task Breakdown
### 1. 渠道健康检查定时任务
- [x] 实现渠道探测逻辑（轻量级 API 调用）
- [x] 配置检查间隔（默认 30s，可通过环境变量调整）
- [x] 使用独立的 scheduler goroutine（StartHealthChecker）

### 2. Redis 渠道状态存储
- [x] 设计 channel:health:{channel_id} 数据结构
- [x] 实现状态更新与查询方法
- [x] 实现健康状态枚举：healthy / degraded / unhealthy

### 3. 故障判定引擎
- [x] 实现连续失败计数与阈值判定
- [x] 实现错误率计算
- [x] 实现延迟异常检测（P95 基线）
- [x] 状态转换规则：healthy ↔ degraded ↔ unhealthy

### 4. 故障转移路由逻辑
- [x] 在 Gateway proxy 转发前检查渠道健康状态
- [x] Unhealthy 渠道触发重分配
- [x] 与 feat-channel-affinity 的亲和映射联动
- [x] 全部不可用时返回 503

### 5. 自动恢复机制
- [x] Unhealthy → Degraded 恢复规则
- [x] Degraded → Healthy 恢复规则
- [x] 恢复后自动纳入候选池

### 6. 故障事件记录
- [x] 渠道状态变更时写入日志
- [x] 记录故障转移事件（哪个渠道切到哪个渠道）
- [x] 预留告警接口（webhook / 后续 Phase 5 集成）

### 7. 测试
- [x] 单元测试：故障判定逻辑
- [x] 单元测试：状态转换规则
- [x] 集成测试：故障转移完整链路
- [x] 测试：自动恢复场景

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-18 | Created | 初始任务分解 |
| 2026-05-18 | All tasks completed | 17 tests pass, Go build succeeds |

## Files Changed

### New files (one-api)
- `one-api/monitor/health.go` — 健康检查核心：ChannelHealth 数据模型、Redis 存储、故障判定引擎（EvaluateHealth/EvaluateRecovery）、自动恢复规则、定时探测调度器（StartHealthChecker）、健康感知路由辅助函数
- `one-api/monitor/health_test.go` — 健康检查单元测试（17 tests）：故障判定、状态转换、恢复场景、健康键格式

### Modified files (one-api)
- `one-api/middleware/affinity.go` — 添加 monitor import 和健康感知验证：unhealthy 渠道自动清除亲和映射并重新路由
- `one-api/middleware/distributor.go` — 添加 common/monitor import 和 findHealthyAlternative 函数：随机选择的 unhealthy 渠道自动 failover
- `one-api/controller/relay.go` — 重试循环跳过 unhealthy 渠道，429 错误触发 MarkChannelDegraded
- `one-api/controller/anthropic_relay.go` — 同步重试循环的 health-aware 跳过逻辑
- `one-api/main.go` — 添加 monitor import 和 StartHealthChecker() 启动调用（可通过 HEALTH_CHECK_ENABLED=false 禁用）
