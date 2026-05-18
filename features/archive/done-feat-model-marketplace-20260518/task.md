# Tasks: feat-model-marketplace

## Task Breakdown

### 1. 页面注册与路由
- [x] 在 `views/ModelMarket/index.js` 创建页面组件（卡片式模型网格布局）
- [x] 在 `routes/MainRoutes.js` 添加 `/panel/models` 路由（Loadable 懒加载）
- [x] 在 `menu-items/panel.js` 添加「模型广场」菜单项（不设 isAdmin）

### 2. 数据获取与展示
- [x] 调用 `GET /api/user/available_models` 或 `GET /api/models` 获取模型数据
- [x] 解析模型数据，按渠道类型分组展示
- [x] 每个模型卡片展示：模型名称、渠道类型标签

### 3. 搜索与筛选
- [x] 添加顶部搜索框，支持按模型名称即时过滤
- [x] 添加渠道类型筛选器（下拉或标签切换）
- [x] 处理空状态和加载状态

### 4. 样式与主题适配
- [x] 确保浅色/深色主题兼容
- [x] 响应式布局适配（Grid 断点）

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-18 | Feature created | 初始任务规划 |
| 2026-05-18 | All tasks implemented | 页面组件、路由、菜单、搜索筛选、主题适配全部完成 |
