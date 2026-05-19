# Feature: feat-concurrency-tracker 并发量追踪后端

## Basic Information
- **ID**: feat-concurrency-tracker
- **Name**: 并发量追踪后端
- **Priority**: 75
- **Size**: S
- **Dependencies**: none
- **Parent**: feat-channel-concurrency
- **Children**: none
- **Created**: 2026-05-19

## Description
在 relay 管道中加入并发计数器，按 channel+model 维度实时追踪并发请求数，使用 Redis 存储并提供查询 API。复用已有的 monitor 指标基础设施。

## User Value Points
1. **实时并发计数** — 系统能准确追踪每个渠道+模型的当前活跃请求数

## Context Analysis
### Reference Code
- `one-api/controller/relay.go` — relay 管道入口，`Relay()` → `relayHelper()` 流程
- `one-api/monitor/loadbalancer.go` — 已有 Redis 指标收集 (`Emit`, `RecordMetrics`, `ChannelMetrics`)
- `one-api/monitor/metric.go` — 指标收集器
- `one-api/router/api.go` — API 路由注册
- `one-api/middleware/distributor.go` — 渠道选择中间件

### Related Documents
- Redis key 约定: `channel:metrics:{id}` (已有), 新增 `channel:concurrency:{channelId}:{model}`
- API 路径: 新增 `/api/channel/concurrency` (管理员) 和 `/api/user/model_concurrency` (用户)

### Related Features
- [[feat-channel-smart-lb]] — 复用其 Redis 指标基础设施

## Technical Solution
- Redis INCR/DECR 实现原子并发计数，key 格式 `channel:concurrency:{channelId}:{model}`，TTL 10min
- 在 `Relay()` 和 `RelayAnthropic()` 入口处 IncrConcurrency + defer DecrConcurrency
- Retry 管道中对新选中的 channel 也加入并发追踪
- 管理员 API: `GET /api/channel/concurrency` 扫描所有 Redis key 返回全量并发数据
- 用户 API: `GET /api/user/model_concurrency` 基于 group 权限过滤，5s 内存缓存
- 无 Redis 时所有函数优雅降级为 no-op

## Acceptance Criteria (Gherkin)
### User Story
作为系统，我需要实时追踪每个渠道+模型的并发请求数，以便前端展示和负载均衡决策。

### Scenarios (Given/When/Then)
```gherkin
Scenario: 请求开始时并发计数增加
  Given 渠道 1 支持模型 "gpt-4o"
  When 用户通过渠道 1 发起 gpt-4o 请求
  Then Redis key "concurrency:{channelId}:{model}" 的值 +1

Scenario: 请求结束时并发计数减少
  Given 渠道 1 的 gpt-4o 当前并发数为 3
  When 一个请求完成（成功或失败）
  Then 并发数变为 2

Scenario: 异常中断也能正确递减
  Given 一个请求正在处理中
  When 请求因 panic 或 context cancel 异常中断
  Then 并发计数器仍然正确 -1

Scenario: 管理员查询全局并发状态
  Given 系统中有多个渠道正在处理请求
  When 管理员调用 GET /api/channel/concurrency
  Then 返回所有渠道+模型的当前并发数列表

Scenario: 用户查询可用模型并发状态
  Given 用户已认证
  When 调用 GET /api/user/model_concurrency
  Then 返回用户可用模型的各渠道并发数

Scenario: 并发数据有合理缓存
  Given 并发 API 被频繁调用
  When 连续多次请求
  Then 使用短时间缓存（如 5s）避免 Redis 压力过大
```

### General Checklist
- [x] 使用 defer 确保异常路径也能递减
- [x] Redis key 设置 TTL 防止残留
- [x] 并发计数与已有 metrics 体系一致

## Merge Record
- **Completed**: 2026-05-19
- **Branch**: feature/concurrency-tracker
- **Merge Commit**: 2d16b0e
- **Archive Tag**: feat-concurrency-tracker-20260519
- **Conflicts**: None
- **Verification**: 6/6 Gherkin scenarios passed, 44/44 tests passed
- **Stats**: 1 commit, 7 files changed, 435 insertions, 1 deletion
