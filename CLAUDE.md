# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIHub (Enterprise AI Control Plane) — 企业级 AI 控制平台，提供统一 API 网关、Virtual Key 鉴权池化、Token 计量、模型代理转发等功能。当前处于 Phase 1（接入层 MVP）。

## Monorepo Structure

pnpm workspace + Turborepo monorepo：

- **`apps/gateway`** (`@aihub/gateway`) — Fastify API 网关，路由注册在 `src/routes/`，服务层在 `src/services/`，插件在 `src/plugins/`
- **`apps/web`** (`@aihub/web`) — Next.js 14 管理后台前端，shadcn/ui + TailwindCSS 4，端口 3002
- **`packages/database`** (`@aihub/database`) — Prisma 数据层，schema 在 `prisma/schema.prisma`
- **`packages/shared`** (`@aihub/shared`) — 共享工具库：ProblemError (RFC 7807)、ULID 生成、Logger、Cursor 分页

Gateway 通过 `new-api` (calciumion/new-api) 作为上游代理转发引擎，docker-compose 中作为服务运行。

## Commands

```bash
# 开发（并行启动所有服务）
pnpm dev

# 构建 / 类型检查 / lint
pnpm build
pnpm typecheck
pnpm lint

# 格式化
pnpm format          # 写入
pnpm format:check    # 检查

# 测试
pnpm test            # 所有包
pnpm --filter @aihub/gateway test  # 单个包

# 数据库
pnpm db:generate     # 生成 Prisma Client
pnpm db:migrate      # 运行迁移
pnpm db:studio       # Prisma Studio

# 基础设施（需要 Docker）
docker compose up -d # 启动 PostgreSQL 16 + Redis 7 + new-api
```

## Architecture

请求流：Client → Gateway (VK Auth + Rate Limit) → Model Resolver (alias→actual) → new-api Proxy → Provider (OpenAI/Anthropic)

关键路径：

- **认证**: `plugins/vk-auth.ts` — Virtual Key 校验（Bearer token）
- **模型解析**: `services/model-resolver.ts` — 别名映射到实际模型
- **代理转发**: `services/proxy.ts` → `routes/proxy.ts` — 支持 streaming SSE
- **用量计量**: `services/usage.ts` — 每次 request 的 token 消耗记录到 `UsageLog`
- **错误处理**: `plugins/error-handler.ts` — 统一 RFC 7807 Problem Details

## Conventions

- **Prettier**: singleQuote, no semi, trailingComma all, printWidth 100
- **ESLint**: typescript-eslint recommended，`no-explicit-any: warn`，`_` 前缀忽略 unused args
- **TypeScript**: strict mode, ES2022 target, NodeNext module resolution
- **ID**: 使用 cuid (Prisma @default(cuid()))，共享库提供 ULID
- **错误格式**: RFC 7807 Problem Details，通过 `@aihub/shared` 的 `createProblemError` 创建
- **API 兼容**: 对外暴露 OpenAI 兼容格式 (`/v1/chat/completions`, `/v1/embeddings`, `/v1/models`) 及 Anthropic 格式 (`/v1/messages`)
- **环境变量**: 通过 `config/index.ts` 用 zod 校验，`.env.example` 为模板
- **Pre-commit**: husky + lint-staged (eslint --fix + prettier)
- **包类型**: 所有包使用 `"type": "module"` (ESM)

## Database Schema

Prisma schema 包含以下核心模型（`packages/database/prisma/schema.prisma`）：

- `Provider` → `ProviderKey` — LLM 供应商及加密密钥
- `Model` → `ModelAlias` — 模型注册与别名映射
- `VirtualKey` → `AuditLog` — 虚拟密钥与审计日志
- `UsageLog` — Token 用量记录
- `ChannelSyncLog` — new-api Channel 同步日志

## one-api (new-api) 本地测试构建

one-api 是 Go 后端，通过 `//go:embed web/build/*` 将前端产物嵌入二进制。

**一键构建**（推荐）:

```bash
cd one-api && ./rebuild.sh   # 前端构建 + 产物拷贝 + Go 编译，三步合一
./bin/one-api                 # 启动服务
```

手动步骤：

```bash
# 1. 重新构建前端
cd one-api/web/berry && rm -rf build && npm run build
cd ../.. && rm -rf web/build/berry/static web/build/berry/index.html web/build/berry/asset-manifest.json web/build/berry/favicon.ico web/build/berry/bg.png
cp -r web/build/berry/build/* web/build/berry/ && rm -rf web/build/berry/build

# 2. 清理 Go 构建缓存并编译
go clean -cache && go build -o bin/one-api .
```

**关键点**:
- `npm run build` 产物在 `berry/build/` 子目录，必须拷贝到 `berry/` 根层（Go 的 `EmbedFolder` 路径是 `web/build/berry`）
- embed 是编译时嵌入，前端改动后必须 `go clean -cache` + 重新 `go build`
- `rebuild.sh` 已包含所有步骤，前端改动后直接运行即可

## Feature Workflow

项目使用 `feature-workflow/` 系统管理需求开发流程（queue.yaml 排队、worktree 隔离、归档）。配置见 `feature-workflow/config.yaml`。
