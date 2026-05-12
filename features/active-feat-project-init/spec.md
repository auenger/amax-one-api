# Feature: feat-project-init 项目基础设施初始化

## Basic Information
- **ID**: feat-project-init
- **Name**: 项目基础设施初始化
- **Priority**: 90
- **Size**: M
- **Dependencies**: []
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-08

## Description

作为所有业务 Feature 的前置依赖，搭建符合技术栈的完整项目骨架。完成后开发者可以 `pnpm install && docker compose up -d && pnpm dev` 一键启动全部本地服务，并拥有共享工具库、数据库连接、CI pipeline 等基础设施。

本地环境已确认可运行 Docker。

### 范围说明

- **Phase 1 仅需 TypeScript/Node.js (Fastify) 后端**，Python (FastAPI + Celery) 栈留给 Phase 3 billing-service / Phase 4 audit-service 时再初始化
- 前端骨架 (Next.js) 虽在 Phase 1 不直接使用，但作为项目整体结构的一部分提前搭建，确保 monorepo 布局完整

## User Value Points

### VP1: Monorepo 骨架与工程规范
pnpm workspace + Turborepo 管理 monorepo；统一的 TypeScript 配置、ESLint、Prettier、Husky lint-staged；GitHub Actions CI 基线。开发者克隆后即可获得一致的工程环境。

### VP2: 数据库与本地开发环境
Docker Compose 一键拉起 PostgreSQL 16 + Redis 7；Prisma 封装为 `@aihub/database` workspace 包，业务包通过 `workspace:*` 直接依赖。开发者无需手动安装任何数据库软件。

### VP3: 共享基础设施层
- `@aihub/shared`：RFC 7807 错误格式化、ULID 生成、结构化日志 (pino)、Cursor 分页工具
- `@aihub/gateway`：Fastify 服务骨架（健康检查、优雅关闭、配置加载、核心插件注册）
- `@aihub/web`：Next.js 14 (App Router) + shadcn/ui + TailwindCSS 4 前端骨架

### VP4: 代码质量工具链
ESLint 9 flat config + Prettier + Husky pre-commit hook + GitHub Actions CI。从第一个 commit 起就保证代码规范。

## Context Analysis

### Reference Code
- 无现有代码，本项目从零初始化
- 参考架构定义：`neuro-syntax.config.json`
- 参考技术栈约定：`project-context.md`
- 参考 Turborepo monorepo 最佳实践

### Related Documents
- `project-context.md` — 技术栈、目录约定、编码规范
- `neuro-syntax.config.json` — 微服务域定义、数据库层、安全规范
- `feature-workflow/config.yaml` — 测试框架 (jest + pytest)、覆盖率目标 (80%)

### Related Features
- `feat-phase1-model-registry` — 依赖本项目初始化（数据模型、共享工具库）
- `feat-phase1-auth-pool` — 依赖本项目初始化（加密模块、数据库）
- `feat-phase1-openai-proxy` — 依赖本项目初始化（Fastify 路由、中间件）

## Technical Solution

### 目标目录结构

```
AIHub/
├── apps/
│   ├── gateway/                     # @aihub/gateway — API 网关
│   │   ├── src/
│   │   │   ├── config/              # 环境变量 schema + 加载
│   │   │   ├── plugins/             # Fastify 插件注册
│   │   │   │   ├── error-handler.ts
│   │   │   │   └── request-id.ts
│   │   │   ├── routes/
│   │   │   │   └── health.ts        # GET /v1/health
│   │   │   └── index.ts             # Fastify 启动入口
│   │   ├── test/
│   │   │   └── health.test.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/                         # @aihub/web — 前端
│       ├── src/
│       │   └── app/
│       │       ├── layout.tsx
│       │       └── page.tsx
│       ├── components/
│       │   └── ui/                  # shadcn/ui 组件
│       ├── next.config.ts
│       ├── components.json          # shadcn/ui 配置
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── shared/                      # @aihub/shared — 共享工具库
│   │   ├── src/
│   │   │   ├── errors/
│   │   │   │   └── index.ts         # RFC 7807 ProblemError
│   │   │   ├── id/
│   │   │   │   └── index.ts         # ULID generateId()
│   │   │   ├── logger/
│   │   │   │   └── index.ts         # pino createLogger()
│   │   │   ├── pagination/
│   │   │   │   └── index.ts         # CursorPage<T>, encode/decode
│   │   │   └── index.ts             # 统一导出
│   │   ├── test/
│   │   │   ├── errors.test.ts
│   │   │   ├── id.test.ts
│   │   │   └── pagination.test.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── database/                    # @aihub/database — 数据库层
│       ├── prisma/
│       │   └── schema.prisma        # 基础 schema (datasource + generator)
│       ├── src/
│       │   └── index.ts             # PrismaClient 单例导出
│       ├── tsconfig.json
│       └── package.json
├── docker-compose.yml               # PostgreSQL 16 + Redis 7
├── pnpm-workspace.yaml              # apps/* + packages/*
├── turbo.json
├── package.json                     # 根 monorepo 配置
├── tsconfig.base.json               # 共享 TS 配置
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore                       # 更新: node_modules, dist, .env, .next
├── .husky/
│   └── pre-commit
├── .github/
│   └── workflows/
│       └── ci.yml
├── .claude/                         # 已有
├── .neuro/                          # 已有
├── feature-workflow/                # 已有
├── features/                        # 已有
├── docs/                            # 已有
├── project-context.md               # 已有
└── neuro-syntax.config.json         # 已有
```

