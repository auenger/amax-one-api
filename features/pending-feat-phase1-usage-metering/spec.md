# Feature: feat-phase1-usage-metering Token 用量计量

## Basic Information
- **ID**: feat-phase1-usage-metering
- **Name**: Token 用量计量 (Token Usage Metering)
- **Priority**: 80
- **Size**: S
- **Dependencies**: [feat-phase1-auth-pool, feat-phase1-openai-proxy]
- **Parent**: feat-phase1-gateway
- **Children**: []
- **Created**: '2026-05-12'

## Description
从代理响应中提取 token usage 数据并持久化，为 Virtual Key 的 Budget 控制提供真实用量驱动。

由于 new-api 统一返回 OpenAI 兼容格式，usage 提取只需处理 OpenAI 格式。

Phase 1 最小范围：
- 从 new-api 返回的 OpenAI 格式响应中提取 usage
- 按请求写入 UsageLog 表
- 按维度 (VirtualKey / Provider / Model) 聚合累计用量
- auth-pool 的 Budget 检查基于实际累计 token 数

不包含：账单计算、成本分摊、报表 UI、Redis 实时计数 — 留给 Phase 3 治理层。

## User Value Points
1. **运维人员**: 可查询各 Virtual Key / Provider / Model 的实际 token 用量
2. **安全团队**: Budget 控制基于真实用量数据，防止超支
3. **开发者**: 通过 API 了解自己的 token 消耗情况

## Context Analysis
### Reference Code
- new-api: 统一返回 OpenAI 格式 (含 usage 字段)
### Related Documents
- project-context.md: Architecture — billing-service
- project-context.md: Roadmap Phase 3 (Token 计量账单)
### Related Features
- Parent: feat-phase1-gateway
- Dependency: feat-phase1-openai-proxy (提取 usage)
- Dependency: feat-phase1-auth-pool (Budget 检查)

## Technical Solution

### 数据模型 (Prisma)
- `UsageLog`: 用量日志 (id, virtual_key_id, provider_id, model_id, model_name, prompt_tokens, completion_tokens, total_tokens, request_id, request_type[chat|embedding], status[success|error], error_code, latency_ms, created_at)
  - 索引: (virtual_key_id, created_at), (provider_id, created_at), (model_id, created_at), request_id (unique)

### 内部接口 (供 openai-proxy 调用)
- `recordUsage(params: RecordUsageParams) → UsageLog` — 记录单次请求的 token 用量
  ```
  RecordUsageParams {
    virtualKeyId: string
    providerId: string
    modelId: string
    modelName: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    requestId: string
    requestType: 'chat' | 'embedding'
    status: 'success' | 'error'
    errorCode?: string
    latencyMs: number
  }
  ```

### 内部接口 (供 auth-pool 调用)
- `getUsageSummary(virtualKeyId: string, since: Date) → { promptTokens, completionTokens, totalTokens }` — 查询指定 Virtual Key 在某时间点后的累计用量

### Usage 提取逻辑
根据请求协议类型，从对应格式的响应中提取 usage：

**OpenAI 协议响应**:
- 非流式: `response.usage` → `{ prompt_tokens, completion_tokens, total_tokens }`
- 流式: 最后一个非 `[DONE]` chunk 的 `usage` 字段

**Anthropic 协议响应**:
- 非流式: `response.usage` → `{ input_tokens, output_tokens }`
- 流式: `event: message_delta` 中的 `usage` 字段

**字段映射**: `input_tokens` → `prompt_tokens`, `output_tokens` → `completion_tokens`, `total_tokens` = 二者之和

**错误响应**: prompt_tokens 从请求体估算 (字符数 / 4)，completion_tokens = 0

### 外部 API 端点
- `GET /v1/usage` — 查询用量记录 (支持 model_id, start_date, end_date 过滤，cursor-based 分页)
  - **Admin API Key**: 支持所有过滤字段 (virtual_key_id, provider_id, model_id)
  - **Virtual Key**: 只能查自己的用量，支持 model_id 过滤，**不支持 provider_id 过滤**
- `GET /v1/usage/summary` — 用量汇总
  - **Admin API Key**: 支持按 VirtualKey / Provider / Model 维度聚合
  - **Virtual Key**: 只能查自己的用量，**只支持按 Model 维度聚合 (不含 Provider)**

### 集成方式
openai-proxy 在请求完成后调用 `recordUsage()`:
- fire-and-forget 模式，写入失败不影响请求响应
- 写入失败记录 warn 日志

