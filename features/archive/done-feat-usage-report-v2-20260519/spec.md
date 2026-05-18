# Feature: feat-usage-report-v2 用量报表优化

## Basic Information
- **ID**: feat-usage-report-v2
- **Name**: 用量报表优化
- **Priority**: 55
- **Size**: S
- **Dependencies**: none
- **Parent**: feat-portal-pages-enhance
- **Children**: none
- **Created**: 2026-05-19

## Description
优化用量报表页面的筛选器 UX 和趋势图表展示。用户名和令牌名改为下拉搜索选中，筛选条件与按钮布局统一；趋势图表简化为 tokens + 请求数折线图，支持多用户多线条展示。

## User Value Points
1. 筛选器 UX 优化 — 用户名/令牌名下拉搜索选中，按钮与搜索条件在同一行
2. 趋势图表重设计 — 仅展示 tokens 用量和请求数，多用户多线条折线图

## Context Analysis
### Reference Code
- 报表主页面: `one-api/web/berry/src/views/Report/index.js`
- 筛选器组件: `one-api/web/berry/src/views/Report/component/ReportFilter.js`
- 趋势图表: `one-api/web/berry/src/views/Report/component/TrendChart.js`
- 汇总卡片: `one-api/web/berry/src/views/Report/component/SummaryCards.js`
- 数据表格: `one-api/web/berry/src/views/Report/component/TokenUsageTable.js`
- 报表 API: `one-api/controller/report.go` — `GetUsageReport()`
- API 路由: `GET /api/user/report` — 支持 `username`, `token_name`, `start_timestamp`, `end_timestamp` 参数
- API 响应包含: `summary`, `by_date`, `by_token`, `by_model` 四个维度
### Related Documents
### Related Features
- feat-usage-report (归档 2026-05-18) — 原始实现
- feat-portal-pages-enhance (父 feature)

## Technical Solution
### 实现方案
1. **后端 API 适配**:
   - 在 `ReportData` 中新增 `by_date_user` 字段，按 date + username 双维度分组
   - 新增 `usernames` 和 `token_names` 字段，提供下拉选项数据源
   - `ReportRow` 新增 `Username` 字段
2. **筛选器 UX**:
   - `username` 改为 MUI Autocomplete (freeSolo)，支持搜索+选择
   - `token_name` 改为 MUI Autocomplete (multiple freeSolo)，支持多选+搜索
   - 下拉数据来源：API 返回的 `usernames` 和 `token_names` 列表
   - 重置和查询按钮与搜索条件放在同一行 Stack 中
3. **趋势图表重设计**:
   - 使用 ApexCharts 纯折线图 (type: 'line')
   - 仅有两个数据维度：tokens 用量 (prompt + completion) 和请求数
   - 按用户分组：每个用户两条线（tokens 实线 + 请求数虚线）
   - 用户用不同颜色区分，图例显示用户名

## Acceptance Criteria (Gherkin)
### User Story
作为管理员，我希望用量报表筛选更便捷，趋势图表更直观。

### Scenarios (Given/When/Then)

#### Scenario 1: 用户名下拉搜索
```gherkin
Given 管理员打开用量报表页面
When 用户点击用户名筛选框
Then 显示用户名下拉列表
And 输入关键字可搜索过滤用户名
And 选中后以该用户名作为筛选条件查询
```

#### Scenario 2: 令牌名下拉搜索
```gherkin
Given 用量报表页面已加载
When 用户点击令牌名筛选框
Then 显示令牌名下拉列表（支持多选）
And 输入关键字可搜索过滤令牌名
And 选中一个或多个令牌名后查询
```

#### Scenario 3: 筛选器布局统一
```gherkin
Given 用量报表页面已加载
When 查看筛选器区域
Then 所有搜索条件（日期范围、用户名、令牌名）和操作按钮（重置、查询）在同一行
And 布局与其他管理页面风格一致
```

#### Scenario 4: 趋势折线图展示
```gherkin
Given 用量报表查询返回数据
When 趋势图表渲染完成
Then 图表仅展示 tokens 用量和请求数两条折线
And 不展示 cost/价格信息
```

#### Scenario 5: 多用户折线图
```gherkin
Given 用量报表查询返回多用户数据
When 趋势图表渲染完成
Then 每个用户对应独立颜色的线条
And 图例显示用户名对应线条颜色
And tokens 用量和请求数分别用不同线条样式区分
```

### UI/Interaction Checkpoints
- 下拉组件使用 MUI Autocomplete，与其他页面风格一致
- 图表使用 ApexCharts line chart，配色与主题适配
- 暗色/亮色主题适配
- 响应式：移动端筛选器自动换行

### General Checklist
- [ ] 筛选器交互流畅，无明显延迟
- [ ] 图表在大量数据时性能正常
- [ ] API 如需修改，保持向后兼容

## Merge Record
- **Completed**: 2026-05-19
- **Merged Branch**: feature/usage-report-v2
- **Merge Commit**: efaed917ae8d32bab29d1a125ac261d42421bf13
- **Archive Tag**: feat-usage-report-v2-20260519
- **Conflicts**: None
- **Verification**: passed (5/5 scenarios)
- **Files Changed**: 4
- **Commits**: 1
