# Tasks: feat-project-init

## Task Breakdown

### 1. Monorepo 基础结构

- [x] 创建 `pnpm-workspace.yaml`（`apps/*` + `packages/*`）
- [x] 创建根 `package.json`（private: true, workspace scripts, devDependencies: typescript, turbo, eslint, prettier）
- [x] 创建 `turbo.json`（build/dev/lint/typecheck/test pipeline，依赖序 ^build）
- [x] 创建 `tsconfig.base.json`（strict: true, target: ES2022, module: NodeNext, paths alias）
- [x] 创建 `.npmrc`（shamefully-hoist=true, strict-peer-dependencies=false）
- [x] 更新 `.gitignore`（node_modules, dist, .env, .next, \*.tsbuildinfo）

### 2. 共享工具库 (@aihub/shared)

- [x] 创建 `packages/shared/` 目录结构和 `package.json`（name: @aihub/shared, exports, types）
- [x] 创建 `packages/shared/tsconfig.json`（extends ../../tsconfig.base.json）
- [x] 实现 `src/errors/index.ts` — ProblemError 类 (extends Error, RFC 7807 字段: status/type/title/detail/instance)
- [x] 实现 `src/id/index.ts` — generateId() 基于 ulidx
- [x] 实现 `src/logger/index.ts` — createLogger(name) 封装 pino，环境感知 LOG_LEVEL
- [x] 实现 `src/pagination/index.ts` — CursorPage<T> 类型, encodeCursor(), decodeCursor()
- [x] 创建 `src/index.ts` 统一导出所有模块
- [x] 编写单元测试 `test/errors.test.ts`, `test/id.test.ts`, `test/pagination.test.ts`

### 3. 数据库层 (@aihub/database)

- [x] 创建 `packages/database/` 目录结构和 `package.json`（name: @aihub/database, deps: @prisma/client）
- [x] 创建 `packages/database/tsconfig.json`
- [x] 初始化 Prisma — `packages/database/prisma/schema.prisma`（datasource postgresql, generator client, 基础模型预留）
- [x] 实现 `src/client.ts` — PrismaClient 单例，配置连接池和日志
- [x] 实现 `src/index.ts` — 导出 prisma 实例和重新导出 @prisma/client 类型
- [x] 在 package.json 添加 scripts: `db:migrate`, `db:generate`, `db:studio`

### 4. Docker Compose 本地环境

- [x] 创建根目录 `docker-compose.yml`（PostgreSQL 16 + Redis 7 + new-api）
- [x] 配置 PostgreSQL：自定义 user/password/db (aihub/aihub/aihub), volume 持久化, healthcheck `pg_isready`
- [x] 配置 Redis：appendonly 持久化, healthcheck `redis-cli ping`
- [x] 配置 new-api：calciumion/new-api 镜像, 内部端口 3001, 环境变量, healthcheck
- [x] 配置自定义 bridge 网络 `aihub-net`
- [x] 创建 `.env.example`（DATABASE_URL, REDIS_URL, GATEWAY_PORT, GATEWAY_HOST, LOG_LEVEL, NODE_ENV, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_URL）
- [x] 复制 `.env.example` 为 `.env`

### 5. 后端网关骨架 (@aihub/gateway)

- [x] 创建 `apps/gateway/package.json`（name: @aihub/gateway, deps: fastify, @fastify/cors, @fastify/helmet, zod, pino, @aihub/shared, @aihub/database）
- [x] 创建 `apps/gateway/tsconfig.json`（extends ../../tsconfig.base.json）
- [x] 实现 `src/config/index.ts` — zod schema 验证环境变量 (GATEWAY_PORT, GATEWAY_HOST, DATABASE_URL, REDIS_URL, LOG_LEVEL)
- [x] 实现 `src/plugins/error-handler.ts` — ProblemError → RFC 7807 JSON 响应
- [x] 实现 `src/plugins/request-id.ts` — 每个请求生成唯一 ID 并写入 x-request-id 头
- [x] 实现 `src/routes/health.ts` — GET /v1/health 返回 {status, version, uptime, timestamp}
- [x] 实现 `src/index.ts` — Fastify 实例创建, 插件/路由注册, 优雅关闭 (SIGTERM/SIGINT), 监听
- [x] 编写 `test/health.test.ts` — 验证健康检查端点响应

### 6. 前端骨架 (@aihub/web)

- [x] 创建 `apps/web/` 目录（基于 Next.js 14: App Router, TypeScript, TailwindCSS 4, src/ directory）
- [x] 配置 `next.config.mjs`（端口 3001, transpilePackages）
- [x] 配置 shadcn/ui — `components.json`, 安装 Button 组件
- [x] 创建 `src/app/layout.tsx`（HTML lang="zh-CN", 字体, 全局样式）
- [x] 创建 `src/app/page.tsx`（欢迎页, 展示项目名称, 包含 shadcn/ui Button 验证组件可用）
- [x] 创建 `apps/web/tsconfig.json` 和 `apps/web/package.json`

### 7. 工程规范与 CI

- [x] 配置 ESLint 9 flat config — `eslint.config.mjs`（TypeScript + import 规则, 覆盖 apps/ 和 packages/）
- [x] 配置 Prettier — `.prettierrc`（单引号, 无分号, 2 空格缩进, 行宽 100）
- [x] 配置 Husky + lint-staged — pre-commit 触发 `eslint --fix` + `prettier --write`
- [x] 创建 `.github/workflows/ci.yml` — Node 20, pnpm cache, lint → typecheck → build → test
- [x] 根 `package.json` 添加统一 scripts（dev, build, lint, format, typecheck, test, db:migrate, db:studio）

## Dependency Order

```
shared (无依赖) → database (无依赖) → gateway (依赖 shared + database)
                                      → web (独立)
```

## Progress Log

| Date       | Progress              | Notes                                                |
| ---------- | --------------------- | ---------------------------------------------------- |
| 2026-05-08 | Feature created       | 等待开发启动                                         |
| 2026-05-12 | All tasks implemented | Build passes, 16 tests pass (shared: 14, gateway: 2) |
