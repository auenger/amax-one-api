# Feature: feat-phase1-openai-proxy API 代理网关

## Basic Information
- **ID**: feat-phase1-openai-proxy
- **Name**: API 代理网关 (API Proxy Gateway)
- **Priority**: 80
- **Size**: S
- **Dependencies**: [feat-phase1-model-registry, feat-phase1-auth-pool]
- **Parent**: feat-phase1-gateway
- **Children**: []
- **Created**: 2026-05-08

## Description
Fastify 代理层，**对外同时暴露 OpenAI 和 Anthropic 两套协议**，透传到内部 new-api 服务。用户选择自己喜欢的 SDK/协议调用，底层路由到哪个 provider 完全透明。

核心能力：
- **OpenAI 协议端点**: Chat Completions, Embeddings, Models
- **Anthropic 协议端点**: Messages (供 Claude Code 等 Anthropic SDK 使用)
- 双协议流式支持: OpenAI SSE + Anthropic SSE
- VK 验证、别名解析、Budget 检查
- 响应 provider 信息清洗
- Usage 提取

**不包含**: 协议转换、Key 池化 — 由 new-api 处理。我们只做双协议入口透传。

## User Value Points
1. **OpenAI SDK 用户**: 用 OpenAI SDK 调 `/v1/chat/completions`，无缝对接
2. **Claude Code / Anthropic SDK 用户**: 用 Anthropic SDK 调 `/v1/messages`，无缝对接
3. **跨协议路由**: 用 Anthropic 协议调用的请求可能路由到 OpenAI 后端 (或反之)，用户无感

## User Value Points
1. **开发者**: 用标准 OpenAI SDK 访问所有模型，零切换成本
2. **安全**: VK 不直接暴露 new-api，Budget 拦截在请求到达 new-api 之前

## Context Analysis
### Reference Code
- new-api: 内部转发引擎
### Related Documents
- project-context.md: Architecture — api-gateway
### Related Features
- Parent: feat-phase1-gateway
- Dependency: feat-phase1-model-registry (模型路由)
- Dependency: feat-phase1-auth-pool (VK 验证)
- Dependency: feat-phase1-usage-metering (用量记录)

## Technical Solution

### 架构设计
```
OpenAI SDK Client ──→ POST /v1/chat/completions ─┐
                                                  │
Anthropic SDK /   ──→ POST /v1/messages ─────────┤
Claude Code                                         │
                                                    ▼
                                              Fastify Proxy
                                                    │
                                          ┌─────────┼─────────┐
                                          │  1. VK 验证         │
                                          │  2. 别名解析         │
                                          │  3. Auth 替换       │
                                          │  4. 透传 → new-api  │
                                          │  5. 响应清洗        │
                                          │  6. Usage 提取      │
                                          └─────────┼─────────┘
                                                    │
                                                    ▼
                                              new-api (内部)
                                                    │
                                              Provider APIs
```

### 双协议路由逻辑
用户请求的协议 (OpenAI/Anthropic) 与底层 Provider 是 **解耦** 的：
- 用户用 Anthropic 协议调用 → new-api 自动转换为 OpenAI 协议转发 (如果后端是 OpenAI)
- 用户用 OpenAI 协议调用 → new-api 自动转换为 Anthropic 协议转发 (如果后端是 Anthropic)
- new-api 处理所有输入/输出的协议转换，我们的 Fastify 层只做透传

### 请求处理流程
1. **Auth**: 从 `Authorization: Bearer {vk}` (OpenAI) 或 `x-api-key: {vk}` (Anthropic) 提取 VK，调用 `validateVirtualKey()`
2. **Resolve**: 调用 `resolveModel(model_name)` 解析别名
3. **Replace**: 替换认证 header 为 `Authorization: Bearer {new_api_internal_token}`
4. **Proxy**: 透传请求到 new-api (保持原始请求格式，new-api 会处理协议转换)
5. **Sanitize**: 响应中移除 provider 信息，`model` 字段返回用户请求的原始名/别名
6. **Response**: 返回清洗后的响应给客户端 (保持用户请求的协议格式)
7. **Meter**: 异步提取响应中的 `usage` 字段，调用 `recordUsage()`

### API 端点

#### OpenAI 协议端点
- `POST /v1/chat/completions` — Chat Completions (stream + non-stream, 透传到 new-api)
- `POST /v1/embeddings` — Embeddings (透传到 new-api)
- `GET /v1/models` — Models list (代理到 model-registry)

