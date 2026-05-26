# Tasks: feat-daily-hourly-chart

## Task Breakdown

### 1. 后端 API
- [x] 新增 `GetDailyHourlyReport` controller 函数 (controller/report.go)
- [x] 新增 `GetDailyHourlyData` model 函数，返回24小时固定格式数据 (model/log.go)
- [x] 注册路由 `GET /api/user/report/daily` (router/api.go)

### 2. 前端组件
- [x] 创建 `DailyHourlyChart.js` 组件，包含两个折线图：Token 用量图 + 请求次数图
- [x] 每个图表每个用户一条折线，横轴固定 0:00-23:00
- [x] 两个图表 Grid 并排布局 (xs={12} md={6})
- [x] 组件顶部日期选择器，默认今天
- [x] 集成到 Report/index.js 页面，放在 SummaryCards 和 TrendChart 之间

### 3. 联调测试
- [ ] 验证当日图表数据正确性
- [ ] 验证用户筛选功能
- [ ] 验证 dark/light 主题兼容
- [ ] 验证权限隔离（Admin vs 普通用户）

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-26 | Feature created | 需求分析完成，等待开发 |
| 2026-05-26 | 后端+前端实现完成 | Go vet 通过，代码就绪 |
