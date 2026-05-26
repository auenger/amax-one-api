# Feature: feat-daily-hourly-chart 当日24小时用量图表

## Basic Information
- **ID**: feat-daily-hourly-chart
- **Name**: 当日24小时用量图表
- **Priority**: 60
- **Size**: S
- **Dependencies**: feat-usage-chart-granularity (completed)
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-26

## Description
在用量报表页面新增两个当日24小时折线图，分别展示 Token 用量和请求次数。按小时(0:00-23:00)展示当天的用量分布，每个用户一条折线。管理员可查看所有用户，普通用户仅看自己。

## User Value Points
1. **当日用量一览** — 用户打开报表页即可快速查看当天24小时的用量分布，无需手动调整时间范围和粒度
2. **用户维度对比** — 管理员可直观对比不同用户在当天各时段的使用情况，发现异常用量或高峰时段

## Context Analysis
### Reference Code
- `one-api/controller/report.go` — 现有报表 API，已有 hour 粒度支持
- `one-api/model/log.go` — `hourExpr()` 已有小时粒度 SQL 表达式，`GetUsageReport()` 已支持按用户+小时聚合
- `one-api/web/berry/src/views/Report/index.js` — 报表页面入口
- `one-api/web/berry/src/views/Report/component/TrendChart.js` — 现有趋势图（已有类似的多用户折线图实现）
- `one-api/web/berry/src/views/Report/component/ReportFilter.js` — 筛选器组件
- `one-api/router/api.go` — 路由注册

### Related Documents
- 已完成的 feat-usage-chart-granularity 提供了小时粒度聚合基础
- 已完成的 feat-usage-report-v2 提供了报表优化基础

### Related Features
- feat-usage-chart-granularity (completed) — 时间粒度支持
- feat-usage-report (completed) — 初始用量报表
- feat-usage-report-v2 (completed) — 报表优化
- feat-user-usage-report (completed) — 用户级统计

## Technical Solution

### 后端
复用现有 `GetUsageReport` API，新增 `GetDailyHourlyReport` 端点：
- 路径: `GET /api/user/report/daily`
- 参数: `username` (可选), `date` (可选, 默认今天, 格式 YYYY-MM-DD)
- 返回: 固定24小时的用量数据，按用户分组
- 逻辑: 复用 `hourExpr()` 和 `buildReportBaseQuery()`，日期转为起止时间戳

### 前端
新增 `DailyHourlyChart.js` 组件:
- 位置: `Report/component/DailyHourlyChart.js`
- 使用 ApexCharts **折线图** (line chart)，拆分为**两个独立图表**：
  - **Token 用量图**: 每个用户一条折线，展示 prompt_tokens + completion_tokens 总和
  - **请求次数图**: 每个用户一条折线，展示请求数量
- 横轴: 0:00 ~ 23:00 (固定24个点)
- 日期选择: 组件顶部提供日期选择器，默认今天
- 布局: 两个图表左右或上下排列 (Grid xs={12} md={6})
- 响应式: 嵌入 Report/index.js 的 Grid 布局中，放在 SummaryCards 和 TrendChart 之间

## Acceptance Criteria (Gherkin)
### User Story
作为管理员，我希望在用量报表页面看到当日24小时用量趋势图，以便快速了解当天各时段的使用情况。

### Scenarios (Given/When/Then)

**Scenario 1: 查看当日24小时图表**
- Given 用户已登录并进入用量报表页面
- When 页面加载完成
- Then 页面显示两个当日24小时折线图：Token 用量图 和 请求次数图
- And 横轴显示 0:00 到 23:00
- And 每个图中的每个用户各一条独立折线

**Scenario 2: 选择不同日期**
- Given 用户在当日图表区域
- When 用户选择一个不同的日期
- Then 图表更新为所选日期的24小时用量数据

**Scenario 3: 按用户筛选**
- Given 管理员查看当日图表
- When 管理员在用户下拉框选择某个用户
- Then 两个图表均仅显示所选用户的趋势线

**Scenario 4: 普通用户权限**
- Given 普通用户（非Admin）进入报表页面
- When 查看当日图表
- Then 两个图表仅显示自己的用量数据，无用户选择下拉框

**Scenario 5: 无数据时段**
- Given 当天某些小时没有使用记录
- When 图表渲染
- Then 无数据的小时显示为 0，不出现断点

### UI/Interaction Checkpoints
- 日期选择器默认今天，可选任意历史日期
- 两个图表并排展示 (md 以上)，小屏幕上下堆叠
- 每个图表支持独立 hover tooltip
- 图例显示用户名，点击可隐藏/显示某用户

### General Checklist
- [x] 后端 API 支持跨数据库 (PostgreSQL/MySQL/SQLite)
- [x] 前端图表支持 dark/light 主题
- [x] API 返回标准 `{ success, message, data }` 格式
- [x] 非 Admin 用户数据隔离

## Merge Record
- **Completed**: 2026-05-26
- **Merged Branch**: feature/daily-hourly-chart
- **Merge Commit**: b3347cc
- **Archive Tag**: feat-daily-hourly-chart-20260526
- **Conflicts**: none
- **Verification**: 5/5 Gherkin scenarios passed
- **Stats**: 1 commit, 5 files changed, 284 insertions
