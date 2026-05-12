# Feature: feat-admin-key-usage Key 路由与用量集成

## Basic Information

- **ID**: feat-admin-key-usage
- **Name**: Key 路由与用量集成
- **Priority**: 75
- **Size**: M
- **Dependencies**: feat-admin-provider-model
- **Parent**: feat-admin-data-integration
- **Children**: []
- **Created**: 2026-05-12

## Description

实现 Virtual Key 的路由配置功能和用量统计的真实数据接入。这是管理后台数据集成的第二部分，依赖第一部分（feat-admin-provider-model）的 API 客户端基础设施。

核心目标：

1. 重构 Virtual Key 管理页面 — 接入真实 API，支持 Key 路由配置（可访问的模型和供应商）
2. 重构用量统计页面 — 接入真实用量 API，展示实际 Token 消耗趋势
3. 完善设置页面 — 展示真实系统配置信息

## User Value Points

### VP1: Key 路由配置

运营人员可以为每个 Virtual Key 精确配置可访问的模型列表和供应商，实现细粒度的访问控制和路由策略。

### VP2: 实时用量监控

运营人员可以查看真实的 Token 消耗趋势、按模型/Key 维度的用量分析，做出数据驱动的运营决策。

## Context Analysis

### Reference Code

- `apps/web/src/app/dashboard/keys/page.tsx` — 当前 Key 管理（mock CRUD）
- `apps/web/src/app/dashboard/usage/page.tsx` — 当前用量统计（mock 图表）
- `apps/web/src/app/dashboard/settings/page.tsx` — 当前设置页（静态信息）
- `apps/gateway/src/routes/admin/keys.ts` — Virtual Key Admin API
- `apps/gateway/src/routes/admin/usage.ts` — Usage Admin API

### Related Documents

- `packages/database/prisma/schema.prisma` — VirtualKey, UsageLog schema

### Related Features

- feat-admin-data-integration — 父 feature
- feat-admin-provider-model — 前置子 feature（API 客户端层）
- feat-phase1-auth-pool — Virtual Key 后端 API（已完成）
- feat-phase1-usage-metering — 用量计量后端 API（已完成）

## Technical Solution

### Key 路由配置页面功能

- Key 列表展示（名称、前缀、状态、Scope、预算使用情况）— 替换 mock
- 创建 Key 表单增强：
  - 可勾选允许的模型列表（从模型 API 动态加载）
  - 可勾选允许的供应商列表（从供应商 API 动态加载）
  - Scope 选择（chat, embeddings）
  - 预算限制（Token 上限）
  - 过期时间设置
- Key 详情页展示路由规则

### 用量统计页面功能

- 接入 `/admin/usage/summary` 获取真实聚合数据
- 时间范围筛选器（今天、7天、30天、自定义）
- Token 用量趋势图（按小时/天聚合）
- 按模型维度的用量排行
- 按 Key 维度的用量排行
- 总量统计卡片（请求数、Token 消耗、活跃 Key 数）

### 设置页面增强

- 展示真实系统配置（从 API 获取）
- 供应商连接状态检查
- 系统版本信息

## Acceptance Criteria (Gherkin)

### User Story

作为平台运营者，我希望为 Virtual Key 配置精细的模型/供应商路由规则，并实时监控 Token 用量。

### Scenarios

#### Scenario 1: 创建带路由规则的 Key

```gherkin
Given 用户进入 /dashboard/keys
When 用户点击"创建 Key"
Then 弹出创建表单，包含模型选择（多选）和供应商选择（多选）
When 用户填写名称、选择模型和供应商、设置预算
Then Key 创建成功
And 列表显示新 Key，详情可见其路由规则
```

#### Scenario 2: 真实用量数据展示

```gherkin
Given 用户进入 /dashboard/usage
Then 页面从 API 加载真实用量数据
And 展示 Token 消耗趋势图（非硬编码）
And 展示按模型的用量排行（真实数据）
And 展示按 Key 的用量排行（真实数据）
```

#### Scenario 3: 用量时间范围筛选

```gherkin
Given 用户在用量页面
When 用户选择"最近 7 天"
Then 图表和统计数据更新为对应时间范围的数据
When 用户选择"今天"
Then 数据切换为今日实时用量
```

#### Scenario 4: Key 状态管理

```gherkin
Given 用户在 Key 列表
When 用户撤销某个 Key
Then Key 状态变为"已撤销"
And 使用该 Key 的后续请求将被拒绝
When 用户查看已撤销 Key 的详情
Then 显示该 Key 的历史用量数据
```

### UI/Interaction Checkpoints

- [ ] 模型选择器支持搜索和多选
- [ ] 预算使用进度条展示
- [ ] 用量图表支持 hover 展示详细数据
- [ ] Key 创建后一次性展示完整密钥（仅一次）
- [ ] 表格支持排序和分页

### General Checklist

- [ ] 所有页面无 mock 数据残留
- [ ] API 错误有 Toast 提示
- [ ] Loading 态使用 Skeleton
- [ ] Next.js 构建无报错
