# Feature: feat-phase1-gateway Phase 1 接入层

## Basic Information
- **ID**: feat-phase1-gateway
- **Name**: Phase 1 接入层 — 统一模型目录、Virtual Key、API 代理、Token 计量
- **Priority**: 80
- **Size**: L
- **Dependencies**: none
- **Parent**: null
- **Children**: [feat-phase1-model-registry, feat-phase1-auth-pool, feat-phase1-openai-proxy, feat-phase1-usage-metering]
- **Created**: 2026-05-08
- **Split**: true

## Description
企业级 AI 控制平台 Phase 1 接入层，基于 **new-api** 转发引擎 + **Fastify** 网关层实现四个核心能力：

1. **统一模型目录** — 聚合 OpenAI 和 Anthropic 两家 LLM 供应商模型元数据，作为 source of truth 同步到 new-api channel 配置，含真实 API Key 管理
2. **Virtual Key 管理** — 我们管理 Virtual Key 层 (鉴权、Budget、Scope)，Admin API Key 保护管理端点
3. **双协议代理** — 对外暴露 OpenAI + Anthropic 两套协议，Fastify 透传到 new-api，协议转换由 new-api 处理
4. **Token 用量计量** — 从代理响应提取 usage 写入我们的 UsageLog，驱动 Budget 控制

技术栈: TypeScript + Fastify + PostgreSQL (Prisma) + Redis + new-api (Go, 内部服务)

## User Value Points
1. 运维人员通过我们的平台统一管理模型和供应商，自动同步到 new-api
2. 安全团队通过 Virtual Key 隔离真实密钥，Budget 控制基于真实用量
3. 开发者用 OpenAI SDK 或 Anthropic SDK 访问所有模型，跨协议路由透明

