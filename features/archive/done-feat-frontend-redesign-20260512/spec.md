# Feature: feat-frontend-redesign 前端 UI 重构

## Basic Information

- **ID**: feat-frontend-redesign
- **Name**: 前端 UI 重构 (ui-ux-pro-max)
- **Priority**: 70
- **Size**: M
- **Dependencies**: feat-project-init, feat-phase1-gateway
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-12

## Description

使用 ui-ux-pro-max 设计系统重构整个前端项目，重新优化排版、视觉设计和交互体验。涵盖：

- 首页 (Landing Page) — 品牌展示、产品价值主张、CTA
- Dashboard 控制面板 — 数据概览、快速导航
- 模型目录 (/dashboard/models) — 模型列表、筛选、状态管理
- Virtual Key 管理 (/dashboard/keys) — Key CRUD、状态、权限
- 用量统计 (/dashboard/usage) — 图表、聚合数据、趋势分析

技术栈：Next.js 14 App Router + shadcn/ui + TailwindCSS 4 + Radix UI

## User Value Points

### VP1: 专业品牌首页体验

用户访问平台时获得专业的第一印象，清晰了解产品价值和快速上手路径。

### VP2: 高效的管理后台操作

运营人员可以通过 Dashboard 快速查看平台状态，高效管理模型、密钥和监控用量。

## Context Analysis

### Reference Code

- `apps/web/src/app/page.tsx` — 当前首页（极简占位页）
- `apps/web/src/app/dashboard/page.tsx` — 当前 dashboard（基础卡片布局）
- `apps/web/src/app/dashboard/` — 子页面均不存在（404）
- `apps/web/src/components/ui/button.tsx` — shadcn/ui Button 组件
- `apps/web/components.json` — shadcn/ui 配置（default style, RSC enabled）

### Related Documents

- `docs/phase1-scope.md` — Phase 1 范围定义，包含管理后台需求
- `project-context.md` — 项目架构和约定

### Related Features

- feat-project-init — 前端脚手架和基础组件
- feat-phase1-model-registry — 模型目录后端 API
- feat-phase1-auth-pool — Virtual Key 后端 API
- feat-phase1-usage-metering — 用量统计后端 API

## Technical Solution

### 设计方向

- 风格：现代 SaaS 仪表盘，深色/浅色主题支持
- 布局：侧边栏导航 + 内容区的经典后台布局
- 配色：基于 shadcn/ui neutral base color，accent 使用品牌色
- 响应式：桌面优先，平板和移动端适配

### 需要的 shadcn/ui 组件

- Layout: Sidebar, Navigation Menu, Breadcrumb
- Data Display: Table, Card, Badge, Avatar
- Forms: Input, Select, Dialog, Form
- Feedback: Toast, Skeleton, Alert
- Charts: 通过 Recharts 或 ECharts 集成

### API 集成

- `/api/v1/models` — 模型目录数据
- `/api/v1/virtual-keys` — Virtual Key 管理
- `/api/v1/usage` — 用量统计数据

## Acceptance Criteria (Gherkin)

### User Story

作为平台运营者，我希望通过美观高效的管理后台管理 AI 模型接入、Virtual Key 和监控用量，以便高效运营平台。

### Scenarios

#### Scenario 1: 首页展示与导航

```gherkin
Given 用户访问平台首页
Then 页面展示 AIHub 品牌标识和产品价值描述
And 页面包含"开始使用"或"进入控制台"的 CTA 按钮
When 用户点击 CTA 按钮
Then 页面跳转到 /dashboard
```

#### Scenario 2: Dashboard 概览

```gherkin
Given 用户已登录并进入 /dashboard
Then 页面展示侧边栏导航包含：概览、模型目录、Virtual Key、用量统计
And 概览区域展示关键指标卡片（模型数、Key 数、今日调用量、今日 Token 消耗）
```

#### Scenario 3: 模型目录页面

```gherkin
Given 用户进入 /dashboard/models
Then 页面展示所有已注册模型的列表
And 列表包含模型名称、供应商、状态、能力标签
When 用户搜索或筛选模型
Then 列表实时更新显示匹配结果
```

#### Scenario 4: Virtual Key 管理

```gherkin
Given 用户进入 /dashboard/keys
Then 页面展示所有 Virtual Key 列表
And 列表包含 Key 名称、前缀、状态、创建时间
When 用户点击"创建 Key"
Then 弹出创建表单对话框
And 填写名称和权限后可成功创建
```

#### Scenario 5: 用量统计页面

```gherkin
Given 用户进入 /dashboard/usage
Then 页面展示 Token 用量趋势图
And 展示按模型/Key 维度的用量排行
And 支持时间范围筛选
```

#### Scenario 6: 404 页面不存在

```gherkin
Given 用户访问不存在的路径
Then 页面展示友好的 404 提示
And 包含返回 Dashboard 的链接
```

### UI/Interaction Checkpoints

- [ ] 深色/浅色主题切换正常
- [ ] 侧边栏折叠/展开动画流畅
- [ ] 表格数据加载展示 Skeleton 状态
- [ ] 响应式布局在 768px/1024px/1440px 断点正确

### General Checklist

- [ ] 所有页面可正常访问，无 404
- [ ] Next.js 构建无报错
- [ ] Lighthouse Performance > 80