### auth-pool Budget 集成
- `validateVirtualKey()` 调用 `getUsageSummary(virtualKeyId, budget.reset_at)` 获取累计用量
- 若累计 totalTokens >= budget.token_limit，返回 `{ valid: false, reason: 'budget_exceeded' }`

## Acceptance Criteria (Gherkin)
### User Story
作为平台管理员，我希望系统能记录每次 API 请求的 token 用量，以便实现基于真实数据的预算控制。

### Scenarios (Given/When/Then)

#### Scenario 1: 成功请求记录用量
```gherkin
Given new-api 中 OpenAI Channel 已配置且 Key 可用
And Virtual Key "prod-app" 已创建
When openai-proxy 转发请求到 new-api (model: "gpt-4o")
And new-api 返回 usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
Then 系统调用 recordUsage() 写入 UsageLog
And UsageLog 记录包含正确的 token 数和 virtual_key_id
```

#### Scenario 2: 流式请求记录用量
```gherkin
Given new-api 中 Anthropic Channel 已配置且 Key 可用
And Virtual Key "prod-app" 已创建
When openai-proxy 转发流式请求到 new-api (model: "claude-sonnet-4-20250514", stream: true)
And new-api 返回 OpenAI 格式 SSE 流
Then 系统从最后一个 chunk 提取 usage
And 调用 recordUsage() 记录
```

#### Scenario 3: Budget 检查基于真实用量
```gherkin
Given Virtual Key "prod-app" 的 budget.token_limit 为 1000000
And reset_at 为 "2026-05-01T00:00:00Z"
And 该 VK 自 reset_at 以来累计使用 1000000 tokens
When auth-pool 调用 getUsageSummary(virtualKeyId, reset_at)
Then 返回 totalTokens: 1000000
When auth-pool validateVirtualKey 检查 Budget
Then 返回 { valid: false, reason: "budget_exceeded" }
```

#### Scenario 4: 错误请求仍记录
```gherkin
Given openai-proxy 转发请求到 new-api
And new-api 返回 HTTP 500 错误
Then openai-proxy 仍调用 recordUsage() 记录 (status: "error", prompt_tokens: 估算值, completion_tokens: 0)
```

#### Scenario 5: 查询用量记录 (Admin 视角)
```gherkin
Given 系统已有 20 条 UsageLog 记录
When 运维人员 (Admin API Key) 请求 GET /v1/usage?virtual_key_id=xxx&limit=10
Then 返回该 Virtual Key 最近的 10 条用量记录
And 包含 cursor-based 分页信息
And 包含 provider_id 字段
```

#### Scenario 5.1: 查询用量记录 (用户视角 — 隐藏 Provider)
```gherkin
Given 系统已有 20 条 UsageLog 记录
When 开发者 (Virtual Key) 请求 GET /v1/usage?limit=10
Then 返回自己的最近 10 条用量记录
And 每条记录包含 model_name, prompt_tokens, completion_tokens, total_tokens
And **不包含** provider_id 字段
And 不支持 provider_id 过滤参数
```

#### Scenario 6: 用量汇总 (Admin 视角)
```gherkin
Given 系统已有多个 Provider 的用量记录
When 运维人员 (Admin API Key) 请求 GET /v1/usage/summary?group_by=provider&start_date=2026-05-01
Then 返回按 Provider 维度聚合的 token 用量
```

#### Scenario 6.1: 用量汇总 (用户视角 — 仅按模型)
```gherkin
Given 系统已有多个模型的用量记录
When 开发者 (Virtual Key) 请求 GET /v1/usage/summary?group_by=model&start_date=2026-05-01
Then 返回按 Model 维度聚合的 token 用量
And **不支持** group_by=provider 参数
```

### General Checklist
- [ ] Prisma schema (UsageLog) 定义完成，含索引
- [ ] recordUsage() 内部接口实现
- [ ] getUsageSummary() 内部接口实现
- [ ] openai-proxy 集成 recordUsage() (非流式)
- [ ] openai-proxy 集成 recordUsage() (流式 SSE)
- [ ] auth-pool validateVirtualKey 集成 Budget 检查
- [ ] GET /v1/usage 查询 API 实现
- [ ] GET /v1/usage/summary 汇总 API 实现
- [ ] 错误请求仍记录用量
- [ ] cursor-based 分页实现
- [ ] 错误响应 RFC 7807 格式
