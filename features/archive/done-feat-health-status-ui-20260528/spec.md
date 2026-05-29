# Feature: feat-health-status-ui 渠道健康状态前端展示与恢复阈值优化

## Basic Information
- **ID**: feat-health-status-ui
- **Name**: 渠道健康状态前端展示与恢复阈值优化
- **Priority**: 80
- **Size**: M
- **Dependencies**: feat-quota-exhaustion-recovery, feat-channel-failover
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-28

## Description
后端已有完整的渠道健康监控系统（healthy/degraded/unhealthy），配额 100% 时自动标记 unhealthy 并跳过路由。但前端完全没有展示健康状态，用户看不到渠道是否因配额满而不可用。同时恢复阈值设置为 95%，过于保守。

### 问题
1. **恢复阈值 95% 过于保守**：配额到 96% 就可以用了，但要等降到 95% 才恢复，不合理。应改为低于 100% 即可恢复。
2. **前端无健康状态展示**：渠道列表和模型广场都只显示 Channel Status（启用/禁用），看不到 Health Status（healthy/degraded/unhealthy）。配额 100% 导致渠道被路由跳过时，用户毫无感知。

## User Value Points
1. **运维可见性**：管理员在渠道列表和模型广场能直接看到渠道的健康状态（正常/降级/不可用），了解哪些渠道因配额满而被自动跳过
2. **更快恢复**：配额只要低于 100% 就立即恢复可用，减少不必要的等待时间

## Context Analysis

### Reference Code
- `one-api/monitor/quota-refresh.go` — 恢复阈值常量 `defaultQuotaRecoveryThreshold = 95.0`，需改为 100.0
- `one-api/monitor/health.go` — `GetChannelHealthStatus()`、`ShouldFailover()`、健康状态存储
- `one-api/controller/channel.go` — 渠道列表 API，需增加 health_status 字段
- `one-api/controller/model.go` — `GetModelChannels` API，需增加 health_status 字段
- `one-api/web/berry/src/views/Channel/component/TableRow.js` — 渠道列表行组件，需增加健康状态列
- `one-api/web/berry/src/views/Channel/component/TableHead.js` — 表头，需增加列
- `one-api/web/berry/src/views/ModelMarket/index.js` — 模型广场，需展示健康状态

### Related Documents
- 无外部文档

### Related Features
- feat-quota-exhaustion-recovery（归档）— 配额耗尽自动禁用与恢复，健康状态机基础
- feat-rate-limit-exhaustion（归档）— 429 限流联动 unhealthy
- feat-channel-failover（归档）— 渠道故障转移，healthy/degraded/unhealthy 状态机
- feat-model-marketplace（归档）— 模型广场
- feat-marketplace-flat-layout（归档）— 模型广场平铺布局
- feat-provider-quota-ui（归档）— 渠道管理页配额面板

## Technical Solution

### 1. 恢复阈值优化（后端）
**文件**: `one-api/monitor/quota-refresh.go`
- 将 `defaultQuotaRecoveryThreshold` 从 `95.0` 改为 `100.0`
- 恢复逻辑含义：所有窗口 UsedPercent < 100% 即可恢复（而非之前的 < 95%）

### 2. 后端 API 暴露健康状态
**文件**: `one-api/controller/channel.go`
- 在 `GetAllChannels` 和 `SearchChannels` 返回中，为每个 channel 附加 `health_status` 字段
- 调用 `monitor.GetChannelHealthStatus(channel.Id)` 从 Redis 读取
- 不启用 Redis 时默认返回 "healthy"

**文件**: `one-api/controller/model.go`
- 在 `GetModelChannels` 返回的 `ChannelInfo` 中增加 `HealthStatus string`
- 同样从 Redis 读取

### 3. 前端渠道列表健康状态列
**文件**: `one-api/web/berry/src/views/Channel/component/TableHead.js`
- 在"状态"列后增加"健康状态"列

**文件**: `one-api/web/berry/src/views/Channel/component/TableRow.js`
- 新增健康状态显示：healthy = 绿色 Label "正常"，degraded = 黄色 Label "降级"，unhealthy = 红色 Label "不可用"
- 使用 Tooltip 显示 reason（如 "quota exhausted: windows: 5h=100.0%"）

### 4. 模型广场健康状态展示
**文件**: `one-api/web/berry/src/views/ModelMarket/index.js`
- 在 `CHANNEL_STATUS_MAP` 旁增加健康状态映射
- 渠道卡片中已有状态 Chip，增加健康状态指示（如小圆点或额外的 Chip）

## Acceptance Criteria (Gherkin)

### User Story
作为管理员，我希望在渠道列表和模型广场中看到渠道的健康状态，以便了解哪些渠道因配额耗尽而不可用。同时配额只要低于 100% 就应该立即恢复。

### Scenarios (Given/When/Then)

#### Scenario 1: 配额恢复阈值验证
```gherkin
Given 渠道 A 的 5h 窗口配额从 100% 降到 99%
And 渠道 A 当前健康状态为 unhealthy
When 加速轮询器检查到配额恢复
Then 渠道 A 健康状态应变为 healthy
And 渠道 A 应恢复参与路由选择
```

#### Scenario 2: 渠道列表显示健康状态
```gherkin
Given 管理员打开渠道管理页面
And 渠道 A 健康状态为 healthy
And 渠道 B 健康状态为 unhealthy（配额耗尽）
When 页面加载完成
Then 渠道 A 的健康状态列显示绿色 "正常"
And 渠道 B 的健康状态列显示红色 "不可用"
And 鼠标悬停渠道 B 的健康状态显示原因 "quota exhausted: windows: 5h=100.0%"
```

#### Scenario 3: 渠道启用但 unhealthy 的区分
```gherkin
Given 渠道 A 的 status=1（已启用）且 health_status=unhealthy
When 管理员查看渠道列表
Then 渠道 A 的状态开关显示为开启
And 健康状态列显示红色 "不可用"
```

#### Scenario 4: 模型广场显示渠道健康状态
```gherkin
Given 用户打开模型广场
And 模型 X 有渠道 A（healthy）和渠道 B（unhealthy）
When 页面加载完成
Then 渠道 A 显示健康状态正常
And 渠道 B 显示健康状态不可用
```

#### Scenario 5: 未启用 Redis 时的降级处理
```gherkin
Given 系统未启用 Redis
When 管理员打开渠道管理页面
Then 所有渠道的健康状态列显示绿色 "正常"（默认值）
```

### UI/Interaction Checkpoints
- 渠道列表：状态列（开关）+ 健康状态列（Label）独立展示，互不影响
- 模型广场：渠道卡片中已有状态 Chip，新增健康状态视觉指示
- 健康状态支持 Tooltip 显示原因

### General Checklist
- [x] 恢复阈值从 95% 改为 100%
- [x] 渠道列表 API 返回 health_status 字段
- [x] 模型广场 API 返回 health_status 字段
- [x] 前端渠道列表增加健康状态列
- [x] 前端模型广场展示健康状态
- [x] Redis 未启用时默认返回 healthy

## Merge Record
- **Completed**: 2026-05-28
- **Merged Branch**: feature/health-status-ui
- **Merge Commit**: 410d9c362d29a27c05dda4beaa5fd1d509817bfe
- **Archive Tag**: feat-health-status-ui-20260528
- **Conflicts**: none
- **Verification**: PASS (5/5 Gherkin scenarios validated)
- **Files Changed**: 8 (5 backend, 3 frontend)
- **Commits**: 1
- **Duration**: same day
