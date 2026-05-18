# Tasks: feat-rebuild-cleanup

## Task Breakdown

### 1. 删除代码目录
- [x] 删除 apps/gateway/
- [x] 删除 apps/web/
- [x] 删除 packages/database/
- [x] 删除 packages/shared/
- [x] 删除 apps/ 目录（如果为空）

### 2. 清理 monorepo 配置
- [x] 删除或清空 pnpm-workspace.yaml
- [x] 删除 turbo.json
- [x] 清理根 package.json（保留必要脚本或删除）
- [x] 清理 .env.example
- [x] 清理根 tsconfig.json（如果有）

### 3. 更新 Docker 配置
- [x] docker-compose.yml 只保留 PostgreSQL + Redis
- [x] 移除 gateway 相关环境变量

### 4. 清理辅助文件
- [x] .husky（pre-commit hooks）— 已删除
- [x] .prettierrc / .eslintrc — 已删除
- [x] .github/workflows — 更新 CI 配置

### 5. 验证
- [x] 目录结构干净，无残留

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-13 | 100% | All tasks completed |
