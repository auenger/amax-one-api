# Feature: feat-admin-provider-model 供应商与模型管理

## Basic Information

- **ID**: feat-admin-provider-model
- **Name**: 供应商与模型管理
- **Priority**: 75
- **Size**: M
- **Dependencies**: feat-frontend-redesign, feat-phase1-model-registry
- **Parent**: feat-admin-data-integration
- **Children**: []
- **Created**: 2026-05-12

## Description

建立前端 API 集成基础设施，实现供应商管理页面和模型配置页面。这是管理后台数据集成的第一部分，提供 API 客户端、数据获取 hooks，以及供应商和模型的完整 CRUD 界面。

核心目标：

1. 创建统一的 API 客户端层（fetch 封装、错误处理、类型安全）
2. 新增供应商管理页面（/dashboard/providers）— 添加供应商、管理 API Key、查看同步状态
3. 重构模型目录页面 — 接入真实 API，支持新增/编辑模型和别名配置
4. 替换 Dashboard 概览页的 mock 数据

## User Value Points

### VP1: API 集成基础设施

统一的前端数据获取层，所有页面共享 API 客户端、类型定义和错误处理。

### VP2: 供应商自助管理

运营人员可以自主接入新供应商、配置 API Key（含权重）、监控同步状态，无需修改代码或联系后端。

### VP3: 模型注册与配置

运营人员可以注册新模型、关联供应商、设置能力标签和别名映射，完成模型上线的自助化。

## Context Analysis

### Reference Code

- `apps/web/src/app/dashboard/models/page.tsx` — 当前模型页（mock 数据）
- `apps/web/src/app/dashboard/page.tsx` — Dashboard 概览（mock 统计）
- `apps/web/src/lib/` — 需要创建 API 客户端
- `apps/gateway/src/routes/admin/providers.ts` — 供应商 CRUD API
- `apps/gateway/src/routes/admin/models.ts` — 模型 CRUD API
- `apps/gateway/src/config/index.ts` — 网关配置（API base URL 参考）

### Related Documents

- `packages/database/prisma/schema.prisma` — Provider, ProviderKey, Model, ModelAlias schema

### Related Features

- feat-admin-data-integration — 父 feature
- feat-phase1-model-registry — 模型目录后端（已完成）
- feat-frontend-redesign — UI 重构（前置）

## Technical Solution

### API 客户端层设计

```
apps/web/src/lib/
├── api-client.ts       # 基础 fetch 封装（base URL, auth header, error parse）
├── api/
│   ├── providers.ts    # Provider API 调用函数
│   ├── models.ts       # Model API 调用函数
│   └── types.ts        # API 响应类型定义（与后端 schema 对齐）
```

### 数据获取策略

- 使用 Server Components + `fetch` 直接获取（Next.js App Router 推荐）
- 客户端交互使用 SWR 或 React Query 进行缓存和乐观更新
- Loading 态用 Skeleton 组件，错误态用 Alert 组件

### 新增页面路由

- `/dashboard/providers` — 供应商列表
- `/dashboard/providers/[id]` — 供应商详情（Key 管理、同步状态）
- `/dashboard/models` — 重构，接入真实 API
- `/dashboard/models/new` — 新增模型表单

### 供应商管理页面功能

- 供应商列表（名称、Base URL、状态、Key 数量）
- 添加供应商表单（名称、类型/OpenAI|Anthropic|Custom、Base URL）
- API Key 管理（添加/删除 Key，设置权重）
- 同步状态展示（与 new-api Channel 同步）

### 模型配置页面功能

- 模型列表（名称、供应商、能力标签、状态）— 替换 mock
- 新增模型表单（选择供应商、模型 ID、显示名、能力勾选、上下文窗口、定价）
- 别名管理（为模型设置别名映射）

## Acceptance Criteria (Gherkin)

### User Story

作为平台运营者，我希望通过管理后台自助接入 AI 供应商和配置模型，无需后端代码修改。

### Scenarios

#### Scenario 1: 添加新供应商

```gherkin
Given 用户进入 /dashboard/providers
When 用户点击"添加供应商"并填写名称、类型和 Base URL
Then 供应商创建成功，列表刷新显示新供应商
And 页面展示成功提示
```

#### Scenario 2: 管理 Provider API Key

```gherkin
Given 用户进入供应商详情页
When 用户添加新的 API Key（填写 Key 值和权重）
Then Key 添加成功，列表显示 Key 后 4 位和权重
When 用户删除某个 Key
Then 确认后 Key 被移除
```

#### Scenario 3: 注册新模型

```gherkin
Given 用户进入 /dashboard/models
When 用户点击"注册模型"并选择供应商、填写模型 ID 和能力标签
Then 模型注册成功，出现在列表中
And 模型关联到正确的供应商
```

#### Scenario 4: 模型别名配置

```gherkin
Given 用户编辑某个模型
When 用户添加别名（如 "gpt4" → "gpt-4-turbo-2024-04-09"）
Then 别名保存成功
And 代理请求可以通过别名路由到正确模型
```

#### Scenario 5: Dashboard 真实数据

```gherkin
Given 用户进入 /dashboard
Then 概览页展示来自 API 的真实统计数据
And 模型数量、Key 数量、调用量均为真实值
```

### UI/Interaction Checkpoints

- [ ] 供应商列表支持搜索和筛选
- [ ] API Key 输入框默认遮罩显示，可切换明文
- [ ] 模型能力标签使用 Badge 组件展示
- [ ] 表格加载时显示 Skeleton 状态
- [ ] 操作成功/失败有 Toast 反馈

### General Checklist

- [ ] 所有 mock 数据替换为真实 API
- [ ] API 客户端类型安全（TypeScript）
- [ ] 错误处理使用 RFC 7807 格式
- [ ] Next.js 构建无报错
