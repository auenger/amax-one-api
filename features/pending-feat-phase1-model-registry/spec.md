# Feature: feat-phase1-model-registry 统一模型目录

## Basic Information
- **ID**: feat-phase1-model-registry
- **Name**: 统一模型目录 (Unified Model Directory)
- **Priority**: 80
- **Size**: S
- **Dependencies**: none
- **Parent**: feat-phase1-gateway
- **Children**: []
- **Created**: 2026-05-08

## Description
聚合 OpenAI 和 Anthropic 两家 LLM 供应商的模型元数据，作为 **source of truth** 管理模型和供应商配置，变更自动同步到 new-api 的 Channel 配置。

核心能力：
- 供应商配置管理 (endpoint, type, status)
- 模型元数据注册与发现 (capabilities, context_window, pricing)
- 模型别名配置 (1:1 映射，路由策略交给 new-api Channel)
- **自动同步到 new-api Channel** — Provider/Model 变更触发 new-api Channel CRUD

## User Value Points
1. **运维人员**: 在我们的平台管理模型和供应商，自动同步到 new-api，无需操作两套系统
2. **开发者**: 通过统一 API 查询模型能力，选择合适模型

## Context Analysis
### Reference Code
- new-api Channel API: 用于同步 Provider/Model 配置
### Related Documents
- project-context.md: Architecture — asset-registry
### Related Features
- Parent: feat-phase1-gateway

## Technical Solution

### 数据模型 (Prisma)
- `Provider`: 供应商配置 (id, name, type[openai|anthropic], endpoint, status[active|degraded|disabled], rate_limits, new_api_channel_id, created_at, updated_at)
- `ProviderKey`: 供应商真实密钥 (id, provider_id, encrypted_key, key_prefix, weight, status[active|disabled], last_used_at, created_at)
- `Model`: 模型定义 (id, provider_id, name, display_name, capabilities[], context_window, pricing{input_per_1k,output_per_1k}, status[active|deprecated|hidden])
- `ModelAlias`: 模型别名 (id, alias, model_id, created_at) — alias unique index
- `ChannelSyncLog`: 同步日志 (id, provider_id, action, new_api_channel_id, status[success|failed], error, created_at)

### new-api 同步机制
Provider/Model 变更时触发同步：

| 我们的变更 | new-api 操作 |
|-----------|-------------|
| 创建 Provider + Keys | 调用 new-api `POST /api/channel` 创建 Channel (含 key 列表) |
| 添加 ProviderKey | 更新 new-api Channel 的 key 配置 |
| 删除 ProviderKey | 更新 new-api Channel 的 key 配置 |
| 更新 Provider | 调用 new-api `PUT /api/channel/:id` 更新 |
| 删除 Provider | 调用 new-api `DELETE /api/channel/:id` 删除 |
| 创建 Model | 若对应 Channel 不存在则创建，添加 model 映射 |
| 删除 Model | 更新 Channel 的 models 列表 |

同步策略：
- 同步操作为异步，失败记录到 ChannelSyncLog
- 定时任务补偿失败的同步 (每 5 分钟)
- Provider 记录 `new_api_channel_id` 用于双向映射

### API 端点
#### 模型管理
- `POST /v1/models` — 注册模型到供应商 (Admin API Key 认证)
- `GET /v1/models` — 列出所有可用模型 (支持 capability, status 过滤，cursor-based 分页)
  - **Admin API Key 认证**: 返回完整信息 (含 provider_id, provider name, pricing, internal status)
  - **Virtual Key 认证**: 返回精简信息 (name, display_name, capabilities, context_window, status — **不含 provider 信息**)
- `GET /v1/models/:id` — 查询模型详情 (同上按认证类型区分返回内容)

#### 供应商管理
- `POST /v1/providers` — 注册供应商 (含初始 API Keys，同步创建 new-api Channel)
- `GET /v1/providers` — 列出供应商 (支持 status 过滤)
- `GET /v1/providers/:id` — 查询供应商详情
- `PUT /v1/providers/:id` — 更新供应商配置 (同步更新 new-api Channel)
- `DELETE /v1/providers/:id` — 删除供应商 (同步删除 new-api Channel，级联处理关联模型和密钥)

#### 供应商密钥管理
- `POST /v1/providers/:id/keys` — 添加供应商真实 API Key (AES-256-GCM 加密存储，同步到 new-api Channel)
- `GET /v1/providers/:id/keys` — 列出供应商密钥 (密钥值脱敏，仅显示 key_prefix)
- `DELETE /v1/providers/:id/keys/:keyId` — 删除供应商密钥 (同步更新 new-api Channel)

#### 别名管理
- `POST /v1/aliases` — 创建模型别名 (1:1 映射)
- `GET /v1/aliases` — 列出所有别名
- `DELETE /v1/aliases/:alias` — 删除别名

#### 同步状态
- `GET /v1/providers/:id/sync-status` — 查询供应商与 new-api 的同步状态

