# Feature: feat-model-marketplace 模型广场

## Basic Information
- **ID**: feat-model-marketplace
- **Name**: 模型广场 (Model Marketplace)
- **Priority**: 60
- **Size**: S
- **Dependencies**: none
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-18

## Description

在 berry 主题前端中新增一个「模型广场」页面，展示当前系统中所有渠道配置的可调用模型名称。该页面对所有登录角色可见（不限于管理员），提供类似"模型超市"的浏览体验，让用户一目了然地了解平台支持哪些模型。

## User Value Points

1. **模型浏览** — 用户（任意角色）可以查看平台当前所有可调用的 AI 模型列表，包括模型名称、所属渠道类型、分组归属等信息，帮助用户在调用 API 前了解可用模型范围。

## Context Analysis

### Reference Code
- **前端路由**: `one-api/web/berry/src/routes/MainRoutes.js` — 注册新页面路由
- **菜单配置**: `one-api/web/berry/src/menu-items/panel.js` — 添加侧边栏菜单项（不加 `isAdmin`）
- **API 工具**: `one-api/web/berry/src/utils/common.js` — 已有 `loadChannelModels()` / `getChannelModels()` 调用 `GET /api/models`
- **参考页面**: `one-api/web/berry/src/views/Dashboard/index.js` — Dashboard 页面结构和 API 调用模式
- **侧边栏过滤**: `one-api/web/berry/src/layout/MainLayout/Sidebar/MenuList/index.js` — `isAdmin` 控制菜单可见性

### Backend APIs
- `GET /api/models` — `DashboardListModels()` 返回 `channelId2Models`（按渠道类型分组的模型列表）
- `GET /api/user/available_models` — `GetUserAvailableModels()` 返回当前用户分组可用的模型列表
- `GET /v1/models` — OpenAI 兼容接口，返回认证用户可用模型

### Related Documents
- CLAUDE.md — 项目架构和约定
- project-context.md — 项目上下文

### Related Features
- `feat-phase1-model-registry` (archived) — 统一模型目录，建立了模型注册体系
- `feat-admin-provider-model` (archived) — 供应商与模型管理，管理后台的模型 CRUD
- `feat-rebuild-frontend` (archived) — one-api 内置前端二开，建立了 berry 主题基础

## Technical Solution

### 页面设计
- 新增 `one-api/web/berry/src/views/ModelMarket/index.js` 页面组件
- 路由注册到 `/panel/models`（MainRoutes.js）
- 菜单项添加到 `panel.js`，**不设置 `isAdmin`**，所有角色可见
- 图标使用 `@tabler/icons-react` 的 `IconBrain` 或 `IconSparkles`

### 数据来源
- 调用 `GET /api/user/available_models` 获取当前用户分组可用的模型列表（无需管理员权限）
- 备选：调用 `GET /api/models` 获取全部模型（需要管理员权限，不适用于普通用户场景）

### UI 设计
- 卡片式网格布局展示模型列表（MUI Grid + Card）
- 每个模型卡片展示：模型名称（主标题）、所属渠道类型标签
- 顶部搜索/筛选栏：按模型名称搜索、按渠道类型筛选
- 支持浅色/深色主题（继承 berry 主题配置）

### 权限控制
- 页面需要登录（AuthGuard 已覆盖）
- 不设 `isAdmin` 标记，所有登录用户可见
- 数据范围由后端 API 根据用户分组控制

## Acceptance Criteria (Gherkin)

### User Story
作为一个平台用户，我希望看到所有可用的 AI 模型列表，以便在调用 API 时选择合适的模型。

### Scenarios (Given/When/Then)

```gherkin
Scenario: 普通用户浏览模型广场
  Given 用户已登录（任意角色）
  When 用户点击侧边栏"模型广场"菜单
  Then 页面展示当前用户分组可用的所有模型列表
  And 每个模型显示名称和所属渠道类型

Scenario: 管理员浏览模型广场
  Given 管理员已登录（role >= 10）
  When 管理员点击侧边栏"模型广场"菜单
  Then 页面展示所有模型列表（可能包含更多模型）

Scenario: 未登录用户无法访问模型广场
  Given 用户未登录
  When 用户尝试访问 /panel/models
  Then 页面重定向到登录页面

Scenario: 搜索筛选模型
  Given 用户已打开模型广场页面
  And 页面已加载模型列表
  When 用户在搜索框输入模型名称关键词
  Then 模型列表实时过滤，仅显示匹配的模型

Scenario: 按渠道类型筛选
  Given 用户已打开模型广场页面
  When 用户选择特定渠道类型筛选器
  Then 模型列表仅显示该渠道类型下的模型
```

### UI/Interaction Checkpoints
- [ ] 模型卡片网格布局，响应式适配不同屏幕尺寸
- [ ] 搜索框支持即时过滤
- [ ] 渠道类型筛选下拉/标签切换
- [ ] 空 states（无模型、搜索无结果）
- [ ] 加载状态（Skeleton 或 Spinner）

### General Checklist
- [ ] 兼容 berry 主题的浅色/深色模式
- [ ] 页面性能：大量模型时无明显卡顿
- [ ] 响应式布局：移动端可用

## Merge Record

- **Completed**: 2026-05-18
- **Branch**: feature/model-marketplace
- **Merge Commit**: fd25153
- **Merged To**: main
- **Archive Tag**: feat-model-marketplace-20260518
- **Conflicts**: none
- **Verification**: PASSED (5/5 scenarios, 11/11 tasks)
- **Files Changed**: 3 (1 new, 2 modified)
- **Duration**: ~10min
