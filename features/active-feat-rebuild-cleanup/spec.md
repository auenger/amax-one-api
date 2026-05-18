# Feature: feat-rebuild-cleanup 清理旧架构代码

## Basic Information
- **ID**: feat-rebuild-cleanup
- **Name**: 清理旧架构代码
- **Priority**: 99
- **Size**: S
- **Dependencies**: none
- **Parent**: null
- **Created**: 2026-05-13

## Description

清理 Phase 1 自建 Gateway 架构的全部代码，为 one-api fork 重构腾出空间。删除 apps/gateway、packages/database、packages/shared、apps/web 四个包，精简 monorepo 配置。

重构后项目将变为 one-api fork（Go 单体）+ 内置前端，不再需要 TypeScript monorepo 基础设施。

## User Value Points

1. **消除冗余代码** — 移除与 one-api 功能重叠的全部自建代码

## Acceptance Criteria (Gherkin)

```gherkin
Scenario: 旧代码完全清理
  Given 当前项目包含 apps/gateway、apps/web、packages/database、packages/shared
  When 执行清理
  Then 上述四个目录不存在
  And pnpm-workspace.yaml 已清空（或项目不再使用 pnpm workspace）
  And turbo.json 已删除
  And 根 package.json 已清理（或删除，视项目结构决定）
```

```gherkin
Scenario: Docker 配置简化
  Given docker-compose.yml 包含 gateway 服务定义
  When 执行清理
  Then docker-compose.yml 只保留 PostgreSQL + Redis（供 one-api 使用）
```