#### 内部接口 (供其他子 Feature 调用)
- `resolveModel(nameOrAlias: string) → { model, provider, routingPolicy }` — 模型名/别名解析，供 openai-proxy 调用
- `getProviderStatus(providerId: string) → { status, lastCheck }` — 供应商状态查询

## Acceptance Criteria (Gherkin)
### User Story
作为平台运维人员，我希望统一管理所有 LLM 供应商的模型信息，以便快速了解可用模型及其能力。

### Scenarios (Given/When/Then)

#### Scenario 1: 注册新供应商 (含 new-api 同步)
```gherkin
Given 平台尚未注册 OpenAI 供应商
And new-api 中不存在 OpenAI Channel
When 运维人员提交供应商注册请求 (name: "OpenAI", type: "openai", endpoint: "https://api.openai.com/v1")
Then 系统创建供应商记录
And 同步创建 new-api Channel (类型: OpenAI, endpoint, models 列表)
And ChannelSyncLog 记录同步成功
And new_api_channel_id 写入 Provider 记录
```

#### Scenario 1.1: 同步失败补偿
```gherkin
Given new-api 暂时不可用
When 运维人员注册供应商
Then 供应商记录创建成功 (status: "active")
And ChannelSyncLog 记录同步失败
And 定时任务重试同步成功
```

#### Scenario 1.2: 注册供应商时添加 API Keys
```gherkin
Given 运维人员注册供应商 OpenAI
When 提交注册请求 (name: "OpenAI", type: "openai", endpoint: "https://api.openai.com/v1", keys: ["sk-xxx", "sk-yyy"])
Then 系统加密存储 2 个 ProviderKey (AES-256-GCM)
And key_prefix 为 "sk-...xxx" (脱敏显示)
And 同步到 new-api Channel (包含 2 个 key)
And ChannelSyncLog 记录同步成功
```

#### Scenario 1.3: 添加供应商密钥
```gherkin
Given 供应商 OpenAI 已注册，已有 1 个 ProviderKey
When 运维人员添加新密钥 POST /v1/providers/:id/keys (key: "sk-zzz", weight: 30)
Then 系统加密存储新 ProviderKey
And 同步更新 new-api Channel (key 列表增加)
```

#### Scenario 1.4: 删除供应商密钥
```gherkin
Given 供应商 OpenAI 已注册，已有 2 个 ProviderKey
When 运维人员删除一个密钥 DELETE /v1/providers/:id/keys/:keyId
Then 系统删除 ProviderKey 记录
And 同步更新 new-api Channel (key 列表减少)
```

#### Scenario 2: 查询模型列表 (Admin 视角)
```gherkin
Given 系统已注册 2 个供应商共 10 个模型
When 运维人员 (Admin API Key) 请求 GET /v1/models?capability=vision&limit=10
Then 返回所有支持 vision 能力的模型列表
And 响应包含 cursor-based 分页信息 (next_cursor, has_more)
And 每个模型包含 provider 信息 (provider_id, provider name) 和 capabilities 列表
```

#### Scenario 2.1: 查询模型列表 (用户视角 — 隐藏 Provider)
```gherkin
Given 系统已注册 2 个供应商共 10 个模型
When 开发者 (Virtual Key) 请求 GET /v1/models?capability=vision&limit=10
Then 返回所有支持 vision 能力的模型列表
And 每个模型包含 name, display_name, capabilities, context_window, status
And 每个模型 **不包含** provider_id, provider name, pricing 等供应商信息
```

#### Scenario 3: 创建模型别名并解析
```gherkin
Given 模型 "claude-sonnet-4-20250514" 已注册
When 运维人员创建别名 (alias: "smart" → model_id: "claude-sonnet-4-20250514")
Then 别名创建成功 (1:1 映射)
When openai-proxy 调用 resolveModel("smart")
Then 返回 { model: "claude-sonnet-4-20250514", provider: "anthropic", providerType: "anthropic" }
```

#### Scenario 4: 删除供应商级联处理
```gherkin
Given 供应商 OpenAI 已注册，关联 3 个模型
And new-api 中存在对应 Channel
When 运维人员删除 OpenAI 供应商
Then 系统删除所有关联模型和别名
And 同步删除 new-api Channel
And ChannelSyncLog 记录同步成功
```

### General Checklist
- [ ] Prisma schema 定义完成 (Provider, ProviderKey, Model, ModelAlias, ChannelSyncLog)
- [ ] Provider type 枚举支持 openai + anthropic (可扩展)
- [ ] Provider CRUD API 实现 (含 duplicate name 校验)
- [ ] **ProviderKey CRUD API 实现 (含 AES-256-GCM 加密存储)**
- [ ] **ProviderKey 脱敏显示 (仅返回 key_prefix)**
- [ ] Model CRUD API 实现 (含 capability/status 过滤)
- [ ] 别名管理 API 实现
- [ ] resolveModel 内部接口实现
- [ ] **new-api Channel 同步机制实现 (创建/更新/删除，含 Key 同步)**
- [ ] **ChannelSyncLog 记录**
- [ ] **同步失败补偿定时任务**
- [ ] cursor-based 分页实现
- [ ] 错误响应 RFC 7807 格式
