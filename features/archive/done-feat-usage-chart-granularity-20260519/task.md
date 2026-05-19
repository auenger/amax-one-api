# Tasks: feat-usage-chart-granularity
## Task Breakdown

### 1. 后端 — 小时粒度聚合
- [x] 在 `model/log.go` 新增 `hourExpr()` 函数（PostgreSQL/SQLite/MySQL 三种方言）
- [x] 扩展 `GetUsageReport` 函数，新增 `granularity` 参数
- [x] 修改 `controller/report.go`，从 query param 读取 `granularity` 并传入
- [x] 扩展 `GetUserDashboard` 支持时间范围和 granularity 参数
- [x] 修改 Dashboard 路由/API 控制器支持 query params

### 2. 前端 — 报表趋势图粒度切换
- [x] 修改 `Report/index.js`：根据起止时间计算 granularity 并传给 API
- [x] 修改 `Report/component/TrendChart.js`：适配小时粒度的 X 轴标签格式
- [x] 确保 ReportFilter 无需 UI 改动（自动根据日期范围判断）

### 3. 前端 — 总览页时间选择器
- [x] 在 `Dashboard/index.js` 新增日期范围选择器组件
- [x] 修改 Dashboard 数据加载逻辑，传入时间参数和 granularity
- [x] 适配 `StatisticalLineChartCard` 和 `StatisticalBarChart` 支持小时粒度
- [x] 更新 `utils/chart.js` 工具函数支持小时级数据

### 4. 测试与验证
- [ ] 手动测试报表页单天/多天切换
- [ ] 手动测试总览页时间选择器
- [ ] 验证暗色/亮色主题
- [ ] 验证空数据时段显示

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Feature created | 待开发 |
| 2026-05-19 | Implementation completed | 后端+前端代码已实现，待手动测试验证 |