### 技术选型明细

| 组件 | 版本/包名 | 用途 |
|------|----------|------|
| Runtime | Node.js 20 LTS | 后端运行时 |
| Package Manager | pnpm 9 | Monorepo workspace |
| Build Orchestrator | Turborepo | 增量构建、任务管道 |
| Backend Framework | fastify ^5 | 高性能 HTTP |
| ORM | @prisma/client ^6 | 数据库访问 |
| Database | PostgreSQL 16 (Docker) | 主存储 |
| Cache | Redis 7 (Docker) | 缓存/会话 |
| Frontend | next@14 | App Router |
| UI Library | shadcn/ui + Radix UI | 组件库 |
| CSS | tailwindcss@4 | 样式 |
| Logger | pino | 结构化 JSON 日志 |
| ID | ulidx | ULID 生成 |
| Validation | zod | 环境变量 & 请求校验 |
| Lint | eslint 9 (flat config) | 代码质量 |
| Format | prettier ^3 | 代码风格 |
| Git Hooks | husky + lint-staged | 提交检查 |
| CI | GitHub Actions | lint + typecheck + build + test |

### pnpm Workspace 配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### turbo.json Pipeline

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

### 环境变量 (.env.example)

```env
# Database
DATABASE_URL=postgresql://aihub:aihub@localhost:5432/aihub

# Redis
REDIS_URL=redis://localhost:6379

# Gateway
GATEWAY_PORT=3000
GATEWAY_HOST=0.0.0.0
LOG_LEVEL=debug
NODE_ENV=development

# new-api (内部转发引擎)
NEW_API_BASE_URL=http://new-api:3001
NEW_API_INTERNAL_TOKEN=sk-newapi-internal-token-change-me

# Admin API Key (管理端点认证)
ADMIN_API_KEY=sk-admin-change-me

# Frontend
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Docker Compose 设计

- PostgreSQL 16：端口 5432，持久化 volume，自定义用户 `aihub` / 密码 `aihub` / 数据库 `aihub`
- Redis 7：端口 6379，持久化 volume，appendonly 持久化模式
- **new-api**：端口 3001，使用 `calciumion/new-api` 镜像，内部转发引擎
- healthcheck 配置确保服务就绪后再启动应用
- 自定义 bridge 网络 `aihub-net`

#### new-api 容器配置
- 镜像: `calciumion/new-api:latest`
- 端口: 3001 (内部，不对外暴露)
- 环境变量: `SQL_DSN` (连接同一个 PostgreSQL), `REDIS_CONN_STRING` (连接同一个 Redis)
- 初始 admin token 通过环境变量 `INITIAL_ROOT_TOKEN` 配置
- healthcheck: `curl -f http://localhost:3001/api/status`

### 共享工具库 API

```typescript
// @aihub/shared

// RFC 7807 Error
class ProblemError extends Error {
  status: number
  type: string
  title: string
  detail?: string
  instance?: string
}
function createProblemError(status: number, title: string, detail?: string, type?: string): ProblemError

// ULID
function generateId(): string  // 26 字符 Crockford Base32

// Logger
function createLogger(name: string): Logger  // pino wrapper，支持 child()

// Pagination
interface CursorPage<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}
function encodeCursor(fields: Record<string, unknown>): string
function decodeCursor(token: string): Record<string, unknown>
```

### 数据库包 (@aihub/database)

```typescript
// @aihub/database
// packages/database/src/index.ts
export { prisma } from './client'

// packages/database/src/client.ts
import { PrismaClient } from '@prisma/client'
export const prisma = new PrismaClient()
```

业务包通过 workspace 依赖使用：
```json
{
  "dependencies": {
    "@aihub/database": "workspace:*"
  }
}
```

### Fastify 骨架设计
- 配置加载：zod schema 验证环境变量
- 核心插件：`@fastify/cors`、`@fastify/helmet`、请求 ID 生成
- 序列化：统一 JSON 错误响应格式 (RFC 7807 ProblemError)
- 生命周期：SIGTERM/SIGINT 优雅关闭
- 路由：`GET /v1/health` 返回 `{ status: "ok", version: "0.1.0", uptime, timestamp }`

