# Feature: feat-usage-chart-granularity 用量图表时间粒度

## Basic Information
- **ID**: feat-usage-chart-granularity
- **Name**: 用量图表时间粒度
- **Priority**: 60
- **Size**: M
- **Dependencies**: feat-usage-report, feat-usage-report-v2 (已完成)
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-19

## Description
用量报表和总览页面的图表需要根据选择的时间范围自动调整 X 轴粒度：
- 选择**单天**（起止时间为同一天）时，X 轴按**小时**维度展示（00:00 ~ 23:00）
- 选择**多天**（默认行为）时，X 轴按**天**维度展示（当前行为不变）

涉及两个页面：
1. **用量报表页** (`/report`) — TrendChart 趋势图：根据筛选器选择的时间范围自动切换小时/天粒度
2. **总览页面** (`/dashboard`) — 统计图表：增加时间选择器，选单天按小时统计，默认（多天）按天统计

## User Value Points
1. **报表趋势图按小时查看**：管理员查看某一天的用量趋势时，能看到每小时的变化，精确了解高峰/低谷时段
2. **总览页时间粒度切换**：总览页新增时间选择器，用户可选择单天查看按小时统计的图表，或多天按天查看

## Context Analysis
### Reference Code
- 前端报表页：`one-api/web/berry/src/views/Report/index.js` + `component/TrendChart.js`
- 前端报表筛选器：`one-api/web/berry/src/views/Report/component/ReportFilter.js`
- 前端总览页：`one-api/web/berry/src/views/Dashboard/index.js`
- 前端总览图表：`one-api/web/berry/src/views/Dashboard/component/StatisticalLineChartCard.js`, `StatisticalBarChart.js`
- 前端工具函数：`one-api/web/berry/src/utils/chart.js`
- 后端报表 API：`one-api/controller/report.go` → `model.GetUsageReport()`
- 后端总览 API：`one-api/controller/user.go` → `GetUserDashboard()` → `model.SearchLogsByDayAndModel()`
- 后端数据模型：`one-api/model/log.go`（`ReportData`, `ReportRow`, `dayExpr()`, `hourExpr` 需新增）

### Related Documents
- 归档需求 `feat-usage-report`（2026-05-18 完成）— 初始报表实现
- 归档需求 `feat-usage-report-v2`（2026-05-19 完成）— 筛选器 UX + 趋势图重设计

### Related Features
- feat-usage-report (已完成)
- feat-usage-report-v2 (已完成)

## Technical Solution

### 后端改动（Go）

1. **新增 `hourExpr()` 函数**（`model/log.go`）：
   - PostgreSQL: `TO_CHAR(date_trunc('hour', to_timestamp(created_at)), 'HH24:00')`
   - SQLite: `strftime('%H:00', datetime(created_at, 'unixepoch'))`
   - MySQL: `DATE_FORMAT(FROM_UNIXTIME(created_at), '%H:00')`

2. **扩展 `GetUsageReport`**：新增参数 `granularity string`（`"day"` 或 `"hour"`）
   - 当 `granularity == "hour"` 时，by_date 和 by_date_user 使用 `hourExpr()` 替代 `dayExpr()`
   - Report API 路由新增 query param `granularity`

3. **扩展 `GetUserDashboard`**：新增 query params `start_timestamp`, `end_timestamp`, `granularity`
   - 默认行为不变（7天按天统计）
   - 支持传入 granularity="hour" 按小时聚合
   - Dashboard API 前端需传时间参数

4. **`ReportRow` 扩展**：`Date` 字段复用，hour 模式下值为 `"00:00"`, `"01:00"` 等格式

### 前端改动（React/MUI）

1. **Report TrendChart 改造**：
   - 从 filter 的 `start_timestamp` 和 `end_timestamp` 判断是单天还是多天
   - 单天时传 `granularity=hour` 给 API，X 轴显示 `"00:00"~"23:00"`
   - 多天时传 `granularity=day`（或不传，默认行为）

2. **Dashboard 时间选择器**：
   - 在 Dashboard 页面新增日期范围选择器（DatePicker）
   - 选择单天时按小时粒度查询，选择多天时按天粒度查询
   - 默认保持现有 7 天视图

## Acceptance Criteria (Gherkin)
### User Story
作为管理员，我希望能按小时粒度查看用量图表，以便精确了解高峰时段的用量变化。

### Scenarios (Given/When/Then)

#### Scenario 1: 报表页 — 单天按小时展示
```gherkin
Given 用户在用量报表页面
And 设置起止时间为同一天（如 2026-05-19 00:00 ~ 2026-05-19 23:59）
When 用户点击"查询"
Then 趋势图 X 轴显示 00:00, 01:00, ..., 23:00 共 24 个刻度
And Y 轴显示对应小时的 Token 数和请求数
```

#### Scenario 2: 报表页 — 多天按天展示
```gherkin
Given 用户在用量报表页面
And 设置起止时间跨越多天（如 2026-05-13 ~ 2026-05-19）
When 用户点击"查询"
Then 趋势图 X 轴显示每天的日期
And Y 轴显示对应天的 Token 数和请求数
```

#### Scenario 3: 总览页 — 默认按天展示
```gherkin
Given 用户进入总览页面
When 页面加载完成（未选择特定时间）
Then 统计图表按天维度展示最近 7 天数据
And 顶部卡片显示"今日请求量"、"今日消费"、"今日 token"
```

#### Scenario 4: 总览页 — 选择单天按小时展示
```gherkin
Given 用户在总览页面
When 用户通过时间选择器选择单个日期（如 2026-05-19）
Then 统计图表 X 轴按小时展示 00:00 ~ 23:00
And 顶部卡片数值为该天的累计值
```

#### Scenario 5: 总览页 — 选择多天按天展示
```gherkin
Given 用户在总览页面
When 用户通过时间选择器选择日期范围（如 5 月 13 日 ~ 5 月 19 日）
Then 统计图表按天维度展示该范围内的数据
```

### UI/Interaction Checkpoints
- Report 页 ReportFilter 日期选择器 → 自动判断单天/多天，无需额外 UI
- Dashboard 页新增日期范围选择器，默认展示最近 7 天
- 小时粒度图表 tooltip 显示格式：`"HH:00"`

### General Checklist
- [ ] 后端 API 兼容现有行为（不传 granularity 默认按天）
- [ ] 小时粒度数据在无记录的时段显示 0
- [ ] 暗色/亮色主题下图表正常显示

## Merge Record
- **Completed**: 2026-05-19
- **Merged Branch**: feature/usage-chart-granularity
- **Merge Commit**: 008110d
- **Archive Tag**: feat-usage-chart-granularity-20260519
- **Conflicts**: None
- **Verification**: PASS (code analysis), 5/5 Gherkin scenarios validated
- **Development Stats**: 7 files changed, 289 insertions, 75 deletions, started 2026-05-19
