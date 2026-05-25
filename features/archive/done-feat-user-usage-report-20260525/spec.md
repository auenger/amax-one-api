# Feature: feat-user-usage-report 用户级用量统计

## Basic Information
- **ID**: feat-user-usage-report
- **Name**: 用户级用量统计
- **Priority**: 70
- **Size**: S
- **Dependencies**: feat-usage-report (completed)
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-25

## Description
用量报表页面从按 token 名称统计改为按用户级别统计。因为 token 令牌名称可以重复，导致统计不准确。改为按用户维度汇总 tokens 用量和请求数量。

当前实现：
- 后端 `model/log.go` 的 `GetUsageReport` 中 `by_token` 按 `token_name` 分组
- 前端 `Report/TokenUsageTable.js` 展示 token 名称维度的表格
- 前端 `Report/ReportFilter.js` 包含 token 名称筛选器

改为：
- 后端新增 `by_user` 查询，按 `username` 分组，汇总请求数、prompt tokens、completion tokens、quota
- 前端替换 TokenUsageTable 为 UserUsageTable，展示用户维度的统计表格
- 前端移除 token 名称筛选器（不再需要）

## User Value Points
1. **用户级用量汇总** — 管理员可看到每个用户的总请求数、token 用量和费用，而非按 token 名（可能重复）统计

## Context Analysis
### Reference Code
- `one-api/model/log.go:316-482` — `GetUsageReport` 函数，包含 `by_token` 查询（~第 389-407 行）
- `one-api/controller/report.go` — 报表控制器
- `one-api/web/berry/src/views/Report/` — 前端报表页面
  - `index.js` — 主页面，管理 state 和 API 调用
  - `ReportFilter.js` — 筛选栏（含 token_name 筛选）
  - `TokenUsageTable.js` — token 维度表格（需替换）
  - `SummaryCards.js` — 汇总卡片
  - `TrendChart.js` — 趋势图
  - `ChannelUsageTable.js` — 渠道表格

### Related Documents
- Log 模型字段：`UserId` (int), `Username` (string), `TokenName` (string), `Quota` (int), `PromptTokens` (int), `CompletionTokens` (int)

### Related Features
- feat-usage-report (completed) — Admin 用量报表
- feat-usage-report-v2 (completed) — 用量报表优化
- feat-usage-chart-granularity (completed) — 用量图表时间粒度

## Technical Solution

### 后端改动 (one-api/model/log.go)
1. 将 `by_token` 查询改为 `by_user`：将 `GROUP BY token_name` 改为 `GROUP BY username`
2. 返回字段改为：`username`, `request_count`, `prompt_tokens`, `completion_tokens`, `quota`
3. 移除 `token_names` 查询（不再需要）

### 后端改动 (one-api/controller/report.go)
1. 移除 `token_name` 查询参数处理
2. 响应中 `by_token` 改为 `by_user`

### 前端改动
1. `TokenUsageTable.js` → 重写为 `UserUsageTable.js`：列改为用户名、请求数、Prompt Tokens、Completion Tokens、费用
2. `ReportFilter.js`：移除 token 名称筛选器
3. `index.js`：移除 token_name 相关 state，API 响应从 `by_token` 改为 `by_user`

## Acceptance Criteria (Gherkin)
### User Story
作为管理员，我希望用量报表按用户维度统计，以便准确了解每个用户的实际用量，而不受 token 名称重复的影响。

### Scenarios (Given/When/Then)

**Scenario 1: 用户级用量表格显示**
```gherkin
Given 管理员打开用量报表页面
When 页面加载数据
Then 应显示用户级用量表格
  | 列名 | 说明 |
  | 用户名 | 按用户名分组 |
  | 请求数 | 该用户所有请求总数 |
  | Prompt Tokens | 该用户所有 prompt token 总量 |
  | Completion Tokens | 该用户所有 completion token 总量 |
  | 费用 | 该用户总费用 |
And 表格按费用降序排列
And 支持分页
```

**Scenario 2: token 名称重复不影响统计**
```gherkin
Given 系统中存在两个不同用户创建了同名 token "my-api-key"
When 管理员查看用户级用量报表
Then 两个用户的用量应分别显示
And 不会出现合并统计的情况
```

**Scenario 3: 非管理员用户查看自己的报表**
```gherkin
Given 普通用户打开用量报表页面
When 页面加载数据
Then 只能看到自己的用量统计
And 用户级表格中只显示自己的用户名
```

### General Checklist
- [ ] 后端 `by_token` 查询替换为 `by_user` 按 `username` 分组
- [ ] 前端 `TokenUsageTable` 替换为 `UserUsageTable`
- [ ] 前端移除 token 名称筛选器
- [ ] API 响应字段从 `by_token` 改为 `by_user`
- [x] 表格支持分页和排序

## Merge Record
- **Completed**: 2026-05-25
- **Merged Branch**: feature/feat-user-usage-report
- **Merge Commit**: ad6eef4
- **Archive Tag**: feat-user-usage-report-20260525
- **Conflicts**: none
- **Verification**: Go vet passed, frontend build passed
- **Stats**: 1 commit, 5 files changed (160 insertions, 93 deletions)