### 前端骨架设计
- Next.js 14 App Router + `src/app/` 目录
- shadcn/ui 初始化（`components.json` 配置）
- TailwindCSS 4
- 基础布局：根 layout 带 HTML `lang="zh-CN"`
- 首页：简单欢迎页，验证 shadcn/ui Button 组件渲染

## Acceptance Criteria (Gherkin)

### User Story
作为开发者，我希望克隆项目后能通过标准命令一键启动全部本地服务，以便立即开始业务 Feature 开发。

### Scenarios

#### Scenario 1: Monorepo 安装与构建
```gherkin
Given 一个全新的项目克隆
And Node.js >= 20 和 pnpm >= 9 已安装
When 执行 pnpm install
Then 所有 workspace 包正确解析并安装
When 执行 pnpm build
Then 所有包按依赖序编译成功 (shared → database → gateway → web)
And 没有 TypeScript 编译错误
```

#### Scenario 2: 本地数据库环境
```gherkin
Given 本地 Docker 环境可用
And 已将 .env.example 复制为 .env
When 执行 docker compose up -d
Then PostgreSQL 在端口 5432 就绪，healthcheck 通过
And Redis 在端口 6379 就绪，healthcheck 通过
And new-api 在端口 3001 就绪，healthcheck 通过
And 数据持久化到 Docker volume
```

#### Scenario 2.1: new-api 可用性验证
```gherkin
Given Docker Compose 所有服务已启动
When 发起 GET http://localhost:3001/api/status
Then 返回 HTTP 200
And new-api 管理界面可访问
```

#### Scenario 3: 网关服务启动与健康检查
```gherkin
Given Docker 中的 PostgreSQL 和 Redis 已运行
And .env 文件已配置
When 执行 pnpm --filter @aihub/gateway dev
Then Fastify 服务在端口 3000 启动
When 发起 GET /v1/health 请求
Then 响应状态码为 200
And 响应体包含 {"status": "ok", "version": "0.1.0"}
And 响应头包含 x-request-id
When 发送 SIGTERM 信号
Then 服务优雅关闭，日志输出 "shutting down"
```

#### Scenario 4: 共享工具库功能
```gherkin
Given @aihub/shared 包已构建
When 调用 generateId()
Then 返回 26 字符的 ULID 字符串 (Crockford Base32)
When 创建 createProblemError(400, "Bad Request", "参数错误")
Then 错误对象包含 status=400, title="Bad Request", detail="参数错误"
And 错误对象是 Error 实例
When 调用 createLogger("test").info("hello")
Then 输出结构化 JSON 日志，包含 name="test" 字段
When 调用 encodeCursor({id: "abc"}) 然后 decodeCursor 解码
Then 还原为 {id: "abc"}
```

#### Scenario 5: 数据库包连接
```gherkin
Given PostgreSQL 已通过 Docker Compose 启动
And @aihub/database 包已构建
When gateway 导入 { prisma } from "@aihub/database"
Then prisma.$queryRaw`SELECT 1` 返回成功
```

#### Scenario 6: 前端开发服务器
```gherkin
Given 所有依赖已安装
When 执行 pnpm --filter @aihub/web dev
Then Next.js 开发服务器在端口 3001 启动
And 页面 HTML lang 属性为 "zh-CN"
And shadcn/ui Button 组件正常渲染
And TailwindCSS 样式正确应用
```

#### Scenario 7: 代码质量工具链
```gherkin
Given 开发者修改了代码并准备提交
When 执行 git commit
Then Husky pre-commit hook 触发 lint-staged
And ESLint 对暂存文件执行检查
And Prettier 对暂存文件执行格式化
When 代码推送到 GitHub
Then CI workflow 自动运行 lint + typecheck + build
And 所有步骤通过
```

### General Checklist
- [ ] `pnpm install` 零错误
- [ ] `pnpm build` 零错误，按依赖序编译
- [ ] `pnpm lint` 零错误
- [ ] `pnpm test` 全部通过
- [ ] `docker compose up -d` PostgreSQL + Redis + new-api 均 healthy
- [ ] `GET /v1/health` 返回 200 + 正确 JSON
- [ ] `@aihub/shared` 所有导出函数有单元测试
- [ ] `@aihub/database` PrismaClient 可正常连接 PostgreSQL
- [ ] Next.js 首页正常渲染，shadcn/ui 组件可用
- [ ] `.env.example` 包含所有必需环境变量及注释
- [ ] `.gitignore` 排除 node_modules、dist、.env、.next
- [ ] TypeScript strict mode 启用
