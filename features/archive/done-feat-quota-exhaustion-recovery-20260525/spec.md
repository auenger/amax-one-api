# Feature: feat-quota-exhaustion-recovery 配额耗尽自动禁用与恢复

## Basic Information
- **ID**: feat-quota-exhaustion-recovery
- **Name**: 配额耗尽自动禁用与恢复
- **Priority**: 75
- **Size**: M
- **Dependencies**: feat-provider-quota-refresh
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-25

## Description

GLM/Minimax 等提供商的套餐（5 小时/每周限额）在用量达到 100% 后，当前系统仅标记为 `degraded`（降级），但 distributor 仍会路由到这些渠道，导致请求失败和用户感知延迟。

需要一个后台自动机制：
1. **自动禁用**：配额 100% → 标记 channel 为 `unhealthy`，distributor 完全跳过
2. **加速轮询**：对已耗尽渠道缩短查询间隔（10min → 1min），快速感知配额重置
3. **自动恢复**：配额重置后立即恢复为 `healthy`，重新参与路由

### 问题根因

- `monitor/quota-refresh.go` 中 `QUOTA_LOW_THRESHOLD`（默认 90%）触发 `MarkChannelDegraded`
- `degraded` 渠道仍被 distributor 路由（`filterHealthyChannels` 只过滤 `unhealthy`）
- 10 分钟刷新间隔太长，配额重置后恢复延迟高
- 没有针对"已耗尽"状态的专门处理

### 涉及提供商

| 提供商 | 限额类型 | 查询 API |
|--------|---------|----------|
| GLM/Zhipu | 5h/7d 窗口限额 | `api.z.ai/api/monitor/usage/quota/limit` |
| Minimax | 5h 间隔 + 每周限额 | `api.minimaxi.com/v1/api/openplatform/coding_plan/remains` |

## User Value Points

1. **VP1: 零延迟路由规避** — 配额耗尽时立即跳过该渠道，用户不会因为路由到不可用渠道而遭遇超时/错误
2. **VP2: 秒级自动恢复** — 配额重置后最快 1 分钟内自动恢复，无需人工干预

## Context Analysis

### Reference Code
- `one-api/monitor/quota-refresh.go` — 配额刷新调度器，`StartQuotaRefresher()` 10 分钟轮询
- `one-api/monitor/health.go` — 健康状态管理，`MarkChannelDegraded()`, `ShouldFailover()`
- `one-api/middleware/distributor.go` — 渠道路由，`filterHealthyChannels()` 只跳过 `unhealthy`
- `one-api/controller/channel-quota.go` — 提供商配额查询，`queryProviderQuota()` 分发到各供应商
- `one-api/model/quota.go` — `QuotaWindow` 模型，`UsedPercent`/`RemainingMs`/`ResetAt`

### Related Documents

### Related Features
- **feat-provider-quota-refresh** (已完成) — 定时配额刷新基础设施
- **feat-provider-quota-api** (已完成) — 配额查询 API
- **feat-provider-quota-ui** (已完成) — 配额 UI 面板
- **feat-channel-routing** (已完成) — 智能路由框架

## Technical Solution

### 核心机制：配额耗尽状态机

```
Healthy ──[quota >= 95%]──> Degraded ──[quota >= 100%]──> Unhealthy (quota-exhausted)
                                    │                          │
                                    │              [加速轮询 1min]
                                    │                          │
                                    └─────[quota < 95%]────────┘
                                                               │
                                                    [配额重置检测到 < 100%]
                                                               │
                                                          Healthy
```

### 实现方案

#### 1. 扩展 health.go — 新增配额耗尽标记

```go
// MarkChannelQuotaExhausted 标记渠道配额耗尽（unhealthy + 原因）
func MarkChannelQuotaExhausted(channelId int, reason string)

// IsQuotaExhausted 检查渠道是否因配额耗尽被禁用
func IsQuotaExhausted(channelId int) bool
```

- 在 `ChannelHealth` 中新增 `Reason string` 字段，区分健康检查失败 vs 配额耗尽
- Redis key: `channel:quota:exhausted:{channelId}` — 布尔标记，TTL 跟随配额窗口的 `ResetAt`

#### 2. 扩展 quota-refresh.go — 耗尽检测 + 加速轮询

```go
// 新增：配额耗尽处理逻辑
func handleQuotaExhaustion(channelId int, quota *model.ChannelQuota)
func handleQuotaRecovery(channelId int)

// 新增：加速轮询调度器（独立 goroutine）
func StartExhaustionPoller()
```