#### Anthropic 协议端点
- `POST /v1/messages` — Messages API (stream + non-stream, 透传到 new-api)
  - 兼容 Anthropic Messages API 格式 (messages, model, max_tokens, system, tools 等)
  - 认证方式: `x-api-key: {virtual_key}` 或 `Authorization: Bearer {virtual_key}`
  - 流式: Anthropic SSE 格式 (`event: message_start`, `event: content_block_delta`, `event: message_stop`)
  - 非 流式: 标准 Anthropic Messages 响应格式

### 流式响应处理
**OpenAI SSE**: Fastify pipe `data: {"choices": [...]}` 格式，最后一个 chunk 包含 `usage`
**Anthropic SSE**: Fastify pipe `event: message_start/delta/stop` 格式，`message_stop` 事件包含 `usage`

两路 SSE 均直接透传，不做内容转换。流式完成后提取 usage 调用 `recordUsage()`。

### new-api 代理配置
- new-api 地址从环境变量 `NEW_API_BASE_URL` 读取 (如 `http://new-api:3000`)
- Internal token 从环境变量 `NEW_API_INTERNAL_TOKEN` 读取
- 超时: 30s (可配置)

### 错误处理
所有错误统一为 RFC 7807 格式，**不泄漏 provider 信息**：
- VK 验证失败: 返回 HTTP 401 (RFC 7807, title: "Unauthorized")
- 模型不存在: 返回 HTTP 404 (RFC 7807, title: "Model Not Found")
- Budget 超限: 返回 HTTP 429 (RFC 7807, title: "Budget Exceeded")
- 上游服务不可达: 返回 HTTP 502 (RFC 7807, title: "Bad Gateway") — **不暴露 "new-api" 或具体 provider 名称**
- 上游服务超时: 返回 HTTP 504 (RFC 7807, title: "Gateway Timeout")
- 上游返回错误 (4xx/5xx): 转换为 RFC 7807 格式，**不透传原始错误消息**
  - Provider 429 → 503 "Service Temporarily Unavailable"
  - Provider 401/403 → 502 "Bad Gateway" (不暴露 key 无效信息)
  - Provider 500/其他 → 502 "Bad Gateway"

### 响应 Provider 信息隐藏
- 响应 `model` 字段保留用户请求的模型名或别名 (不替换为 provider 内部模型名)
- 响应中不包含任何 provider 标识 (如 `x-provider`, `x-model-id` 等)
- Stream SSE 事件中不泄漏 provider 信息

## Acceptance Criteria (Gherkin)
### User Story
作为开发者，我希望通过标准 OpenAI SDK 调用所有供应商的模型，以便在不修改代码的情况下切换模型。

### Scenarios (Given/When/Then)

#### Scenario 1: Chat Completion (非流式)
```gherkin
Given new-api 已配置 OpenAI Channel 且 Key 可用
And 用户携带有效 Virtual Key
When 用户发送 POST /v1/chat/completions (model: "gpt-4o", messages: [{role: "user", content: "hello"}])
Then Fastify 验证 VK 通过
And 替换 Authorization 并透传到 new-api
And new-api 返回 OpenAI 格式响应
And 响应中 model 字段为 "gpt-4o" (用户请求的原始模型名)
And 响应不包含任何 provider 标识
And usage 被提取并记录
```

#### Scenario 1.1: 响应不泄漏 Provider 信息
```gherkin
Given 用户使用别名 "smart" 请求 POST /v1/chat/completions (model: "smart")
When 请求成功
Then 响应中 model 字段为 "smart" (用户请求的别名)
And 响应 header 不包含 x-provider 或类似 provider 标识
And 错误消息不包含 "OpenAI"、"Anthropic" 等供应商名称
```

#### Scenario 2: Anthropic Messages API (非流式)
```gherkin
Given new-api 已配置 Anthropic Channel 且 Key 可用
And 用户携带有效 Virtual Key (x-api-key header)
When 用户发送 POST /v1/messages (model: "claude-sonnet-4-20250514", messages: [{role: "user", content: "hello"}], max_tokens: 1024)
Then Fastify 验证 VK 通过
And 透传到 new-api (保持 Anthropic 请求格式)
And new-api 返回 Anthropic Messages 格式响应
And 响应不包含 provider 标识
And usage 被提取并记录
```

