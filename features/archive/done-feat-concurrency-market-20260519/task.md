# Tasks: feat-concurrency-market

## Task Breakdown
### 1. 并发数据获取层
- [x] 封装 /api/user/model_concurrency 调用函数
- [x] 并发数据状态管理 hook（useConcurrencyData）
- [x] 30 秒自动刷新逻辑
- [x] 异步加载，不阻塞页面渲染

### 2. 负载等级工具
- [x] 负载等级计算函数 (getLoadLevel)
- [x] 负载颜色映射 (getLoadColor)
- [x] 阈值配置化

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Scope adjusted | UI 部分移交 feat-marketplace-flat-layout |
| 2026-05-19 | Implementation complete | hooks/useConcurrencyData.js + utils/concurrency.js created, ModelMarket refactored |