## Context Analysis
### Reference Code
- new-api (https://github.com/Calcium-Ion/new-api): 转发引擎，提供协议转换、Key 池化、Token 计量
- LiteLLM, One-API: 参考设计
### Related Documents
- project-context.md: Roadmap Phase 1
- neuro-syntax.config.json: 架构配置
### Related Features
- (none — 首个 Feature)

## Technical Solution

### 整体架构 (Wrapper 模式)
```
OpenAI SDK Client ──→ POST /v1/chat/completions ─┐
                                                  │
Anthropic SDK /   ──→ POST /v1/messages ─────────┤
Claude Code                                         │
                                                    ▼
                                         Fastify Gateway (我们的 TS 代码)
    │
    ├── Auth Middleware (feat-phase1-auth-pool)
    │       ├── Virtual Key 验证 (VK → hash 比对)
    │       ├── Budget 检查 (查询累计用量)
    │       └── Scope 检查 (chat / embeddings)
    │
    ├── Route Resolver (feat-phase1-model-registry)
    │       └── 模型别名解析 (1:1 映射)
    │
    ├── Proxy Handler (feat-phase1-openai-proxy)
    │       ├── 替换 Authorization header (VK → new-api internal token)
    │       └── 透传请求到 new-api
    │
    └── Usage Extractor (feat-phase1-usage-metering)
            └── 从响应体提取 usage 并记录
    │
    ▼
new-api (Go, 内部服务)
    │
    ├── 协议转换 (OpenAI 透传 / Anthropic Messages → OpenAI)
    ├── Key 池化轮转 (channel 级别)
    ├── Token 计量 (内置日志)
    │
    ▼
Provider API (OpenAI / Anthropic)
```

### new-api 职责 vs 我们的职责

| 职责 | new-api | 我们 (Fastify) |
|------|---------|----------------|
| 协议转换 (OpenAI↔Anthropic) | ✓ | — |
| 真实 Key 存储 + 轮转 | ✓ | — |
| Token 计数 | ✓ | — |
| OpenAI 兼容格式响应 | ✓ | — |
| Virtual Key 管理 | — | ✓ |
| Budget 控制 | — | ✓ |
| Scope 权限 | — | ✓ |
| 模型目录 + 别名 | ✓ (同步目标) | ✓ (source of truth + 真实 Key 管理) |
| 用量聚合查询 | — | ✓ |
| 审计日志 | — | ✓ |
| 模型供应商 CRUD | — | ✓ |
| 用量记录 (UsageLog) | — | ✓ |

### 子 Feature 依赖链
```
feat-phase1-model-registry (统一模型目录 + new-api 同步)
    ↓
feat-phase1-auth-pool (Virtual Key 管理)
    ↓
feat-phase1-openai-proxy (Fastify → new-api 透传代理)
    ↓
feat-phase1-usage-metering (用量提取 + Budget 驱动)
```

### 子 Feature 间集成接口
| 调用方 | 被调用方 | 接口 | 说明 |
|--------|----------|------|------|
| model-registry | new-api | Channel CRUD API | 模型/供应商变更同步到 new-api channel |
| auth-pool | model-registry | Provider 查询 | VK 注册时关联供应商 |
| model-registry | new-api | Channel + Key 同步 | Provider/ProviderKey 变更同步 |
| openai-proxy | model-registry | resolveModel() | 模型名/别名解析 |
| openai-proxy | auth-pool | validateVirtualKey() | VK 验证 + Budget 检查 |
| openai-proxy | usage-metering | recordUsage() | 请求完成后记录 token 用量 |
| auth-pool | usage-metering | getUsageSummary() | Budget 检查查询累计用量 |

### new-api 集成配置
- new-api 部署为内部服务 (不对外暴露)
- 我们持有 new-api 的 admin token，用于 Channel 管理和内部请求
- new-api 的 Token 系统不对外使用，所有请求通过我们的 Fastify 层

### Provider 信息隔离原则
- **Admin 视角** (Admin API Key): 可见 Provider、ProviderKey、Channel 同步状态等全部信息
- **用户视角** (Virtual Key): 只可见模型名称、能力、用量；**不可见 Provider 信息**
- **错误消息**: 统一为 RFC 7807 格式，不透传 provider 错误，不暴露 provider 名称
- **响应清洗**: 响应 model 字段返回用户请求的原始名/别名，移除 provider 标识 header

### 共享基础设施
- **PostgreSQL**: 我们的 Fastify 服务使用 (Prisma ORM)
- **new-api**: 自带数据库 (SQLite/MySQL/PostgreSQL)，独立管理
- **Redis**: VK 缓存、Budget 缓存、SSE 流式连接管理

## Acceptance Criteria (Gherkin)
### User Story
作为平台管理员，我希望通过统一入口管理和访问所有 LLM 模型，以便简化运维和提升安全性。

### Scenarios (Given/When/Then)

#### Scenario 1: 端到端 — OpenAI 协议请求全链路
```gherkin
Given 平台已在 model-registry 注册供应商 OpenAI
And 已通过 new-api Channel API 同步了 2 个 OpenAI Key
And 已创建 Virtual Key "prod-app" (scopes: ["chat"])
And 已注册模型 "gpt-4o" (provider: OpenAI)
When 开发者使用 Virtual Key 请求 POST /v1/chat/completions (model: "gpt-4o")
Then Fastify 验证 Virtual Key 有效
And Budget 检查通过
And 替换 Authorization 为 new-api internal token
And 透传请求到 new-api
And new-api 路由到 OpenAI API
And 返回 OpenAI 格式响应
And Usage Extractor 记录 token 用量
```

#### Scenario 1.1: 端到端 — Anthropic 协议请求全链路
```gherkin
Given 平台已注册供应商 Anthropic
And 已创建 Virtual Key "claude-app" (scopes: ["chat"])
And 已注册模型 "claude-sonnet-4-20250514" (provider: Anthropic)
When 开发者使用 Virtual Key 请求 POST /v1/messages (model: "claude-sonnet-4-20250514", messages: [{role: "user", content: "hello"}], max_tokens: 1024)
Then Fastify 验证 Virtual Key 有效
And 透传到 new-api (Anthropic 格式)
And new-api 路由到 Anthropic API
And 返回 Anthropic Messages 格式响应
And Usage Extractor 记录 token 用量
```

#### Scenario 1.2: 端到端 — 跨协议路由
```gherkin
Given 别名 "smart" 指向 "gpt-4o" (OpenAI 模型)
When 开发者使用 Anthropic SDK 调用 POST /v1/messages (model: "smart")
Then Fastify 解析别名 → "gpt-4o"
And 透传到 new-api (Anthropic 格式请求)
And new-api 转换为 OpenAI 格式转发到 OpenAI
And new-api 将 OpenAI 响应转换回 Anthropic 格式
And 返回 Anthropic Messages 格式响应给开发者
And 开发者无感知后端是 OpenAI
```

#### Scenario 2: 端到端 — Key 故障自动降级
```gherkin
Given new-api 中 OpenAI Channel 配置了 2 个 Key
And Key-1 已被 new-api 标记为 disabled (连续 429)
When 开发者请求 OpenAI 模型
Then new-api 自动选择 Key-2
And 请求成功完成
```

#### Scenario 3: 端到端 — 模型别名路由
```gherkin
Given 模型别名 "smart" 指向 "claude-sonnet-4-20250514"
And new-api 中已配置 Anthropic Channel
When 开发者请求 model: "smart"
Then Fastify 解析别名 → "claude-sonnet-4-20250514"
And 透传到 new-api
And new-api 将请求路由到 Anthropic 并做协议转换
And 返回 OpenAI 兼容格式响应
```

#### Scenario 4: 端到端 — Budget 超限拒绝
```gherkin
Given Virtual Key "prod-app" 的 budget.token_limit 为 1000000
And 累计使用已达 999000 tokens
When 开发者使用此 VK 发起请求
Then Fastify Budget 检查发现预计将超限
And 返回 HTTP 429 (budget exceeded)
And 请求未到达 new-api
```

### General Checklist
- [ ] new-api 部署完成并可用
- [ ] 所有子 Feature 验收通过
- [ ] 端到端集成测试通过 (上述 4 个场景)
- [ ] SLA 指标达标 (99.9%, P99 < 500ms, 不含供应商推理时间)
- [ ] Prisma schema 各子模块无冲突
- [ ] new-api Channel 同步链路验证通过
- [ ] Token 用量计量链路验证通过
- [ ] API 文档 (OpenAPI spec) 生成

## Merge Record
- **Completed**: 2026-05-12
- **Merged Branch**: feature/phase1-gateway
- **Merge Commit**: 645f90c
- **Archive Tag**: feat-phase1-gateway-20260512
- **Conflicts**: none
- **Verification**: PASSED (12/12 tasks, 0 TS errors, 14/14 tests, 6/6 Gherkin scenarios)
- **Stats**: 1 commit, 1 file changed (virtual-key.ts Prisma JSON type fix)
