# Tasks: feat-provider-quota-ui
## Task Breakdown
### 1. 公共组件
- [x] QuotaProgressBar 进度条组件（紧凑/标准两种模式）
- [x] QuotaWindowRow 窗口行组件（标签 + 进度条 + 百分比 + 剩余时间）
- [x] 颜色规则工具函数 (0-60% 绿 / 60-85% 黄 / 85-100% 红)

### 2. Channel 管理页集成
- [x] Channel 列表页新增配额列
- [x] Channel 详情页新增配额卡片
- [x] 手动刷新按钮
- [x] Loading 状态
- [x] 不支持类型提示

### 3. 数据适配
- [x] 从 Channel 管理 API 提取配额数据
- [x] 配额数据为空/undefined 时的优雅降级

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Scope adjusted | 模型广场 UI 部分移交 feat-marketplace-flat-layout，保留 Channel 管理页 |
| 2026-05-19 | Implementation complete | 所有 task 完成，frontend build 成功 |
