# Feature: feat-minimax-limit-api-compat MiniMax Limit API 兼容性修复

## Basic Information
- **ID**: feat-minimax-limit-api-compat
- **Name**: MiniMax Limit API 兼容性修复
- **Priority**: 80
- **Size**: S
- **Dependencies**: null
- **Parent**: null
- **Children**: empty
- **Created**: 2026-06-02

## Description
MiniMax coding_plan/remains 接口返回结构发生了变更：
1. 新增 `current_interval_remaining_percent` / `current_weekly_remaining_percent` 字段，直接给出剩余百分比
2. 新增 `remains_time` / `weekly_remains_time` 字段，直接给出剩余时间（秒）
3. 新增 `start_time` / `weekly_start_time` / `current_interval_status` / `current_weekly_status` 等字段
4. "general" 模型的 `current_interval_total_count` 和 `current_interval_usage_count` 现在返回 0，旧的计算逻辑会失效

当前代码的问题：
- `queryMinimaxQuota()` 在 `total_count == 0` 时跳过窗口计算，导致 "general" 模型的 5h 和 weekly 数据全部丢失
- 最终可能触发 `model_remains` 为空的兜底逻辑，显示 100% 耗尽（误判）

API 新返回示例：
```json
{
  "model_remains": [
    {
      "model_name": "general",
      "start_time": 1780347600000,
      "end_time": 1780365600000,
      "remains_time": 3213960,
      "current_interval_total_count": 0,
      "current_interval_usage_count": 0,
      "current_interval_status": 1,
      "current_interval_remaining_percent": 89,
      "weekly_start_time": 1780243200000,
      "weekly_end_time": 1780848000000,
      "weekly_remains_time": 485613960,
      "current_weekly_total_count": 0,
      "current_weekly_usage_count": 0,
      "current_weekly_status": 1,
      "current_weekly_remaining_percent": 91,
      "interval_boost_permille": 2000,
      "weekly_boost_permille": 3000
    }
  ]
}
```

## User Value Points
1. MiniMax 渠道配额数据正确显示（5h 窗口 + weekly 窗口）

## Context Analysis
### Reference Code
- `one-api/controller/channel-quota.go:51-69` — MinimaxRemainsResponse 结构体定义
- `one-api/controller/channel-quota.go:131-211` — queryMinimaxQuota() 查询逻辑
- `one-api/controller/channel-quota.go:339-378` — queryProviderQuota() 调度逻辑

### Related Documents
- MiniMax API endpoint: `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`

### Related Features
- done-feat-minimax-limit-display — MiniMax Limit 显示逻辑
- done-feat-minimax-quota-exhaustion — MiniMax 配额耗尽联动

## Technical Solution

### 1. 更新 MinimaxRemainsResponse 结构体
在 `channel-quota.go` 的结构体中添加新字段：
- `StartTime` / `RemainsTime` / `WeeklyStartTime` / `WeeklyRemainsTime`
- `CurrentIntervalStatus` / `CurrentIntervalRemainingPercent`
- `CurrentWeeklyStatus` / `CurrentWeeklyRemainingPercent`
- `IntervalBoostPermille` / `WeeklyBoostPermille`

### 2. 修改 queryMinimaxQuota() 计算逻辑
- 优先使用 `current_interval_remaining_percent` 计算已用百分比：`usedPercent = 100 - remainingPercent`
- 使用 `remains_time`（秒）直接转换为 `RemainingMs`（毫秒），取代从 `end_time - now` 的计算
- 保留旧的 total_count/usage_count 逻辑作为 fallback（兼容旧 API）
- 同样处理 weekly 窗口

### 3. 保留兼容性
- 如果新字段为 0（旧 API 仍返回 total_count > 0），回退到旧的计算逻辑
- 确保不同 MiniMax 账户类型的 API 返回都能正确处理

## Acceptance Criteria (Gherkin)
### User Story
作为运维人员，我需要 MiniMax 渠道的配额数据正确显示，以便准确判断渠道是否可用。

### Scenarios (Given/When/Then)

**Scenario 1: 新 API 格式正确解析**
- Given MiniMax API 返回新格式（remaining_percent 字段）
- When 系统查询 MiniMax 配额
- Then 5h 窗口使用百分比 = 100 - remaining_percent
- And weekly 窗口使用百分比 = 100 - weekly_remaining_percent
- And RemainingMs = remains_time * 1000

**Scenario 2: 旧 API 格式兼容**
- Given MiniMax API 返回旧格式（total_count > 0, 无 remaining_percent）
- When 系统查询 MiniMax 配额
- Then 使用 total_count / usage_count 计算百分比
- And 使用 end_time - now 计算 RemainingMs

**Scenario 3: API 错误处理**
- Given MiniMax API 返回非 0 的 status_code
- When 系统查询 MiniMax 配额
- Then 设置 QueryError 字段
- And 不添加任何窗口数据

### General Checklist
- [x] 代码自测通过
- [x] 不影响其他提供商的配额查询
- [x] 兼容新旧两种 API 返回格式

## Merge Record
- **Completed**: 2026-06-02
- **Merged Branch**: feature/minimax-limit-api-compat
- **Merge Commit**: 3fedadd
- **Archive Tag**: feat-minimax-limit-api-compat-20260602
- **Conflicts**: none
- **Files Changed**: 1 (one-api/controller/channel-quota.go, +55/-11)
- **Duration**: same day
