# Feature: feat-minimax-quota-exhaustion MiniMax 配额耗尽联动自动禁用与恢复

## Basic Information
- **ID**: feat-minimax-quota-exhaustion
- **Name**: MiniMax 配额耗尽联动自动禁用与恢复
- **Priority**: 75
- **Size**: S
- **Dependencies**: feat-quota-exhaustion-recovery, feat-minimax-limit-display
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-25

## Description

联动 MiniMax 配额显示（feat-minimax-limit-display）与配额耗尽自动禁用/恢复机制（feat-quota-exhaustion-recovery），确保 MiniMax 渠道在配额耗尽时能正确触发自动禁用和恢复流程。

### 问题分析

当前 `checkQuotaExhaustion()` 是 provider 无关的，理论上能检测 MiniMax 的窗口耗尽。但 `queryMinimaxQuota()` 存在以下 edge case 会导致耗尽检测失效：

1. **`CurrentIntervalTotal == 0`**：MiniMax API 在某些套餐状态下返回 `total=0`，此时 `queryMinimaxQuota()` 跳过窗口创建（`if remain.CurrentIntervalTotal > 0`），导致耗尽无法被检测到
2. **空 `model_remains`**：如果 MiniMax API 在配额完全耗尽时返回空数组，不会创建任何窗口
3. **`CurrentWeeklyTotal == 0`**：同上，每周窗口也会被跳过

### 解决方案

在 `queryMinimaxQuota()` 中增加 MiniMax 专用耗尽检测逻辑，确保即使 API 返回异常值也能正确反映配额状态。

## User Value Points

1. **VP1: MiniMax 耗尽零遗漏** — 不论 MiniMax API 返回什么格式（正常/total=0/空），配额耗尽都能被检测到并触发渠道禁用

## Context Analysis

### Reference Code
- `one-api/controller/channel-quota.go:123-178` — `queryMinimaxQuota()` MiniMax 配额查询，存在 total=0 时跳过窗口的 gap
- `one-api/controller/channel-quota.go:51-60` — `MinimaxRemainsResponse` 响应类型定义
- `one-api/monitor/quota-refresh.go:344-416` — `checkQuotaExhaustion()` 耗尽检测逻辑（provider 无关）
- `one-api/monitor/quota-refresh.go:456-540` — `runExhaustionPoll()` 加速轮询（provider 无关，已支持）
- `one-api/monitor/health.go` — `MarkChannelQuotaExhausted()` / `MarkChannelQuotaRecovered()` 健康标记

### Related Documents
- MiniMax coding plan API: `GET https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`

### Related Features
- **feat-quota-exhaustion-recovery** (已完成) — 配额耗尽自动禁用与恢复基础设施
- **feat-minimax-limit-display** (已完成) — MiniMax URL 智能识别与配额显示
- **feat-provider-quota-refresh** (已完成) — 定时配额刷新
- **feat-provider-quota-api** (已完成) — 提供商配额查询 API

## Technical Solution

### 改动文件：`one-api/controller/channel-quota.go`

在 `queryMinimaxQuota()` 函数中，修改 MiniMax 响应解析逻辑：

1. **处理 `model_remains` 为空的情况**：如果 API 返回空数组，创建一个 `UsedPercent=100` 的标记窗口
2. **处理 `total=0` 的情况**：当 `total==0` 且 `usage>0` 时，视为 100% 耗尽；当 `total==0` 且 `usage==0` 时，跳过（无配额限制）

```go
// 当前逻辑 (有 gap):
if remain.CurrentIntervalTotal > 0 {
    usedPercent := float64(remain.CurrentIntervalUsage) / float64(remain.CurrentIntervalTotal) * 100
    // ...
}

// 改为:
if remain.CurrentIntervalTotal > 0 {
    usedPercent := float64(remain.CurrentIntervalUsage) / float64(remain.CurrentIntervalTotal) * 100
    // ... 同上
} else if remain.CurrentIntervalUsage > 0 {
    // total=0 但 usage>0 → 视为完全耗尽
    quota.Windows = append(quota.Windows, model.QuotaWindow{
        Label:       "5h",
        UsedPercent: 100,
        RemainingMs: remainingMs,
        ResetAt:     remain.EndTime,
    })
}
// total==0 && usage==0 → 无配额窗口限制，跳过（正确行为）
```

