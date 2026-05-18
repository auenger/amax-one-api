# Feature: feat-usage-report Admin 用量报表

## Basic Information
- **ID**: feat-usage-report
- **Name**: Admin 用量报表 (Usage Report Dashboard)
- **Priority**: 50
- **Size**: M
- **Dependencies**: none
- **Parent**: null
- **Children**: none
- **Created**: 2026-05-18

## Description
在 Berry 主题 admin 面板中新增一个「用量报表」页面，admin 角色可查看不同用户、不同 Key 的查询调用次数和 Token 用量。支持按用户、Key（多选）、时间区间进行筛选查询。

## User Value Points
1. **用量聚合 API** — 后端提供按用户/Key/时间维度聚合的统计数据接口
2. **报表可视化页面** — Admin 专属页面，含图表（趋势线图、柱状图）和数据表格，支持筛选器交互

## Context Analysis
### Reference Code
- `one-api/web/berry/src/views/Dashboard/` — 现有仪表盘页面，使用 ApexCharts
- `one-api/web/berry/src/views/Log/` — 日志列表页，含筛选器实现（DateTimePicker、Select 等）
- `one-api/web/berry/src/menu-items/panel.js` — 侧边栏菜单配置（isAdmin 标记）
- `one-api/web/berry/src/routes/MainRoutes.js` — 路由配置
- `one-api/web/berry/src/utils/api.js` — Axios API 实例
- `one-api/web/berry/src/utils/common.js` — isAdmin() 工具函数

### Related Documents
- Berry 主题组件模式：index.js (页面容器) + component/ (子组件) + type/ (枚举)
- 图表库：ApexCharts + react-apexcharts
- 表单：MUI OutlinedInput, DateTimePicker (@mui/x-date-pickers + dayjs), Select

### Related Features
- feat-admin-key-usage (已归档 2026-05-12) — 旧 Next.js 前端的 Key 管理与用量仪表盘
- feat-phase1-usage-metering (已归档 2026-05-12) — Token 用量计量后端
- feat-rebuild-frontend (已归档 2026-05-13) — one-api 内置前端二开

## Technical Solution

### 后端 API
需要在 one-api Go 后端新增聚合统计接口：

**`GET /api/user/report`** (admin only)
- Query params: `username`, `token_name` (逗号分隔多选), `start_timestamp`, `end_timestamp`
- Response: 聚合统计数据
  ```json
  {
    "success": true,
    "data": {
      "summary": {
        "total_requests": 1234,
        "total_prompt_tokens": 567890,
        "total_completion_tokens": 123456,
        "total_quota": 789.01
      },
      "by_date": [
        { "date": "2026-05-17", "requests": 100, "prompt_tokens": 50000, "completion_tokens": 10000, "quota": 60.0 },
        ...
      ],
      "by_token": [
        { "token_name": "key-1", "requests": 500, "prompt_tokens": 200000, "completion_tokens": 50000, "quota": 250.0 },
        ...
      ],
      "by_model": [
        { "model_name": "gpt-4o", "requests": 300, "prompt_tokens": 150000, "completion_tokens": 30000, "quota": 180.0 },
        ...
      ]
    }
  }
  ```

### 前端页面
新增 `one-api/web/berry/src/views/Report/` 目录：

**组件结构：**
- `index.js` — 页面容器，管理筛选状态和数据获取
- `component/ReportFilter.js` — 筛选栏（用户输入、Key 多选、时间区间）
- `component/SummaryCards.js` — 概览卡片（总请求数、总 Token、总费用）
- `component/TrendChart.js` — 趋势线图（按日期的请求/Token 趋势）
- `component/TokenUsageTable.js` — Key 维度用量表格

**菜单配置：** 在 `panel.js` 的 admin items 中新增「用量报表」菜单项
**路由配置：** 在 `MainRoutes.js` 新增 `/panel/report` 路由

## Acceptance Criteria (Gherkin)
### User Story
作为 Admin 用户，我希望有一个专门的用量报表页面，以便我能查看不同用户和 Key 的调用次数及 Token 消耗情况，从而了解资源使用分布和趋势。

### Scenarios (Given/When/Then)

#### Scenario 1: Admin 访问报表页面
```gherkin
Given 用户已登录且角色为 admin (role >= 10)
When 用户点击侧边栏「用量报表」菜单
Then 页面显示用量报表，包含概览卡片、趋势图表和数据表格
And 默认展示最近 7 天的全量数据
```

#### Scenario 2: 非 Admin 用户不可见
```gherkin
Given 用户已登录且角色为普通用户 (role < 10)
Then 侧边栏不显示「用量报表」菜单项
And 直接访问 /panel/report 时页面为空或重定向
```

#### Scenario 3: 按时间区间筛选
```gherkin
Given 用户在报表页面
When 选择时间区间为 2026-05-10 至 2026-05-17 并点击查询
Then 趋势图和表格数据刷新为该时间范围内的聚合结果
And 概览卡片更新为该区间的汇总数据
```

#### Scenario 4: 按 Key 多选筛选
```gherkin
Given 用户在报表页面
When 在 Key 下拉框中选择多个 Key（如 "key-1" 和 "key-2"）并点击查询
Then 数据仅展示选中 Key 的用量统计
And 未选择任何 Key 时展示所有 Key 的数据
```

#### Scenario 5: 按用户筛选
```gherkin
Given 用户在报表页面
When 在用户输入框输入 "alice" 并点击查询
Then 数据仅展示用户 alice 相关的用量统计
And 概览卡片和图表同步更新
```

#### Scenario 6: 趋势图表展示
```gherkin
Given 报表页面已加载数据
Then 显示一个折线/柱状混合图
And X 轴为日期，Y 轴为请求次数和 Token 用量
And 支持 hover 查看具体数值
```

#### Scenario 7: Key 维度表格
```gherkin
Given 报表页面已加载数据
Then 显示表格列出每个 Key 的：名称、调用次数、Prompt Tokens、Completion Tokens、费用
And 支持按列排序
```

### UI/Interaction Checkpoints
- 筛选栏固定在页面上方，包含：用户输入框、Key 多选下拉框、时间区间选择器、查询按钮
- 概览卡片 3 张：总调用次数、总 Token 用量、总费用（带与上期对比的小标签）
- 趋势图：ApexCharts 折线图/柱状图，按日期展示
- 数据表格：MUI Table，支持分页和排序

### General Checklist
- [ ] 遵循 Berry 主题的组件模式和样式风格
- [ ] 使用项目已有的 UI 组件库 (MUI, ApexCharts)
- [ ] API 错误处理使用 showError() 通知
- [ ] 响应式布局适配

## Merge Record
- **Completed**: 2026-05-18
- **Merged Branch**: feature/usage-report
- **Merge Commit**: c1d5d3c
- **Archive Tag**: feat-usage-report-20260518
- **Conflicts**: None
- **Verification**: All 7 Gherkin scenarios passed (code analysis)
- **Evidence**: features/archive/done-feat-usage-report-20260518/evidence/verification-report.md
- **Stats**: 1 commit, 10 files changed, 816 insertions
