# Feature: feat-phase1-auth-pool Virtual Key 管理

## Basic Information
- **ID**: feat-phase1-auth-pool
- **Name**: Virtual Key 管理 (Virtual Key Management)
- **Priority**: 80
- **Size**: S
- **Dependencies**: [feat-phase1-model-registry]
- **Parent**: feat-phase1-gateway
- **Children**: []
- **Created**: 2026-05-08

## Description
实现 Virtual Key 管理层，作为用户与 new-api 之间的鉴权隔离层。用户通过 Virtual Key 访问平台，平台持有 new-api 的 internal token 用于实际转发。

~~真实 Key 的池化轮转、健康检查、协议转换由 new-api 的 Channel 机制处理~~ — 我们只管理 Virtual Key 层。

核心能力：
- Virtual Key 生命周期管理 (创建、撤销、更新)
- Scope 权限控制 (chat / embeddings)
- Budget 控制 (token 用量上限，由 usage-metering 提供数据)
- VK → new-api internal token 映射
- **Admin API Key 认证** — Phase 1 管理端点通过 Admin API Key 保护，OIDC 留给后续 Phase

## User Value Points
1. **安全团队**: 真实密钥由 new-api 管理，用户只接触 Virtual Key
2. **运维人员**: Budget 控制基于真实 token 用量，防止超支
3. **开发者**: 通过 VK + Scope 获取精确权限

## Context Analysis
### Reference Code
- new-api Token API: 参考 token 管理设计
### Related Documents
- project-context.md: Architecture — auth-service
### Related Features
- Parent: feat-phase1-gateway
- Dependency: feat-phase1-model-registry (Provider 查询)
- Consumer: feat-phase1-openai-proxy (VK 验证)
- Consumer: feat-phase1-usage-metering (Budget 检查)

## Technical Solution

### 数据模型 (Prisma)
- `VirtualKey`: 虚拟密钥 (id, name, key_hash, key_prefix, scopes[], rate_limits{rpm, tpm}, budget{token_limit, reset_at}, status[active|revoked], created_at, expires_at)
- `AuditLog`: 审计日志 (id, action, resource_type, resource_id, detail, operator, created_at)

### new-api 集成
- 我们持有 **一个 new-api admin token**，用于所有内部转发请求
- Virtual Key 不直接映射到 new-api Token — 验证完全在我们的 Fastify 层完成
- 后续 Phase 可扩展为 VK → new-api Token 1:1 映射 (实现 per-VK 计量隔离)

### API 端点
#### Virtual Key 管理
- `POST /v1/keys` — 创建 Virtual Key
- `GET /v1/keys` — 列出 Virtual Keys (cursor-based 分页)
- `GET /v1/keys/:id` — 查询 Virtual Key 详情
- `PUT /v1/keys/:id` — 更新 Virtual Key (scopes, rate_limits, budget)
- `DELETE /v1/keys/:id` — 撤销 Virtual Key

### 内部接口 (供 openai-proxy 调用)
- `validateVirtualKey(key: string) → { valid, virtualKeyId, scopes, rateLimits, budgetStatus }` — 验证 VK 并检查 Budget
  - Budget 检查: 调用 usage-metering 的 `getUsageSummary(virtualKeyId, reset_at)` 获取累计用量
  - 若累计用量 + 预估 > token_limit，返回 `{ valid: false, reason: 'budget_exceeded' }`
- `getKeyPrefix(key: string) → string` — 提取 key 前缀用于快速查找 (如 "aihub-prod-app-xxx" → "aihub-prod-app")

### 安全要求
- Virtual Key 仅存储 SHA-256 hash
- 创建时返回明文密钥 (仅此一次)
- VK 前缀格式: `aihub-{name}-{random}` (便于日志脱敏和快速查找)
- 密钥操作写入 AuditLog

### Admin API Key 认证 (Phase 1)
- Admin API Key 从环境变量 `ADMIN_API_KEY` 读取
- 所有管理端点 (Provider、Model、VK CRUD) 通过 `Authorization: Bearer {admin_api_key}` 保护
- Admin API Key 验证为简单字符串比对，不经过 hash
- 后续 Phase 替换为 OIDC / RBAC

### 端点分类

| 端点类型 | 认证方式 | 示例 |
|----------|----------|------|
| 管理端点 | Admin API Key | POST /v1/keys, POST /v1/providers |
| 代理端点 | Virtual Key | POST /v1/chat/completions |
| 内部接口 | 服务间调用 | validateVirtualKey(), recordUsage() |

## Acceptance Criteria (Gherkin)
### User Story
作为安全团队，我希望通过 Virtual Key 机制隔离用户和后端系统，以便实现精确的权限和预算控制。

### Scenarios (Given/When/Then)

#### Scenario 1: 创建 Virtual Key
```gherkin
Given 管理员携带有效的 Admin API Key
When 管理员请求创建 Virtual Key (name: "prod-app", scopes: ["chat", "embeddings"])
Then 系统生成随机密钥 "aihub-prod-app-{random}"
And 以 SHA-256 hash 存储，key_prefix 为 "aihub-prod-app"
And 返回明文密钥 (仅此一次)
And 写入 AuditLog
```

#### Scenario 1.1: 无效 Admin API Key
```gherkin
Given 管理员携带无效的 Admin API Key
When 管理员请求创建 Virtual Key
Then 返回 HTTP 401 Unauthorized (RFC 7807)
```

#### Scenario 2: Virtual Key 验证 (有效)
```gherkin
Given Virtual Key "prod-app" 已创建且 status: active
And Budget 未超限 (累计 usage < token_limit)
When openai-proxy 调用 validateVirtualKey("aihub-prod-app-xxx")
Then 返回 { valid: true, virtualKeyId: "...", scopes: ["chat", "embeddings"], budgetStatus: "ok" }
```

#### Scenario 3: Virtual Key 已撤销
```gherkin
Given Virtual Key "prod-app" 已被撤销 (status: revoked)
When openai-proxy 调用 validateVirtualKey("aihub-prod-app-xxx")
Then 返回 { valid: false, reason: "key_revoked" }
```

#### Scenario 4: Budget 超限
```gherkin
Given Virtual Key "prod-app" 的 budget.token_limit 为 1000000
And 累计使用已达 1000000 tokens (由 usage-metering 查询)
When openai-proxy 调用 validateVirtualKey("aihub-prod-app-xxx")
Then 返回 { valid: false, reason: "budget_exceeded" }
```

#### Scenario 5: Scope 权限检查
```gherkin
Given Virtual Key "prod-app" 的 scopes 为 ["chat"]
When openai-proxy 处理 Embeddings 请求 (scope: "embeddings")
Then 返回 { valid: false, reason: "scope_denied" }
```

### General Checklist
- [ ] Virtual Key CRUD 完成 (含 update, get by id)
- [ ] Key SHA-256 hash 存储实现
- [ ] validateVirtualKey 内部接口实现 (含 Budget + Scope 检查)
- [ ] Budget 检查集成 usage-metering
- [ ] Rate limit 检查 (RPM/TPM, 基于 Redis 计数器)
- [ ] VK 前缀生成与快速查找
- [ ] **Admin API Key 认证中间件实现**
- [ ] AuditLog 记录
- [ ] cursor-based 分页实现
- [ ] 错误响应 RFC 7807 格式