同样的逻辑应用到 weekly 窗口。

另外，在函数末尾添加空 `model_remains` 检测：

```go
// 如果 API 返回空 model_remains，可能是完全耗尽或无套餐
if len(resp.ModelRemains) == 0 {
    quota.Windows = append(quota.Windows, model.QuotaWindow{
        Label:       "api-empty",
        UsedPercent: 100,
        RemainingMs: 0,
        ResetAt:     0,
    })
}
```

**注意**：空 `model_remains` 视为 100% 耗尽是合理的，因为：
- 正常使用中的渠道不会返回空数组
- 空数组通常表示套餐到期/无有效配额
- 宁可误报（渠道被禁用，加速轮询会恢复）也不漏报（用户遭遇请求失败）

## Acceptance Criteria (Gherkin)

### User Story
作为平台管理员，我希望 MiniMax 渠道在配额耗尽时（不论 API 返回什么格式）都能被自动检测到并禁用，配额恢复后自动恢复。

### Scenarios (Given/When/Then)

#### Scenario 1: MiniMax 正常耗尽（usage >= total）
```gherkin
Given MiniMax 渠道 "minimax-pro" 的 5h 窗口 current_interval_usage=500, current_interval_total=500
When 配额刷新器查询到该渠道
Then 创建 UsedPercent=100% 的 5h 窗口
And 渠道被标记为 unhealthy (quota exhausted)
And 加入加速轮询列表
```

#### Scenario 2: MiniMax 返回 total=0, usage>0
```gherkin
Given MiniMax 渠道 "minimax-pro" 的 5h 窗口 current_interval_usage=100, current_interval_total=0
When 配额刷新器查询到该渠道
Then 创建 UsedPercent=100% 的 5h 窗口（total=0 + usage>0 视为耗尽）
And 渠道被标记为 unhealthy
```

#### Scenario 3: MiniMax 返回空 model_remains
```gherkin
Given MiniMax API 返回空 model_remains 数组
When 配额刷新器查询到该渠道
Then 创建 UsedPercent=100% 的 "api-empty" 窗口
And 渠道被标记为 unhealthy
```

#### Scenario 4: MiniMax 配额恢复
```gherkin
Given MiniMax 渠道 "minimax-pro" 因配额耗尽处于 unhealthy 状态
When 加速轮询器查询到 5h 窗口 usage=100, total=500 (UsedPercent=20%)
And weekly 窗口也低于 95%
Then 渠道恢复为 healthy
And 从加速轮询列表移除
```

#### Scenario 5: MiniMax total=0 且 usage=0（无配额限制）
```gherkin
Given MiniMax 渠道的 5h 窗口 current_interval_usage=0, current_interval_total=0
When 配额刷新器查询到该渠道
Then 该窗口被跳过（不创建耗尽窗口）
And 不触发耗尽检测
```

### UI/Interaction Checkpoints
- 无前端改动（纯后端逻辑）
- Channel 管理页配额面板应正确显示耗尽状态

### General Checklist
- [ ] 不影响现有 GLM/Zhipu 的耗尽检测逻辑
- [ ] 不影响 MiniMax 正常情况下的配额显示
- [ ] total=0 + usage=0 不触发误报
- [ ] 加速轮询对 MiniMax 渠道正常工作

## Merge Record
- **Completed**: 2026-05-25
- **Branch**: feature/feat-minimax-quota-exhaustion
- **Merge Commit**: 6c57b61
- **Archive Tag**: feat-minimax-quota-exhaustion-20260525
- **Conflicts**: None
- **Verification**: PASSED (5/5 Gherkin scenarios)
- **Files Changed**: 1 (one-api/controller/channel-quota.go)
- **Duration**: ~5min
