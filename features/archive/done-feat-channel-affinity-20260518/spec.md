# Feature: feat-channel-affinity 会话亲和路由

## Basic Information
- **ID**: feat-channel-affinity
- **Name**: 会话亲和路由
- **Priority**: 70
- **Size**: S
- **Dependencies**: none
- **Parent**: feat-channel-routing
- **Children**: []
- **Created**: 2026-05-18

## Description
实现按 conversation_id 的会话亲和路由。同一对话的请求固定路由到同一渠道，保证上下文连贯性。当绑定的渠道不可用时，自动重新绑定到新渠道。

核心机制：
- 在 Gateway 层提取 conversation_id（从请求 body 或自定义 header）
- 维护 conversation → channel 映射（Redis 缓存）
- one-api 转发时通过 `SpecificChannelId` 指定目标渠道
- 渠道不可用时自动重新分配

## User Value Points
1. **上下文一致性**: 同一对话的所有请求走同一渠道，避免不同渠道间的模型行为差异
2. **可追溯性**: 日志中可清晰追踪同一对话的完整渠道链路

## Context Analysis
### Reference Code
- `one-api/middleware/distributor.go` — `SpecificChannelId` 已支持指定渠道
- `one-api/model/cache.go` — `CacheGetRandomSatisfiedChannel` 可返回候选渠道列表
- `apps/gateway/src/services/proxy.ts` — 需在此层添加亲和逻辑
- `apps/gateway/src/routes/proxy.ts` — 需提取 conversation_id

### Related Documents
- one-api 的 Ability/Channel 模型

### Related Features
- feat-channel-failover (下游依赖本 Feature)
- feat-phase1-openai-proxy (已归档)

## Technical Solution

### 方案概述
在 Gateway 层实现会话亲和，利用 Redis 存储映射关系，通过 one-api 的 `SpecificChannelId` 机制指定目标渠道。

### 数据流
```
Request → Gateway 提取 conversation_id
  → Redis 查询: conversation_id → channel_id
  → 有映射: 设置 SpecificChannelId header，转发到 one-api
  → 无映射: 调用 one-api 获取候选渠道列表，选择后存入 Redis，转发
  → 渠道不可用: 清除映射，重新选择
```

### 存储设计
Redis Key: `affinity:{conversation_id}` → channel_id
TTL: 可配置（默认 1 小时，无新请求自动过期）

### conversation_id 提取策略
1. 优先从请求 body 中提取（OpenAI: 无原生字段，可从 messages 内容推断）
2. 支持自定义 header `X-Conversation-Id`
3. 支持自定义 query parameter `conversation_id`
4. 无 conversation_id 时退化为普通随机路由

### API 变更
- 请求支持 `X-Conversation-Id` header
- 无其他外部 API 变更

## Acceptance Criteria (Gherkin)
### User Story
作为 API 调用者，我希望同一对话的请求始终路由到同一渠道，以获得一致的行为体验。

### Scenarios (Given/When/Then)

#### Scenario 1: 新对话自动绑定渠道
```gherkin
Given 一个支持 gpt-4o 模型的渠道 A 和渠道 B
When 发送请求带有 X-Conversation-Id: conv-123 和 model: gpt-4o
Then 请求被路由到渠道 A（或 B）
And Redis 中存储 affinity:conv-123 → 渠道A
```

#### Scenario 2: 同对话后续请求走同一渠道
```gherkin
Given Redis 中存在 affinity:conv-123 → 渠道A
When 发送请求带有 X-Conversation-Id: conv-123 和 model: gpt-4o
Then 请求被路由到渠道 A（非随机）
```

#### Scenario 3: 绑定渠道不可用时自动重新分配
```gherkin
Given Redis 中存在 affinity:conv-123 → 渠道A
And 渠道 A 已被禁用或不可用
When 发送请求带有 X-Conversation-Id: conv-123
Then 清除旧的 affinity 映射
And 从可用渠道中重新选择渠道 B
And 更新 Redis affinity:conv-123 → 渠道B
And 请求成功完成
```

#### Scenario 4: 无 conversation_id 退化为随机路由
```gherkin
Given 请求不包含 X-Conversation-Id header 或 conversation_id 参数
When 发送请求到 /v1/chat/completions
Then 使用 one-api 默认的加权随机路由
And 不创建 affinity 映射
```

#### Scenario 5: 映射 TTL 过期后自动清理
```gherkin
Given affinity:conv-123 的 TTL 为 1 小时
And 距离最后一次请求已超过 1 小时
When 发送请求带有 X-Conversation-Id: conv-123
Then 视为新对话，重新选择渠道
```

### General Checklist
- [x] Gateway 层 conversation_id 提取逻辑
- [x] Redis affinity 映射存储与查询
- [x] SpecificChannelId header 传递到 one-api
- [x] 渠道不可用时的自动重分配
- [x] TTL 过期清理
- [x] 无 conversation_id 时的降级路由

## Merge Record
- **Completed**: 2026-05-18
- **Merged Branch**: feature/channel-affinity
- **Merge Commit**: 849b757
- **Archive Tag**: feat-channel-affinity-20260518
- **Conflicts**: none
- **Verification**: passed (20/20 tests, 5/5 Gherkin scenarios)
- **Stats**: 9 files changed, 437 insertions, 1 deletion, 1 commit
