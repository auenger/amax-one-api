# Feature: feat-model-downgrade-strategy 模型降级策略

## Merge Record
- **Completed**: 2026-05-25
- **Branch**: feature/feat-model-downgrade-strategy
- **Merge Commit**: da98b9e
- **Archive Tag**: feat-model-downgrade-strategy-20260525
- **Conflicts**: panel.js (stash conflict, auto-resolved - merged both IconArrowDown + IconDownload imports)
- **Verification**: PASSED (6/6 Gherkin scenarios, go build pass, go vet pass)
- **Files Changed**: 9 (3 new, 6 modified), 816 insertions

## Basic Information
- **ID**: feat-model-downgrade-strategy
- **Name**: 模型降级策略（配额百分比驱动）
- **Priority**: 70
- **Size**: M
- **Dependencies**: feat-provider-quota-refresh, feat-provider-quota-api
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-25

## Description
根据提供商配额剩余用量百分比，自动将请求模型降级到低成本版本。当某个提供商（如 GLM/MiniMax）的配额用量达到配置的百分比阈值时，所有经过该提供商渠道的请求，无论原始请求的模型名是什么，统一替换为降级目标模型。

**核心规则：**
- 全局生效 — 管理员配置后，所有用户的请求统一应用降级
- 按供应商级别降级 — 同一供应商的所有模型统一映射到目标模型（如所有 GLM 模型 → glm-4.7）
- 每个供应商独立配置阈值 — MiniMax 可设 80%，GLM 可设 90%
- 仅影响触发阈值的供应商 — 其他供应商模型正常

**示例降级映射：**
| 供应商 | 阈值 | 降级目标模型 |
|--------|------|-------------|
| GLM (智谱) | 90% | glm-4.7 |
| MiniMax | 80% | MiniMax-Text-01 (2.5) |

## User Value Points
1. **配额驱动模型降级引擎** — 请求时自动检查配额百分比，透明替换模型名，防止高端模型过度消耗配额
2. **管理员降级规则配置** — API + UI 配置每个供应商的降级阈值和目标模型，实时查看降级状态

## Context Analysis

### Reference Code
- `one-api/middleware/distributor.go` — 渠道选择，模型路由入口，降级拦截的最佳位置
- `one-api/monitor/quota-refresh.go` — 定时刷新配额数据到 Redis，提供百分比数据源
- `one-api/model/quota.go` — ChannelQuota 模型，包含配额数据和百分比计算
- `one-api/relay/adaptor/` — 38 个供应商适配器，请求转发的最终环节
- `one-api/model/ability.go` — Ability 表，管理 group-model-channel 映射
- `one-api/controller/channel.go` — Channel 管理 API

### Related Documents
- `one-api/monitor/quota-refresh.go` — 配额刷新机制（goroutine 定时刷新）
- `one-api/model/channel.go` — Channel 数据模型

### Related Features
- feat-quota-exhaustion-recovery (归档) — 配额耗尽禁用与恢复，已有 threshold + distributor 集成模式可复用
- feat-provider-quota-refresh (归档) — 定时刷新配额到 Redis，本 feature 的数据源
- feat-provider-quota-api (归档) — 配额查询 API，提供配额数据访问
- feat-minimax-limit-display (归档) — MiniMax 配额显示逻辑

## Technical Solution

### 方案概述
在 distributor 层（渠道路由时）增加模型降级拦截，基于 Redis 中的配额百分比数据判断是否需要降级，如需降级则替换请求中的模型名为目标模型。

### 数据模型
新增 `ModelDowngradeRule` 表（或使用 option 存储）：

```go
type ModelDowngradeRule struct {
    ID              int    `json:"id"`
    ProviderType    int    `json:"provider_type"`    // Channel.Type (供应商类型)
    ThresholdPct    int    `json:"threshold_pct"`     // 触发降级的用量百分比 (0-100)
    TargetModel     string `json:"target_model"`      // 降级目标模型名
    Enabled         bool   `json:"enabled"`           // 是否启用
}
```