#### Scenario 2.1: Anthropic Messages API (流式 SSE)
```gherkin
Given 用户携带有效 Virtual Key
When 用户发送 POST /v1/messages (model: "smart", stream: true)
Then Fastify 解析别名 → "claude-sonnet-4-20250514"
And 透传到 new-api
And new-api 返回 Anthropic SSE 格式 (event: message_start, content_block_delta, message_stop)
And SSE 事件透传给客户端
And 流式完成后提取 usage 并记录
```

#### Scenario 3: 跨协议路由 — Anthropic 协议调用路由到 OpenAI 后端
```gherkin
Given 用户使用 Anthropic SDK 调用 POST /v1/messages (model: "smart")
And 别名 "smart" 指向 "gpt-4o" (OpenAI 模型)
And 用户携带有效 Virtual Key
Then Fastify 透传到 new-api (Anthropic 请求格式)
And new-api 转换为 OpenAI 格式转发到 OpenAI
And new-api 将 OpenAI 响应转换回 Anthropic 格式
And 返回 Anthropic Messages 格式响应给用户
And 用户无感知后端是 OpenAI
```

#### Scenario 4: Chat Completion (流式 SSE — OpenAI)
```gherkin
Given new-api 已配置 Anthropic Channel 且 Key 可用
And 用户携带有效 Virtual Key
When 用户发送 POST /v1/chat/completions (model: "claude-sonnet-4-20250514", stream: true)
Then Fastify 验证 VK 通过
And 透传到 new-api
And new-api 做协议转换 (Anthropic → OpenAI SSE 格式)
And SSE 事件透传给客户端
And 流式完成后提取 usage 并记录
```

#### Scenario 5: 无效 Virtual Key
```gherkin
Given 用户携带无效的 Virtual Key
When 用户发送 POST /v1/chat/completions
Then Fastify VK 验证失败
And 返回 HTTP 401 (RFC 7807)
And 请求未到达 new-api
```

#### Scenario 6: Budget 超限
```gherkin
Given 用户携带有效 Virtual Key
And Budget 已超限
When 用户发送 POST /v1/chat/completions
Then Fastify Budget 检查失败
And 返回 HTTP 429 (RFC 7807)
And 请求未到达 new-api
```

#### Scenario 7: 模型别名解析
```gherkin
Given 模型别名 "smart" 指向 "claude-sonnet-4-20250514"
And 用户携带有效 Virtual Key
When 用户发送 POST /v1/chat/completions (model: "smart")
Then Fastify 解析别名 → "claude-sonnet-4-20250514"
And 透传到 new-api (model 替换为实际模型名)
And 请求成功完成
```

#### Scenario 8: Embeddings API
```gherkin
Given new-api 已配置 OpenAI Channel 且 Key 可用
And 模型 "text-embedding-3-small" 已注册
And 用户携带有效 Virtual Key (scopes 包含 "embeddings")
When 用户发送 POST /v1/embeddings (model: "text-embedding-3-small", input: "hello world")
Then 透传到 new-api
And 返回 OpenAI 兼容格式响应
```

#### Scenario 9: new-api 不可达
```gherkin
Given new-api 服务不可达
When 用户发送 POST /v1/chat/completions
Then 返回 HTTP 502 Bad Gateway (RFC 7807)
```

#### Scenario 10: Models 列表代理
```gherkin
Given 用户携带有效 Virtual Key
When 用户发送 GET /v1/models
Then 代理请求到 model-registry
And 返回 OpenAI 兼容格式的模型列表
```

### General Checklist
- [ ] Fastify 代理框架搭建 (含 SSE stream pipe)
- [ ] VK 验证中间件集成 (validateVirtualKey, 支持 Bearer 和 x-api-key 两种 header)
- [ ] 模型别名解析集成 (resolveModel)
- [ ] Authorization header 替换
- [ ] **OpenAI 协议端点透传 (Chat Completions, Embeddings)**
- [ ] **Anthropic 协议端点透传 (Messages API)**
- [ ] **OpenAI SSE 流式透传**
- [ ] **Anthropic SSE 流式透传**
- [ ] 请求透传到 new-api
- [ ] usage 提取 + recordUsage 集成 (两路协议)
- [ ] 错误处理 (VK 失败、Budget 超限、上游不可达，均不泄漏 provider 信息)
- [ ] 响应 model 字段替换 (返回用户请求的原始模型名/别名)
- [ ] 响应 header 清洗 (移除 provider 标识)
- [ ] 错误格式统一 (RFC 7807)
- [ ] 超时配置
- [ ] 请求审计日志
- [ ] 性能达标 (P99 < 500ms 不含推理)
