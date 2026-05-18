# Feature: feat-channel-failover 渠道故障转移

## Basic Information
- **ID**: feat-channel-failover
- **Name**: 渠道故障转移
- **Priority**: 70
- **Size**: S
- **Dependencies**: feat-channel-affinity
- **Parent**: feat-channel-routing
- **Children**: []
- **Created**: 2026-05-18

## Description
在会话亲和基础上，增强渠道故障检测与自动转移能力：
1. **主动健康检查** — 定期探测渠道可用性，而非被动等待失败
2. **智能故障转移** — 渠道不可用时（错误率飙升/额度不足/响应超时），自动切换到备选渠道
3. **故障恢复** — 渠道恢复后自动重新纳入候选池
4. **故障通知** — 渠道状态变更时记录日志并可触发告警

## User Value Points
1. **服务可用性**: 渠道故障时用户无感知切换，请求不会失败
2. **快速故障发现**: 主动健康检查比被动检测更快发现问题
3. **自动恢复**: 渠道恢复后无需人工干预即可恢复服务

## Context Analysis
### Reference Code
- `one-api/controller/relay.go` — 现有重试逻辑（被动，基于 HTTP 状态码）
- `one-api/monitor/channel.go` — 现有自动禁用（被动，基于错误率）
- `one-api/model/cache.go` — 渠道缓存与选择
- `feat-channel-affinity` — 亲和路由（前置依赖）

### Related Features
- feat-channel-affinity (前置依赖)
- feat-channel-smart-lb (下游依赖本 Feature)

## Technical Solution

### 方案概述
在 Gateway 层实现主动健康检查和故障转移编排层，与 one-api 现有的被动检测互补。

### 健康检查机制
```
定时任务（每 30s）:
  → 查询所有 active 渠道
  → 对每个渠道发送轻量级探测请求（如 models list 或短 completion）
  → 记录响应时间和状态
  → 更新 Redis 中的渠道健康状态
```

### Redis 渠道状态模型
```
channel:health:{channel_id} → {
  status: "healthy" | "degraded" | "unhealthy",
  latency_ms: 230,
  error_rate: 0.02,
  last_check: "2026-05-18T10:00:00Z",
  consecutive_failures: 0
}
```

### 故障判定规则
- **Unhealthy**: 连续 3 次探测失败，或错误率 > 50%
- **Degraded**: 延迟 > P95 基线的 2 倍，或错误率 > 10%
- **Healthy**: 探测成功且指标正常

### 故障转移流程
```
Gateway 收到请求
  → 查询亲和渠道
  → 检查渠道健康状态 (Redis)
  → Healthy: 直接使用
  → Degraded: 使用但标记，可考虑降级到其他渠道
  → Unhealthy: 清除亲和映射，从 Healthy 渠道中选择替代
  → 无 Healthy 渠道: 使用 Degraded 渠道（降级服务）
  → 全部不可用: 返回 503
```

### 故障恢复
- Unhealthy 渠道在连续 2 次探测成功后恢复为 Degraded
- Degraded 渠道在连续 3 次探测成功后恢复为 Healthy
- 恢复后自动重新纳入路由候选池

## Acceptance Criteria (Gherkin)
### User Story
作为 API 调用者，我希望当某个渠道出现故障时，系统能自动将我的请求切换到其他可用渠道，而不需要我手动处理。

### Scenarios (Given/When/Then)

#### Scenario 1: 主动健康检查检测到渠道故障
```gherkin
Given 渠道 A 和渠道 B 都支持 gpt-4o 且状态为 Healthy
When 渠道 A 连续 3 次健康检查失败
Then 渠道 A 状态变为 Unhealthy
And 后续请求不再路由到渠道 A
```

#### Scenario 2: 故障转移 - 亲和渠道不可用
```gherkin
Given conversation conv-123 亲和绑定到渠道 A
And 渠道 A 状态为 Unhealthy
When 发送请求带有 X-Conversation-Id: conv-123
Then 清除 conv-123 的亲和映射
And 从 Healthy 渠道（如渠道 B）中选择替代
And 更新 conv-123 → 渠道 B
And 请求成功完成
```

#### Scenario 3: 额度不足触发故障转移
```gherkin
Given 渠道 A 的 API 额度已用尽
When one-api 返回 429 (rate limit) 错误
Then 标记渠道 A 为 Degraded
And 重试请求到其他可用渠道
And 请求成功完成
```

#### Scenario 4: 渠道自动恢复
```gherkin
Given 渠道 A 状态为 Unhealthy
When 渠道 A 连续 2 次健康检查成功
Then 渠道 A 状态恢复为 Degraded
When 渠道 A 又连续 3 次健康检查成功
Then 渠道 A 状态恢复为 Healthy
And 渠道 A 重新纳入路由候选池
```

#### Scenario 5: 所有渠道不可用时返回 503
```gherkin
Given 渠道 A 和渠道 B 都为 Unhealthy
When 发送请求到 /v1/chat/completions
Then 返回 HTTP 503 Service Unavailable
And 响应体包含 RFC 7807 Problem Details
```

### General Checklist
- [x] 定时健康检查任务
- [x] Redis 渠道状态存储
- [x] 故障判定与状态转换
- [x] 故障转移路由逻辑
- [x] 自动恢复机制
- [x] 渠道状态变更日志

## Merge Record
- **Completed**: 2026-05-18
- **Merged Branch**: feature/channel-failover
- **Merge Commit**: 1e2bb61
- **Archive Tag**: feat-channel-failover-20260518
- **Conflicts**: none
- **Verification**: passed (37/37 tests, 5/5 Gherkin scenarios)
- **Stats**: 7 files changed, 728 insertions, 1 commit
