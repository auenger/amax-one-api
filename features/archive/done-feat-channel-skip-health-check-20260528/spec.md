# Feature: feat-channel-skip-health-check 渠道跳过健康探针

## Basic Information
- **ID**: feat-channel-skip-health-check
- **Name**: 渠道跳过健康探针
- **Priority**: 85
- **Size**: S
- **Dependencies**: null
- **Parent**: null
- **Children**: null
- **Created**: 2026-05-28

## Description

当使用 Anthropic 等渠道类型配置第三方 API（如小米 token-plan）时，这些 API 不支持 `/v1/models` 端点。当前健康检查器每 30 秒向 `{baseURL}/v1/models` 发送 HTTP GET 探针，请求失败 3 次后渠道被标记为 unhealthy，导致：
- 正常路由被跳过（`filterHealthyChannels` 过滤掉 unhealthy 渠道）
- 兜底路由也受影响（unhealthy 的兜底渠道会被跳过）
- 渠道显示为不可用状态

解决方案：在 Channel 模型上增加 `skip_health_check` 字段。开启后，健康检查器仅做 TCP 连通性检测（baseURL 是否可达），跳过 `/v1/models` HTTP 探针。只要网络通就视为健康。

## User Value Points

1. **渠道可用性保障**：第三方 API 渠道不再因不支持标准 endpoint 而被误判为不健康，确保路由正常工作

## Context Analysis

### Reference Code
- `one-api/model/channel.go` — Channel 模型定义
- `one-api/monitor/health.go` — 健康检查核心逻辑
  - `checkChannelHealth()` (line 469) — 检查入口
  - `probeChannel()` (line 506) — HTTP 探针
  - `EvaluateHealth()` (line 117) — 健康评估
- `one-api/middleware/distributor.go` — 路由选择
  - `filterHealthyChannels()` (line 211) — 过滤不健康渠道
  - `tryFallbackRouting()` (line 110) — 兜底路由
- `one-api/web/berry/src/views/Channel/component/EditModal.js` — 渠道编辑弹窗

### Related Documents

### Related Features
- feat-channel-failover (渠道故障转移)
- feat-health-status-ui (健康状态前端展示)
- feat-quota-exhaustion-recovery (配额耗尽恢复)
- feat-rate-limit-exhaustion (429 自动禁用)

## Technical Solution

### 后端改动

1. **Channel 模型** (`model/channel.go`)
   - 新增 `SkipHealthCheck bool` 字段，gorm default false

2. **健康检查** (`monitor/health.go`)
   - `checkChannelHealth()` 开头检查 `channel.SkipHealthCheck`
   - 若为 true，改用 TCP 连通性检测：`net.DialTimeout("tcp", host:port, 5s)`
   - TCP 连通即视为健康，调用 `RecordHealthCheck(channelId, true, latencyMs)`
   - 跳过 quota window 检查和 `/v1/models` HTTP 探针

3. **API 无需改动** — Channel 的 CRUD API 自动包含新字段

### 前端改动

4. **渠道编辑弹窗** (`EditModal.js`)
   - 在"高级设置"区域增加 Switch 控件
   - 标签：跳过健康检查
   - 提示文字：开启后仅检测网络连通性，不验证 API 端点

5. **渠道列表** — 无需改动，health_status 显示逻辑不变

## Acceptance Criteria (Gherkin)

### User Story
作为管理员，我希望可以为不支持标准 /v1/models 端点的第三方 API 渠道跳过健康探针，只做连通性检测，这样这些渠道不会被误判为不健康而影响路由。

### Scenarios (Given/When/Then)

#### Scenario 1: 跳过健康检查的渠道使用 TCP 检测
```gherkin
Given 一个渠道配置了 skip_health_check = true
And 其 base_url 为 https://token-plan-cn.xiaomimimo.com/anthropic
When 健康检查器执行 checkChannelHealth
Then 应对该 URL 的 host:port 执行 TCP 连通性检测
And 不发送 HTTP GET /v1/models 请求
And TCP 连通则标记为 healthy
```

#### Scenario 2: 跳过健康检查的渠道网络不通时标记为不健康
```gherkin
Given 一个渠道配置了 skip_health_check = true
And 其 base_url 对应的服务不可达
When 健康检查器执行 checkChannelHealth
Then TCP 连接超时或失败
And 记录为失败探测
```

#### Scenario 3: 未开启跳过的渠道行为不变
```gherkin
Given 一个渠道 skip_health_check = false（默认）
When 健康检查器执行
Then 行为与当前完全一致（检查 quota windows + HTTP /v1/models 探针）
```

#### Scenario 4: 前端编辑弹窗可配置跳过健康检查
```gherkin
Given 管理员打开渠道编辑弹窗
Then 在高级设置区域可见"跳过健康检查"Switch 开关
When 切换开关并保存
Then 渠道的 skip_health_check 字段更新
And 开关状态在重新打开时正确反映
```

#### Scenario 5: 跳过健康检查的渠道正常参与路由
```gherkin
Given 一个渠道 skip_health_check = true 且 base_url 可达
And 该渠道被标记为 healthy
When 用户请求该渠道支持的模型
Then distributor 正常选中该渠道
And 请求成功代理到上游
```

### UI/Interaction Checkpoints
- 渠道编辑弹窗中 Switch 控件位置合理，与降级策略等高级设置在一起
- Switch 有清晰的说明文字

### General Checklist
- [x] 数据库迁移兼容（新字段有默认值 0/false）
- [x] Redis 不可用时 fallback 逻辑不受影响
- [x] 已有渠道升级后默认行为不变

## Merge Record
- **Completed**: 2026-05-28
- **Branch**: feature/channel-skip-health-check
- **Merge Commit**: 8b9f4ee
- **Archive Tag**: feat-channel-skip-health-check-20260528
- **Conflicts**: none
- **Verification**: 5/5 Gherkin scenarios PASS, go vet + go test PASS
- **Files Changed**: 4 (model/channel.go, monitor/health.go, EditModal.js, Config.js)
