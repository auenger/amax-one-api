# Feature: feat-admin-data-integration 管理后台数据集成

## Basic Information

- **ID**: feat-admin-data-integration
- **Name**: 管理后台数据集成
- **Priority**: 75
- **Size**: L
- **Dependencies**: feat-frontend-redesign, feat-phase1-gateway
- **Parent**: null
- **Children**: [feat-admin-provider-model, feat-admin-key-usage]
- **Created**: 2026-05-12

## Description

将前端管理后台从纯 mock 数据切换为真实后端 API 集成，新增供应商管理、模型配置、Key 路由等关键运营页面，使平台具备完整的运营管理能力。

当前问题：

- 所有页面使用 100% 硬编码 mock 数据
- 无法接入新的模型提供商和 API Key
- 无法配置 API path 和模型 name
- 没有 Key → 模型/供应商路由配置页面

拆分为 2 个子 feature：

1. **feat-admin-provider-model** — API 集成层 + 供应商管理 + 模型配置
2. **feat-admin-key-usage** — Key 路由配置 + 用量统计接入

## User Value Points

### VP1: 供应商与模型全生命周期管理

运营人员可以自助接入新的 AI 供应商、配置 API Key、注册模型和别名，无需后端干预。

### VP2: Key 路由与用量实时可见

运营人员可以为 Virtual Key 配置可访问的模型和供应商，并实时监控 Token 用量。

## Context Analysis

### Reference Code

- `apps/web/src/app/dashboard/` — 所有现有页面（均使用 mock 数据）
- `apps/gateway/src/routes/admin/providers.ts` — 供应商 Admin API
- `apps/gateway/src/routes/admin/models.ts` — 模型 Admin API
- `apps/gateway/src/routes/admin/keys.ts` — Virtual Key Admin API
- `apps/gateway/src/routes/admin/usage.ts` — 用量 Admin API
- `packages/database/prisma/schema.prisma` — Provider, ProviderKey, Model, ModelAlias, VirtualKey

### Related Documents

- `docs/phase1-scope.md` — Phase 1 范围定义
- `project-context.md` — 项目架构和约定

### Related Features

- feat-frontend-redesign — UI 重构（前置）
- feat-phase1-model-registry — 模型目录后端 API（已完成）
- feat-phase1-auth-pool — Virtual Key 后端 API（已完成）
- feat-phase1-usage-metering — 用量计量后端 API（已完成）

## Technical Solution

<!-- 由子 feature 各自定义 -->

## Acceptance Criteria (Gherkin)

### User Story

作为平台运营者，我希望通过管理后台配置 AI 供应商、模型和 Key 路由规则，并查看真实用量数据，以实现自助运营。

### Scenarios

#### Scenario 1: 供应商全生命周期管理

```gherkin
Given 用户进入 /dashboard/providers
When 用户添加新供应商（名称、Base URL、API Key）
Then 供应商创建成功并显示在列表中
And 供应商可以配置多个 API Key（带权重）
And 可以查看与 new-api 的同步状态
```

#### Scenario 2: 模型注册与别名配置

```gherkin
Given 用户进入 /dashboard/models
When 用户注册新模型（选择供应商、填写模型名、设置能力标签）
Then 模型注册成功并出现在目录中
And 可以为模型设置别名映射
```

#### Scenario 3: Key 路由配置

```gherkin
Given 用户进入 /dashboard/keys 编辑某个 Key
When 用户配置该 Key 可访问的模型列表和供应商
Then 保存后该 Key 只能路由到指定的模型和供应商
```

#### Scenario 4: 真实用量展示

```gherkin
Given 用户进入 /dashboard/usage
Then 页面展示来自后端 API 的真实 Token 用量数据
And 图表展示真实趋势而非硬编码数据
```

### General Checklist

- [ ] 所有页面接入真实 API，无 mock 数据残留
- [ ] 错误处理和 Loading 状态完善
- [ ] Next.js 构建无报错
