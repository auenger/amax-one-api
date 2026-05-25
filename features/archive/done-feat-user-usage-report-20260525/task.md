# Tasks: feat-user-usage-report

## Task Breakdown

### 1. 后端 — model 层
- [x] 修改 `one-api/model/log.go` 的 `GetUsageReport`：将 `by_token` 查询改为 `by_user`，按 `username` 分组
- [x] 移除 `token_names` 查询
- [x] 更新 `UsageReport` 结构体：`ByToken` → `ByUser`，调整字段类型

### 2. 后端 — controller 层
- [x] 修改 `one-api/controller/report.go`：移除 `token_name` 参数，响应字段 `by_token` → `by_user`

### 3. 前端 — 筛选器
- [x] 修改 `ReportFilter.js`：移除 token 名称筛选器

### 4. 前端 — 用量表格
- [x] 重写 `TokenUsageTable.js` → `UserUsageTable.js`：列改为用户名、请求数、Prompt Tokens、Completion Tokens、费用

### 5. 前端 — 主页面
- [x] 修改 `Report/index.js`：移除 token_name state，API 响应从 `by_token` 改为 `by_user`

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-25 | Feature implemented | 所有任务完成，Go 编译通过，前端构建通过 |
