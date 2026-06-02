# Tasks: feat-minimax-limit-api-compat

## Task Breakdown

### 1. 更新 MinimaxRemainsResponse 结构体
- [ ] 添加新字段: StartTime, RemainsTime, WeeklyStartTime, WeeklyRemainsTime
- [ ] 添加新字段: CurrentIntervalStatus, CurrentIntervalRemainingPercent
- [ ] 添加新字段: CurrentWeeklyStatus, CurrentWeeklyRemainingPercent
- [ ] 添加新字段: IntervalBoostPermille, WeeklyBoostPermille

### 2. 修改 queryMinimaxQuota() 计算逻辑
- [ ] 5h 窗口：优先使用 remaining_percent 计算 usedPercent
- [ ] 5h 窗口：使用 remains_time（秒）转换为 RemainingMs
- [ ] weekly 窗口：优先使用 weekly_remaining_percent 计算 usedPercent
- [ ] weekly 窗口：使用 weekly_remains_time 转换为 RemainingMs
- [ ] 保留旧 total_count/usage_count 逻辑作为 fallback

### 3. 验证
- [ ] 调用实际 API 验证新逻辑
- [ ] 确认前端配额面板正确显示

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-06-02 | Feature created | 初始任务分解 |