**耗尽检测**：在 `refreshChannelQuota()` 末尾检查所有 `QuotaWindow.UsedPercent >= 100`，触发 `MarkChannelQuotaExhausted`。

**加速轮询**：
- 维护一个 `map[int]time.Time` 跟踪已耗尽渠道及其下次查询时间
- 独立 goroutine，1 分钟间隔遍历已耗尽渠道
- 仅查询已耗尽渠道的配额（而非全量），减少 API 调用
- 检测到恢复 → `MarkChannelHealthy` + 从耗尽列表移除

#### 3. 环境变量配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `QUOTA_EXHAUSTION_THRESHOLD` | 100 | 触发禁用的用量百分比 |
| `QUOTA_EXHAUSTION_POLL_INTERVAL` | 60s | 加速轮询间隔 |
| `QUOTA_RECOVERY_THRESHOLD` | 95 | 恢复阈值（低于此值才恢复） |

#### 4. main.go 启动注册

```go
if common.RedisEnabled {
    monitor.StartExhaustionPoller()
}
```

### 关键设计决策

1. **复用 health 系统**而非新建状态：distributor 已经检查 `ShouldFailover()`，直接标记 `unhealthy` 即可生效
2. **独立加速轮询**而非修改全局轮询间隔：避免增加所有渠道的查询频率
3. **Redis 标记**而非 DB 状态：配额耗尽是临时状态，用 Redis TTL 自动过期更合适
4. **Reason 字段**区分配额耗尽 vs 健康检查失败：避免健康检查覆盖配额耗尽状态

## Acceptance Criteria (Gherkin)

### User Story
作为平台管理员，我希望系统在 GLM/Minimax 套餐配额耗尽时自动禁用相关渠道，并在配额恢复后自动重新启用，以避免用户因路由到不可用渠道而遭遇延迟。

### Scenarios (Given/When/Then)

#### Scenario 1: 配额耗尽自动禁用
```gherkin
Given GLM 渠道 "zhipu-main" 当前配额的 5h 窗口用量为 98%
When 配额刷新器查询到 5h 窗口用量升至 100%
Then 渠道 "zhipu-main" 被标记为 unhealthy (reason: "quota exhausted")
And distributor 不再将请求路由到 "zhipu-main"
And "zhipu-main" 被加入加速轮询列表
```

#### Scenario 2: 加速轮询检测恢复
```gherkin
Given 渠道 "zhipu-main" 因配额耗尽处于 unhealthy 状态
And 加速轮询器每 60 秒查询一次配额
When 查询到 5h 窗口配额已重置，用量降至 0%
Then 渠道 "zhipu-main" 恢复为 healthy 状态
And "zhipu-main" 从加速轮询列表移除
And distributor 重新将请求路由到 "zhipu-main"
```

#### Scenario 3: Minimax 每周限额耗尽
```gherkin
Given Minimax 渠道 "minimax-pro" 的每周限额用量为 100%
When 配额刷新器检测到每周窗口 UsedPercent >= 100%
Then 渠道被标记为 unhealthy
And 加速轮询器启动对 "minimax-pro" 的高频查询
```

#### Scenario 4: 多窗口部分耗尽
```gherkin
Given 渠道有两个窗口：5h (80%) 和 weekly (100%)
When 任一窗口达到 100%
Then 渠道被标记为 unhealthy（只要有一个窗口耗尽就禁用）
```

#### Scenario 5: Redis 不可用时的降级
```gherkin
Given Redis 连接断开
When 配额刷新器尝试标记渠道耗尽
Then 降级为仅标记 degraded（不依赖 Redis 的标记）
And 日志记录警告信息
```

### UI/Interaction Checkpoints
- 无前端改动（纯后端逻辑）
- Channel 管理页的配额面板应正确显示耗尽状态（已有 unhealthy 状态展示）

### General Checklist
- [ ] 不影响非 GLM/Minimax 渠道的配额刷新逻辑
- [ ] 加速轮询不会导致供应商 API 限流
- [ ] 并发安全（多个 goroutine 访问耗尽列表）

## Merge Record

- **Completed**: 2026-05-25
- **Merged Branch**: feature/feat-quota-exhaustion-recovery
- **Merge Commit**: d30bcde
- **Archive Tag**: feat-quota-exhaustion-recovery-20260525
- **Conflicts**: None
- **Verification**: PASS (5/5 Gherkin scenarios, all packages vet clean)
- **Files Changed**: 3 files (+408 lines, -6 lines)
- **Duration**: Same day (started/completed 2026-05-25)
