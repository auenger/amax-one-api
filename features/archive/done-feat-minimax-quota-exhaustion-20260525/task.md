# Tasks: feat-minimax-quota-exhaustion

## Task Breakdown

### 1. queryMinimaxQuota — 处理 total=0 的 edge case
- [x] 在 `one-api/controller/channel-quota.go` 的 `queryMinimaxQuota()` 中，当 `CurrentIntervalTotal==0 && CurrentIntervalUsage>0` 时创建 `UsedPercent=100` 的窗口
- [x] 同样处理 `CurrentWeeklyTotal==0 && CurrentWeeklyUsage>0` 的情况

### 2. queryMinimaxQuota — 处理空 model_remains
- [x] 在 `queryMinimaxQuota()` 末尾，当 `len(resp.ModelRemains)==0` 时创建 `UsedPercent=100` 的标记窗口

### 3. 验证
- [x] 确认改动不影响正常 MiniMax 配额查询（total>0 的场景）
- [x] 确认 `total==0 && usage==0` 不触发误报
- [x] 确认加速轮询对 MiniMax 渠道正常工作

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-25 | Created | Feature created from new-feature skill |
| 2026-05-25 | Implementation complete | channel-quota.go: handle total=0+usage>0 and empty model_remains, go vet/build/test pass |
