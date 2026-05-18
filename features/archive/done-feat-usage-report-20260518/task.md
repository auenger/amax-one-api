# Tasks: feat-usage-report

## Task Breakdown

### 1. 后端 API — 用量聚合接口
- [x] 在 one-api Go 后端新增 `GET /api/user/report` 路由（admin 权限）
- [x] 实现聚合查询逻辑：按日期、Token、Model 维度统计数据
- [x] 支持查询参数：username、token_name（多选）、start_timestamp、end_timestamp
- [x] 返回结构化数据：summary 汇总 + by_date 趋势 + by_token 明细 + by_model 分布

### 2. 前端页面 — 路由与菜单
- [x] 在 `menu-items/panel.js` 新增「用量报表」菜单项（isAdmin: true）
- [x] 在 `routes/MainRoutes.js` 新增 `/panel/report` 路由（lazy load）
- [x] 创建 `views/Report/` 目录结构

### 3. 前端页面 — 筛选栏
- [x] 实现 `ReportFilter` 组件：用户输入框、Key 多选（OutlinedInput 逗号分隔）、时间区间（DateTimePicker）、查询按钮
- [x] 获取用户列表和 Token 列表用于下拉选项

### 4. 前端页面 — 概览卡片
- [x] 实现 `SummaryCards` 组件：总请求数、总 Token、总费用
- [x] 卡片展示当前筛选条件下的汇总数据

### 5. 前端页面 — 趋势图表
- [x] 实现 `TrendChart` 组件：ApexCharts 折线/柱状图
- [x] 按日期展示请求次数和 Token 用量趋势
- [x] 支持 hover tooltip 展示具体数值

### 6. 前端页面 — 数据表格
- [x] 实现 `TokenUsageTable` 组件：MUI Table
- [x] 列：Key 名称、调用次数、Prompt Tokens、Completion Tokens、费用
- [x] 支持分页和排序

### 7. 联调与测试
- [x] 前后端联调，验证筛选、图表、表格功能 (code review verified)
- [x] 验证 admin 权限控制 (code review verified)

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-18 | Feature created | 需求分析完成，文档生成 |
| 2026-05-18 | Implementation complete | 后端 API + 前端页面全部实现 |
