# Checklist: feat-project-init

## Completion Checklist

### Development
- [ ] 所有 7 个 Task 组的任务已完成
- [ ] Monorepo: `pnpm install` + `pnpm build` 零错误
- [ ] Docker: `docker compose up -d` PostgreSQL + Redis 均 healthy
- [ ] Gateway: `GET /v1/health` 返回 200 + 正确 JSON
- [ ] Shared: generateId / ProblemError / createLogger / encodeCursor 全部可用
- [ ] Database: PrismaClient 通过 `@aihub/database` 可正常连接 PostgreSQL
- [ ] Web: Next.js dev server 启动，首页渲染，shadcn/ui Button 可用

### Code Quality
- [ ] TypeScript strict mode 启用，`pnpm typecheck` 零错误
- [ ] `pnpm lint` 零错误
- [ ] 代码风格遵循 project-context.md 约定
- [ ] package.json 中无冗余依赖
- [ ] 所有 workspace 包使用 `workspace:*` 引用内部依赖

### Testing
- [ ] `@aihub/shared` 单元测试已编写（errors, id, pagination）
- [ ] `@aihub/gateway` 健康检查路由测试已编写
- [ ] `pnpm test` 全部通过
- [ ] 测试覆盖率 >= 80%（针对 shared 和 gateway）

### Configuration
- [ ] `.env.example` 包含所有必需环境变量及中文注释
- [ ] `.gitignore` 排除 node_modules / dist / .env / .next / *.tsbuildinfo
- [ ] Docker Compose 包含 healthcheck 和 volume 持久化
- [ ] Husky pre-commit hook 正确触发 lint-staged

### Integration Verification
- [ ] 全新克隆后 `pnpm install && docker compose up -d && pnpm dev` 一键启动
- [ ] GitHub Actions CI pipeline 能通过（或本地 act 验证）

### Documentation
- [ ] spec.md Technical Solution 已填充
- [ ] project-context.md 目录结构已更新（反映 apps/ + packages/ 布局）
