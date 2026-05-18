# Tasks: feat-usage-report-v2
## Task Breakdown
### 1. 筛选器 UX 优化
- [x] 用户名改为 Autocomplete 下拉搜索组件
- [x] 令牌名改为 Autocomplete 多选下拉搜索组件
- [x] 获取用户名/令牌名列表数据（从 API 或前端提取）
- [x] 筛选条件与操作按钮（重置、查询）放在同一行 div
- [x] 参考其他页面布局风格统一

### 2. 趋势图表重设计
- [x] 将 TrendChart 从混合图（bar+line）改为纯折线图
- [x] 仅展示 tokens 用量 (prompt+completion) 和请求数两个维度
- [x] 按用户分组，每个用户对应不同颜色线条
- [x] 更新 ApexCharts 配置：type: 'line'，合理配色

### 3. API 适配（如需要）
- [x] 确认 `by_date` 是否支持按用户分组
- [x] 如不支持，考虑新增 API 参数或前端数据重组
## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Implementation complete | Backend: added by_date_user, usernames, token_names fields. Frontend: Autocomplete filter + inline buttons, multi-user line chart |