### 核心流程
1. 管理员通过 API 配置降级规则（供应商类型 + 阈值 + 目标模型）
2. 配额刷新 goroutine（已有）在每次刷新后，检查是否有规则被触发
3. 触发的规则写入 Redis key `channel:downgrade:{provider_type}` → `{target_model}`
4. distributor 在模型路由时，检查当前 channel 的 provider_type 是否有降级标记
5. 如有降级标记，将请求中的 model 名替换为 target_model
6. 配额恢复到阈值以下时，自动移除降级标记

### 关键修改文件
1. `one-api/model/downgrade.go` — 新建，降级规则数据模型 + CRUD
2. `one-api/monitor/quota-refresh.go` — 在刷新逻辑中增加降级规则检查
3. `one-api/middleware/distributor.go` — 在路由时增加模型降级拦截
4. `one-api/controller/downgrade.go` — 新建，降级规则管理 API
5. `one-api/router/api.go` — 注册降级规则 API 路由
6. `one-api/web/berry/src/views/` — 管理页面 UI（降级规则配置）

### API 设计
```
GET    /api/downgrade/rules         — 获取所有降级规则
POST   /api/downgrade/rules         — 创建降级规则
PUT    /api/downgrade/rules/:id     — 更新降级规则
DELETE /api/downgrade/rules/:id     — 删除降级规则
GET    /api/downgrade/status        — 获取当前降级状态（哪些供应商正在降级）
```

## Acceptance Criteria (Gherkin)

### User Story
作为管理员，我希望根据配额剩余用量百分比自动降级模型，以便在配额紧张时自动切换到低成本模型，避免高端模型耗尽预算。

### Scenarios (Given/When/Then)

#### Scenario 1: 配额超阈值自动降级
```gherkin
Given GLM 供应商配额用量已达到 90%
And 存在降级规则: GLM 阈值 90%, 目标模型 glm-4.7
When 用户请求 glm-4-plus 模型
Then 系统自动将模型替换为 glm-4.7
And 请求正常转发到 GLM 供应商
And 日志中记录原始模型为 glm-4-plus，实际使用模型为 glm-4.7
```

#### Scenario 2: 不同供应商独立降级
```gherkin
Given GLM 配额用量 95%（超过阈值 90%）
And MiniMax 配额用量 70%（未超过阈值 80%）
When 用户分别请求 GLM 和 MiniMax 模型
Then GLM 请求被降级到 glm-4.7
And MiniMax 请求保持原始模型不变
```

#### Scenario 3: 配额恢复后自动取消降级
```gherkin
Given GLM 配额用量从 95% 降至 85%（低于阈值 90%）
When 配额刷新 goroutine 执行
Then 系统自动移除 GLM 的降级标记
And 后续 GLM 请求使用原始模型
```

#### Scenario 4: 管理员配置降级规则
```gherkin
Given 管理员登录系统
When 通过 API 创建降级规则: 供应商 MiniMax, 阈值 80%, 目标模型 MiniMax-Text-01
And 规则保存成功
Then MiniMax 配额超过 80% 时自动降级到 MiniMax-Text-01
```

#### Scenario 5: 降级规则禁用
```gherkin
Given 存在降级规则: MiniMax 阈值 80%, 已启用
When 管理员将规则设为禁用
Then MiniMax 配额超过 80% 时不触发降级
And 请求使用原始模型
```

#### Scenario 6: 无降级规则时正常工作
```gherkin
Given 不存在任何降级规则
When 用户请求任意模型
Then 请求使用原始模型，无降级处理
```

### General Checklist
- [ ] 降级替换在 distributor 层完成，对 relay 层透明
- [ ] 日志记录原始模型和实际使用模型
- [ ] Redis 降级标记有 TTL，防止过期标记残留
- [ ] 降级状态变更时记录日志
- [ ] 仅 Admin/Root 角色可配置降级规则
