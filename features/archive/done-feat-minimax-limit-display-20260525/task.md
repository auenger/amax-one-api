# Tasks: feat-minimax-limit-display

## Task Breakdown

### 1. 后端 — URL 智能识别
- [x] 在 `one-api/controller/channel-quota.go` 的 `queryProviderQuota()` 中添加 "minimaxi" URL 检测
- [x] 参照现有 "bigmodel" → Zhipu 的逻辑，添加 "minimaxi" → Minimax 的映射
- [x] 确保 URL 检测位于 `switch providerType` 之前

### 2. 验证
- [x] 确认定时刷新 (`monitor/quota-refresh.go`) 调用链中 URL 检测生效
- [x] 确认前端无需改动，现有通用组件正确渲染 MiniMax 配额数据
- [x] 确认 `rebuild.sh` 构建正常

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-25 | Feature created | 等待开发 |
| 2026-05-25 | Implementation complete | 添加 "minimaxi" URL 检测 (3 行), go vet/build 通过 |
