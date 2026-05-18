# Tasks: feat-marketplace-card-enhance
## Task Breakdown
### 1. 模型卡片信息丰富化
- [x] 分析 `/api/models` 返回的 `channelId2Models` 数据结构，提取渠道映射关系
- [x] 在 ModelCard 组件中增加渠道信息展示（渠道类型 badge、可用渠道数量）
- [x] 优化卡片布局，合理排列新增信息

### 2. 模型详情弹窗
- [x] 创建 ModelDetailDialog 组件 (MUI Dialog)
- [x] 弹窗展示：模型名称、渠道类型、可用渠道列表、模型能力等
- [x] 绑定卡片点击事件，打开弹窗并传入模型数据
- [x] 弹窗内支持关闭 (ESC / 点击外部 / 关闭按钮)

### 3. 主题与样式适配
- [x] 暗色/亮色主题适配
- [x] 响应式布局验证
## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | All tasks implemented | Enhanced card data loading, added channel count badge, created ModelDetailDialog, theme and responsive verified |
