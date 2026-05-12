---
last_updated: '2026-05-12'
version: 2
features_completed: 6
---

# Project Context: Enterprise AI Control Plane

> 企业级 AI 控制平台 — AI 治理、资产编排与代理调度中枢。所有 AI 代理实现代码时须遵守此文件中的关键规则与约定。

---

## Current Status (2026-05-12)

**Phase 1（接入层 MVP）已完成**。所有 6 个 feature 已合并到 main：

1. `feat-project-init` — monorepo 基础设施
2. `feat-phase1-model-registry` — 统一模型目录（Provider、Model、Alias、Channel Sync）
3. `feat-phase1-auth-pool` — Virtual Key 鉴权池化（SHA-256 hash、scope、budget、audit log）
4. `feat-phase1-openai-proxy` — 双协议 API 代理（OpenAI + Anthropic，支持 SSE streaming）
5. `feat-phase1-usage-metering` — Token 用量计量与预算控制
6. `feat-phase1-gateway` — Phase 1 集成（模块索引）

## Technology Stack

| Category           | Technology                 | Version | Notes                    |
| ------------------ | -------------------------- | ------- | ------------------------ |
| Language (Backend) | TypeScript / Node.js       | —       | API Gateway              |
| Framework          | Fastify                    | 5.x     | 高性能 HTTP 框架         |
| Frontend           | Next.js (App Router)       | 14      | shadcn/ui + Radix UI     |
| Styling            | TailwindCSS                | 4       | —                        |
| Primary DB         | PostgreSQL                 | 16      | ORM: Prisma              |
| Cache              | Redis                      | 7       | 配额缓存、会话、实时计数 |
| Proxy Engine       | new-api (calciumion)       | latest  | 上游 LLM 代理转发        |
| Monorepo           | pnpm workspace + Turborepo | —       | —                        |
| Testing            | Vitest                     | 3.x     | —                        |

## Directory Structure

```
aihub-monorepo/
├── apps/
│   ├── gateway/           # @aihub/gateway — Fastify API 网关
│   │   └── src/
│   │       ├── config/    # Zod 环境变量校验
│   │       ├── plugins/   # Fastify 插件 (error-handler, request-id, vk-auth, admin-auth)
│   │       ├── routes/    # API 路由 (proxy, models, virtual-keys, usage, providers, aliases, health)
│   │       ├── services/  # 业务逻辑 (proxy, model-resolver, virtual-key, usage, new-api-sync)
│   │       └── utils/     # 工具函数 (crypto — AES-256-GCM 加密)
│   └── web/               # @aihub/web — Next.js 14 管理后台
│       └── src/
│           ├── app/       # App Router 页面
│           ├── components/ui/  # shadcn/ui 组件
│           └── lib/       # 工具函数
├── packages/
│   ├── database/          # @aihub/database — Prisma 数据层
│   │   └── prisma/
│   │       └── schema.prisma  # Provider, Model, ModelAlias, VirtualKey, AuditLog, UsageLog, ChannelSyncLog
│   └── shared/            # @aihub/shared — 共享工具
│       └── src/
│           ├── errors/    # ProblemError (RFC 7807)
│           ├── id/        # ULID 生成
│           ├── logger/    # Pino logger 封装
│           └── pagination/  # Cursor 分页
├── feature-workflow/      # Feature Workflow 系统
├── docs/                  # 项目文档
└── docker-compose.yml     # PostgreSQL + Redis + new-api
```

## Architecture

**Pattern**: Control Plane / Hub-and-Spoke (API Gateway)

请求流:

```
Client → Gateway (VK Auth + Rate Limit) → Model Resolver (alias→actual) → new-api Proxy → Provider (OpenAI/Anthropic)
```

