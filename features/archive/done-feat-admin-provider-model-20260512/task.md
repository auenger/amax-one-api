# Tasks: feat-admin-provider-model

## Task Breakdown

### 1. API 集成基础设施

- [x] 创建 `apps/web/src/lib/api-client.ts` — 基础 fetch 封装（base URL, auth, error parse）
- [x] 创建 `apps/web/src/lib/api/types.ts` — API 响应类型定义
- [x] 创建 `apps/web/src/lib/api/providers.ts` — Provider API 调用函数
- [x] 创建 `apps/web/src/lib/api/models.ts` — Model API 调用函数

### 2. 供应商管理页面

- [x] 创建 `/dashboard/providers` 供应商列表页
- [x] 创建 `/dashboard/providers/[id]` 供应商详情页（Key 管理、同步状态）
- [x] 实现添加供应商表单（Dialog）
- [x] 实现 API Key 管理（添加/删除，权重设置，遮罩显示）
- [x] 实现同步状态展示

### 3. 模型配置页面重构

- [x] 重构 `/dashboard/models` — 接入真实 API，替换 mock 数据
- [x] 实现模型注册表单（选择供应商、模型 ID、能力标签、定价）
- [x] 实现别名管理（ModelAlias CRUD）

### 4. Dashboard 概览页数据接入

- [x] 替换 mock 统计数据为真实 API 调用
- [x] 添加 Skeleton loading 状态

### 5. 导航更新

- [x] 侧边栏添加"供应商管理"入口
- [x] 更新导航结构

## Progress Log

| Date       | Progress        | Notes                          |
| ---------- | --------------- | ------------------------------ |
| 2026-05-12 | Feature created | 待开始实施                     |
| 2026-05-12 | All tasks done  | API client + pages + dashboard |

## Files Changed

### New files (web)

- `apps/web/src/lib/api-client.ts` — Base fetch wrapper with RFC 7807 error handling
- `apps/web/src/lib/api/types.ts` — TypeScript types for Provider, Model, Alias, Stats
- `apps/web/src/lib/api/providers.ts` — Provider API call functions
- `apps/web/src/lib/api/models.ts` — Model and Alias API call functions
- `apps/web/src/lib/api/dashboard.ts` — Dashboard stats API call functions
- `apps/web/src/app/dashboard/providers/page.tsx` — Provider list page with search, filter, create dialog
- `apps/web/src/app/dashboard/providers/[id]/page.tsx` — Provider detail page with key management, sync status

### New files (gateway)

- `apps/gateway/src/routes/dashboard.ts` — Dashboard stats endpoint (aggregated counts)

### Modified files (web)

- `apps/web/src/app/dashboard/page.tsx` — Replaced mock stats with real API + SWR, added Skeleton loading
- `apps/web/src/app/dashboard/models/page.tsx` — Replaced mock data with real API, added register form + alias dialog
- `apps/web/src/components/app-sidebar.tsx` — Added providers nav entry with Server icon
- `apps/web/src/components/dashboard-header.tsx` — Added providers breadcrumb, dynamic sub-path support

### Modified files (gateway)

- `apps/gateway/src/index.ts` — Registered dashboard routes

### Dependencies

- Added `swr` to `apps/web/package.json`
