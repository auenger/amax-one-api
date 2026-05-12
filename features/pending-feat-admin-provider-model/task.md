# Tasks: feat-admin-provider-model

## Task Breakdown

### 1. API 集成基础设施

- [ ] 创建 `apps/web/src/lib/api-client.ts` — 基础 fetch 封装（base URL, auth, error parse）
- [ ] 创建 `apps/web/src/lib/api/types.ts` — API 响应类型定义
- [ ] 创建 `apps/web/src/lib/api/providers.ts` — Provider API 调用函数
- [ ] 创建 `apps/web/src/lib/api/models.ts` — Model API 调用函数

### 2. 供应商管理页面

- [ ] 创建 `/dashboard/providers` 供应商列表页
- [ ] 创建 `/dashboard/providers/[id]` 供应商详情页（Key 管理、同步状态）
- [ ] 实现添加供应商表单（Dialog）
- [ ] 实现 API Key 管理（添加/删除，权重设置，遮罩显示）
- [ ] 实现同步状态展示

### 3. 模型配置页面重构

- [ ] 重构 `/dashboard/models` — 接入真实 API，替换 mock 数据
- [ ] 实现模型注册表单（选择供应商、模型 ID、能力标签、定价）
- [ ] 实现别名管理（ModelAlias CRUD）

### 4. Dashboard 概览页数据接入

- [ ] 替换 mock 统计数据为真实 API 调用
- [ ] 添加 Skeleton loading 状态

### 5. 导航更新

- [ ] 侧边栏添加"供应商管理"入口
- [ ] 更新导航结构

## Progress Log

| Date       | Progress        | Notes      |
| ---------- | --------------- | ---------- |
| 2026-05-12 | Feature created | 待开始实施 |