| Domain            | Service          | Status     |
| ----------------- | ---------------- | ---------- |
| api-gateway       | 统一 API 网关    | **已完成** |
| auth-service      | Virtual Key 鉴权 | **已完成** |
| billing-service   | Token 计量       | **已完成** |
| asset-registry    | 资产注册中心     | Phase 2    |
| execution-runtime | 沙箱执行环境     | Phase 4    |
| audit-service     | 审计与护栏       | Phase 4    |

## Critical Rules

### Must Follow

- **外置安全**: 护栏/配额/隔离必须在 Agent 执行环境之外强制执行，不可依赖 Agent 自律
- **契约优先**: 所有 Skill/Tool 通过 JSON Schema / OpenAPI 定义接口契约
- **默认拒绝**: 网络、权限、执行默认关闭，按需开放
- **不可篡改**: 审计日志一旦写入不可修改/删除
- **最小权限**: 用户/Agent 仅拥有完成任务所需的最小权限集
- **API 兼容**: 所有模型接口统一为 OpenAI 兼容格式
- **错误格式**: 遵循 RFC 7807 Problem Details (`createProblemError` from `@aihub/shared`)
- **分页策略**: 使用 Cursor-based 分页 (`encodeCursor`/`decodeCursor` from `@aihub/shared`)
- **环境变量**: 通过 zod schema 校验 (`config/index.ts`)，不硬编码
- **密钥加密**: Provider 真实密钥使用 AES-256-GCM 加密存储

### Must Avoid

- API Key 硬编码或明文存储
- 直接暴露供应商真实密钥给用户 (必须走 Virtual Key)
- 跳过审计日志记录
- 在 Agent 沙箱内允许不受限网络访问
- 忽略 PII 检测直接发送请求到模型
- 向客户端泄露上游 Provider 错误细节

## Conventions

| Aspect          | Convention                                              |
| --------------- | ------------------------------------------------------- |
| Package Manager | pnpm 9.x                                                |
| Module System   | ESM (`"type": "module"`)                                |
| API Style       | RESTful + SSE streaming                                 |
| API Versioning  | URL Path (/v1/)                                         |
| ID Format       | cuid (Prisma default)                                   |
| Error Format    | RFC 7807 Problem Details                                |
| Pagination      | Cursor-based                                            |
| Logging         | Pino (structured JSON)                                  |
| Code Style      | singleQuote, no semi, trailingComma all, printWidth 100 |
| Testing         | Vitest                                                  |
| Pre-commit      | husky + lint-staged                                     |
| CI              | GitHub Actions (lint → typecheck → build → test)        |

## Security

- **Virtual Key Auth**: SHA-256 hash, Bearer token 或 X-Api-Key header
- **Admin Auth**: 静态 API Key (ADMIN_API_KEY env)
- **Provider Key Encryption**: AES-256-GCM (ENCRYPTION_KEY env)
- **Input**: 模型名校验、scope 白名单检查
- **Output**: 响应清洗（移除上游 provider 信息，还原 alias 模型名）

## Roadmap

| Phase   | Focus                                    | Status     |
| ------- | ---------------------------------------- | ---------- |
| Phase 1 | 接入层 (Gateway + VK + Proxy + Metering) | **已完成** |
| Phase 2 | 资产层 (Skill 注册表、Agent 身份)        | 待启动     |
| Phase 3 | 治理层 (RBAC、预算控制)                  | 待启动     |
| Phase 4 | 安全部 (沙箱、Guardrails)                | 待启动     |
| Phase 5 | 运维层 (监控、告警)                      | 待启动     |

## References

| Category     | Projects                         |
| ------------ | -------------------------------- |
| Proxy Engine | calciumion/new-api (docker:3001) |
| Gateway      | LiteLLM, One-API                 |
| Platform     | Dify, Coze                       |
| Standards    | OpenAPI 3.1, JSON Schema 2020-12 |

## Update Log

- 2026-05-12: Phase 1 全部完成（6 features merged），更新目录结构和实际代码架构
- 2026-05-07: 初始 project-context 创建，基于 neuro-syntax.config.json
