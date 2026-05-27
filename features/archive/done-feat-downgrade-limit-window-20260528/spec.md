# Feature: feat-downgrade-limit-window 降级阈值基于限速窗口

## Basic Information
- **ID**: feat-downgrade-limit-window
- **Name**: 降级阈值基于限速窗口（5h）
- **Priority**: 75
- **Size**: S
- **Dependencies**: null
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-28

## Description
修改模型降级触发逻辑：降级阈值判断仅基于渠道的限速窗口（Label="5h"），不再将周期窗口（如 "weekly"、"7d"）纳入降级判断。

**当前问题：**
- `checkDowngradeRules()` 遍历渠道的所有配额窗口（Windows），只要任意窗口的 `UsedPercent >= 阈值` 就触发降级
- 这导致 MiniMax 的 `weekly` 窗口也会参与降级判断，即使 5h 限速窗口仍有余量，也可能因周额度百分比命中而触发降级

**期望行为：**
- 降级判断只看 Label="5h" 的窗口
- weekly、7d 等长周期窗口不参与降级判断
- 配额耗尽检测（Unhealthy）和低配额警告（Degraded）不受影响，仍然检查所有窗口

## User Value Points
1. **精准降级触发** — 只有限速窗口（5h）用量超阈值才降级，避免因周额度命中而误降级

## Context Analysis

### Reference Code
- `one-api/monitor/quota-refresh.go` — `checkDowngradeRules()` (第568-587行) 和 `cleanupDowngradeMarkers()` (第591-626行)
- `one-api/model/quota.go` — `QuotaWindow` 结构体，Label 字段标识窗口类型
- `one-api/controller/channel-quota.go` — 供应商配额查询，生成 Windows 数据

### Related Documents
- feat-model-downgrade-strategy (归档) — 原始降级策略实现
- feat-fallback-model (归档) — 兜底模型路由

### Related Features
- feat-model-downgrade-strategy (归档) — 本 feature 是对其降级触发逻辑的修正

## Technical Solution

### 修改范围
仅修改 `one-api/monitor/quota-refresh.go` 中的两个函数：

1. **`checkDowngradeRules()`** — 窗口遍历增加 Label 过滤，只检查 "5h" 窗口
2. **`cleanupDowngradeMarkers()`** — 恢复判断同样只看 "5h" 窗口

### 核心改动
```go
// 修改前：遍历所有窗口
for _, w := range quota.Windows {
    if w.UsedPercent >= threshold { ... }
}

// 修改后：只看 5h 窗口
for _, w := range quota.Windows {
    if w.Label != "5h" {
        continue
    }
    if w.UsedPercent >= threshold { ... }
}
```

### 不受影响的部分
- `checkQuotaExhaustion()` — 配额耗尽检测，仍然检查所有窗口（正确行为）
- `checkLowQuotaAlert()` — 低配额警告，仍然检查所有窗口（正确行为）
- 前端 UI 和 API 无需改动

## Acceptance Criteria (Gherkin)

### User Story
作为管理员，我希望降级只在限速窗口（5h）用量超阈值时触发，而不是周额度也参与判断，以便降级决策更精准。

### Scenarios (Given/When/Then)

#### Scenario 1: 5h 窗口超阈值触发降级
```gherkin
Given MiniMax 渠道配置降级阈值 80%
And MiniMax 5h 窗口用量 85%（超过阈值）
And MiniMax weekly 窗口用量 90%（也超过阈值）
When 配额刷新 goroutine 执行
Then 系统设置 MiniMax 渠道的降级标记
```

#### Scenario 2: 仅 weekly 超阈值不触发降级
```gherkin
Given MiniMax 渠道配置降级阈值 80%
And MiniMax 5h 窗口用量 60%（未超过阈值）
And MiniMax weekly 窗口用量 90%（超过阈值）
When 配额刷新 goroutine 执行
Then 系统不设置降级标记
And 请求使用原始模型
```

#### Scenario 3: 5h 窗口恢复后自动取消降级
```gherkin
Given MiniMax 渠道处于降级状态
And MiniMax 5h 窗口用量从 85% 降至 70%（低于阈值 80%）
When 配额刷新执行 cleanupDowngradeMarkers
Then 系统移除降级标记
And 后续请求使用原始模型
```

#### Scenario 4: 智谱渠道适配
```gherkin
Given 智谱渠道配额 API 返回 "5h" 和 "7d" 两个窗口
And 智谱渠道配置降级阈值 90%
And "5h" 窗口用量 75%，"7d" 窗口用量 95%
When 配额刷新 goroutine 执行
Then 系统不设置降级标记（因为 5h 未超阈值）
```

#### Scenario 5: 无 5h 窗口的渠道不触发降级
```gherkin
Given 某渠道配额查询返回的 Windows 中无 Label="5h" 的窗口
And 该渠道配置了降级阈值
When 配额刷新 goroutine 执行
Then 系统不设置降级标记
```

### General Checklist
- [ ] 降级判断仅看 Label="5h" 窗口
- [ ] 配额耗尽检测（Unhealthy）仍检查所有窗口
- [ ] 低配额警告（Degraded）仍检查所有窗口
- [ ] cleanupDowngradeMarkers 恢复逻辑同步修改
