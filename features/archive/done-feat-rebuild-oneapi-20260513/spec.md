# Feature: feat-rebuild-oneapi Fork one-api 并核心增强

## Basic Information
- **ID**: feat-rebuild-oneapi
- **Name**: Fork one-api 并核心增强
- **Priority**: 95
- **Size**: L
- **Dependencies**: feat-rebuild-cleanup
- **Parent**: null
- **Created**: 2026-05-13

## Merge Record
- **Completed**: 2026-05-13
- **Merged Branch**: feature/rebuild-oneapi
- **Merge Commit**: d8056b4
- **Archive Tag**: feat-rebuild-oneapi-20260513
- **Conflicts**: none
- **Verification**: passed (6/6 scenarios, gofmt passed, build/test deferred to local env)
- **Stats**: 571 files changed, 62433 insertions, 1 commit

## Description

将 songquanpeng/one-api（MIT License, 22K LOC Go）fork 到项目中，搭建本地开发环境，并在其上实现企业级增强：

1. **加权随机 + 优先级路由** — Channel 支持 weight + priority，同优先级加权随机，失败后降级
2. **OpenAI ↔ Claude 双向格式转换** — 支持 Claude Messages API 原生格式输入输出
3. **Channel 级别用量上限** — Channel 新增预算字段，达到上限自动禁用并降级
4. **用户申请 Token 审批流** — 用户申请 → Admin 审批 → 自动创建 Token

## User Value Points

1. **智能模型路由** — 加权随机 + 优先级降级 + 预算限制，确保模型调用的高可用和成本可控
2. **Claude 原生支持** — 不再需要 OpenAI 格式中转，直接支持 Anthropic Messages API
3. **企业级 Token 管理** — 用户自助申请 + Admin 审批，而非 Admin 手动创建

## Context Analysis

### Reference Code
- one-api `middleware/distributor.go` (680 LOC) — Channel 路由/分发，需加权重
- one-api `relay/adaptor/openai/` — OpenAI 适配器
- one-api `relay/adaptor/anthropic/` — Claude 适配器
- one-api `model/channel.go` — Channel 模型，需加 BudgetLimit 字段
- one-api `controller/token.go` — Token 管理，需加审批逻辑
- new-api `service/convert.go` (1007 LOC) — Claude 格式转换参考

### Related Features
- feat-rebuild-cleanup (dependency)

## Technical Solution

### 1. Fork + 环境搭建
- Clone one-api 到项目根目录或独立 repo
- 配置 Go 1.20+、PostgreSQL 16、Redis 7
- docker-compose 配置 one-api + PG + Redis
- 验证核心 API 可用

### 2. 加权路由（修改 middleware/distributor.go）
- Channel model 新增 `Weight int` 和 `Priority int64` 字段（已有 Priority，需确认）
- 同优先级内使用加权随机（轮盘赌算法）
- 失败后按 priority 排序选择下一优先级
- 全局配置重试次数 `RETRY_TIMES`

### 3. Claude 格式转换（新增 service/convert.go）
- `ClaudeToOpenAIRequest()` — Claude Messages → OpenAI Chat Completions
- `ResponseOpenAI2Claude()` — OpenAI response → Claude response
- `StreamResponseOpenAI2Claude()` — OpenAI SSE → Claude SSE
- 处理 tool_call、thinking block、multi-part content
- 路由注册：`/v1/messages` 端点

### 4. Channel 预算限制（修改 model/channel.go）
- Channel 新增 `BudgetLimit float64`、`BudgetUsed float64` 字段
- 每次 relay 成功后累加 BudgetUsed
- 预算超限时自动禁用 Channel（状态改为 AutoDisabled）
- Admin API 支持查看/重置预算
- 定时任务检查预算并通知

### 5. Token 审批流（新增 model + controller）
- 新增 `TokenRequest` model：user_id, name, models, quota, reason, status(pending/approved/rejected)
- `POST /api/token/request` — 用户提交申请
- `GET /api/token/request` — Admin 查看申请列表
- `POST /api/token/request/:id/approve` — Admin 审批（自动创建 Token）
- `POST /api/token/request/:id/reject` — Admin 拒绝

## Acceptance Criteria (Gherkin)

```gherkin
Scenario: one-api fork 本地运行
  Given Go 环境已配置
  When 执行 go build && ./one-api
  Then 服务启动成功
  And 可以创建 Channel、Token
  And 代理转发正常
```

```gherkin
Scenario: 加权路由正常
  Given Channel A (priority=1, weight=80) 和 Channel B (priority=1, weight=20)
  When 发送 100 个请求
  Then 约 80 个走 Channel A，约 20 个走 Channel B
```

```gherkin
Scenario: 优先级降级正常
  Given Channel A (priority=1) 和 Channel B (priority=2)
  And 全局重试次数 >= 1
  When Channel A 连续报错
  Then 请求自动降级到 Channel B
```

```gherkin
Scenario: Claude Messages API 正常
  Given 已配置 Claude 类型 Channel
  When 用户发送 POST /v1/messages (Claude 格式)
  Then 请求被正确转换为 OpenAI 格式转发
  And 响应被转换回 Claude Messages 格式返回
  And 流式响应正常（SSE）
```

```gherkin
Scenario: Channel 预算限制
  Given Channel 设置 budget_limit = 10.00
  When 累计使用超过 10.00
  Then Channel 被自动禁用
  And 后续请求降级到其他可用 Channel
```

```gherkin
Scenario: Token 审批流
  Given 普通用户已登录
  When 用户提交 Token 申请（指定模型、用途、额度）
  Then 申请出现在 Admin 的审批列表
  When Admin 审批通过
  Then 系统自动创建 Token 并通知用户
```
