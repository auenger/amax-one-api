# Tasks: feat-marketplace-flat-layout

## Task Breakdown

### 1. 布局重构 — 移除弹窗，改为折叠卡片
- [x] 重构 ModelMarket/index.js，移除 ModelDetailDialog 内联组件
- [x] 实现折叠/展开卡片组件（Accordion/Collapse）
- [x] 折叠态：模型名称 + 渠道类型 + 渠道数量 + 并发摘要 + 配额摘要
- [x] 展开态：完整渠道列表（每渠道独立子区域）
- [x] 搜索和筛选功能适配新布局

### 2. 渠道信息内联展示
- [x] 渠道行组件：名称 + ID Chip + 类型 Chip + 状态 Chip
- [x] 渠道行内联复制按钮（sk-{tokenKey}-{channelId}）
- [x] 复制格式提示文字
- [x] 无令牌降级提示

### 3. 并发数据集成
- [x] 调用 /api/user/model_concurrency 获取并发数据（依赖 feat-concurrency-tracker）
- [x] 折叠态：摘要显示总并发（如"并发 2"）
- [x] 展开态：每渠道显示并发数 + 负载颜色指示
- [x] 异步加载，不阻塞页面渲染
- [x] 30 秒自动刷新

### 4. 配额数据集成
- [x] 新增后端 API /api/user/channel_quotas 获取用户可见渠道的配额数据
- [x] 注册路由到 user self 路由组
- [x] 折叠态：最紧张渠道进度条摘要
- [x] 展开态：每渠道配额进度条 + 窗口标签 + 剩余时间
- [x] 进度条颜色随用量变化（绿/黄/红）

### 5. 交互优化
- [x] 折叠/展开动画（Collapse with timeout 300ms）
- [x] 响应式布局适配（flex 布局替代 Grid，自适应）
- [x] 暗色/亮色主题兼容

## Progress Log

| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Feature created | 合并 concurrency-market 和 provider-quota-ui 的广场 UI 部分 |
| 2026-05-19 | All tasks implemented | 移除弹窗、折叠卡片布局、并发/配额数据集成、30s自动刷新、用户配额API |

## Files Changed

### New code (one-api backend)
- `one-api/controller/channel-quota.go` — 新增 GetUserChannelQuotas handler (GET /api/user/channel_quotas)
- `one-api/router/api.go` — 注册 /api/user/channel_quotas 路由

### Modified code (one-api frontend)
- `one-api/web/berry/src/views/ModelMarket/index.js` — 完全重写：
  - 移除 ModelDetailDialog 组件
  - 新增 ModelCard 可折叠卡片组件
  - 新增 ChannelRow 渠道行组件（内联并发 + 配额 + 复制按钮）
  - 新增 QuotaProgressBar 配额进度条组件
  - 异步加载并发/配额数据，30秒自动刷新
  - 从 Grid 布局改为 flex 列表布局
  - 新增刷新状态指示器
