# Feature: feat-rate-limit-exhaustion 429 Rate Limit 渠道自动禁用与恢复

## Basic Information
- **ID**: feat-rate-limit-exhaustion
- **Name**: 429 Rate Limit 渠道自动禁用与恢复
- **Priority**: 85
- **Size**: S
- **Dependencies**: feat-quota-exhaustion-recovery (completed)
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-25

## Description
GLM 等供应商返回 429 rate_limit_error 时，当前逻辑只将渠道标记为 Degraded，而 Degraded 渠道仍参与路由，导致请求持续失败。

修复方案：
1. 在 `processChannelRelayError` 中，对 429 错误进一步判断是否为配额耗尽型 rate limit
2. 解析 GLM 错误消息中的配额耗尽标志（"5 小时"、"每周"、"100%"等关键词 + error type `rate_limit_error`）
3. 如果是配额耗尽，直接调用 `MarkChannelQuotaExhausted` 标记为 Unhealthy（而非 Degraded）
4. 解析错误消息中的重置时间，设置精确 TTL，到期自动恢复

## User Value Points
1. **即时检测与禁用**: 429 配额耗尽时立即标记 Unhealthy，路由自动跳过该渠道
2. **精确自动恢复**: 基于供应商返回的重置时间设置 TTL，无需等待配额刷新器

## Context Analysis
### Reference Code
- `one-api/controller/relay.go:261-273` — processChannelRelayError, 当前 429 只标记 Degraded
- `one-api/monitor/health.go:216-236` — MarkChannelDegraded, 只从 Healthy→Degraded
- `one-api/monitor/health.go:258-302` — MarkChannelQuotaExhausted, 标记 Unhealthy + Redis TTL
- `one-api/monitor/health.go:306-339` — MarkChannelQuotaRecovered, 恢复逻辑
- `one-api/monitor/manage.go` — ShouldDisableChannel, 不匹配 429
- `one-api/monitor/quota-refresh.go` — checkQuotaExhaustion, 定时配额检查（10 分钟间隔）
- `one-api/middleware/distributor.go:131-142` — filterHealthyChannels, 只过滤 Unhealthy

### Related Documents
- GLM 错误格式: `{"type":"error","error":{"type":"rate_limit_error","code":"1308","message":"[1308][已达到 5 小时的使用上限。您的限额将在 2026-05-25 19:05:22 重置。][...]}}`

### Related Features
- feat-quota-exhaustion-recovery (completed) — 配额耗尽自动禁用与恢复基础设施
- feat-model-downgrade-strategy (completed) — 模型降级策略

## Technical Solution

### 核心改动

#### 1. 新增 `MarkChannelRateLimitExhausted` (health.go)

在 429 rate_limit_error 场景下，直接标记 Unhealthy 并设置 TTL：

```go
func MarkChannelRateLimitExhausted(channelId int, reason string, ttl time.Duration) {
    // 复用 MarkChannelQuotaExhausted 的 Redis marker + Unhealthy 逻辑
    MarkChannelQuotaExhausted(channelId, reason, ttl)
}
```

#### 2. 修改 `processChannelRelayError` (relay.go)

对 429 进一步判断，区分"普通 rate limit"和"配额耗尽型 rate limit"：

```go
if err.StatusCode == http.StatusTooManyRequests {
    if isQuotaExhaustedRateLimit(&err.Error) {
        reason, ttl := parseRateLimitExhaustion(&err.Error)
        monitor.MarkChannelRateLimitExhausted(channelId, reason, ttl)
    } else {
        monitor.MarkChannelDegraded(channelId, "rate limited (429)")
    }
}
```

#### 3. 新增 `isQuotaExhaustedRateLimit` 判断函数

检测条件（满足任一即为配额耗尽）：
- error type == "rate_limit_error" 且消息包含"使用上限"/"limit"
- 消息包含"100%"
- GLM 特定 code "1308"

#### 4. 新增 `parseRateLimitExhaustion` 解析函数

解析重置时间：
- GLM: "将在 2026-05-25 19:05:22 重置" → TTL = resetTime - now
- 通用: 如果无法解析，默认 TTL = 30 分钟

### 判断标准

触发 Unhealthy 的 429 场景：
1. GLM "5 小时使用上限" — error code 1308, type rate_limit_error
2. GLM "每周使用上限" — 类似格式
3. 其他供应商 rate_limit_error + 消息包含"上限"/"limit"/"100%"

不触发（仍为 Degraded）：
- 普通短窗口 rate limit（每分钟/每秒限制）
- 不包含配额耗尽标志的 429

### 自动恢复

- Redis marker 的 TTL 设为重置时间差（精确恢复）
- ExhaustionPoller 每 60 秒检查已耗尽渠道
- 恢复时调用 `MarkChannelQuotaRecovered` → Healthy

## Acceptance Criteria (Gherkin)
### User Story
作为系统管理员，我希望当 GLM 渠道因配额耗尽返回 429 时，系统能立即自动禁用该渠道并在配额重置后自动恢复，避免用户持续收到 429 错误。

### Scenarios (Given/When/Then)

#### Scenario 1: GLM 5 小时配额耗尽触发 Unhealthy
```gherkin
Given channel #2 是 GLM 渠道且状态为 Healthy
When GLM 返回 429 错误，error type 为 "rate_limit_error"，code 为 "1308"
  And 消息包含 "已达到 5 小时的使用上限"
  And 消息包含 "将在 2026-05-25 19:05:22 重置"
Then channel #2 应被标记为 Unhealthy
  And Redis 中应设置 channel:quota:exhausted:2 marker
  And TTL 应约为到 19:05:22 的时间差
  And 后续请求应被路由到其他渠道
```

#### Scenario 2: 普通短窗口 rate limit 保持 Degraded
```gherkin
Given channel #3 是某供应商渠道且状态为 Healthy
When 该供应商返回 429 错误，error type 为普通 "rate_limit"
  And 消息为 "Too many requests, please retry later"
Then channel #3 应被标记为 Degraded（非 Unhealthy）
  And 渠道仍可被路由选中（降级但不禁用）
```

#### Scenario 3: TTL 到期自动恢复
```gherkin
Given channel #2 因配额耗尽被标记为 Unhealthy
  And Redis marker TTL 已设置
When TTL 到期后 ExhaustionPoller 检查该渠道
  And 配额已低于恢复阈值
Then channel #2 应恢复为 Healthy
  And Redis marker 应被清除
  And 后续请求可正常路由到该渠道
```

#### Scenario 4: 重复 429 不重复标记
```gherkin
Given channel #2 已因配额耗尽被标记为 Unhealthy
When 同一渠道再次收到 429 rate_limit_error
Then 不应产生重复的错误日志刷屏
  And 状态应保持 Unhealthy
```

### General Checklist
- [x] 不影响现有 ShouldDisableChannel 逻辑
- [x] 不影响现有 Degraded 标记逻辑（普通 429 仍为 Degraded）
- [x] GLM v4 API 错误格式兼容（Anthropic 格式包装）

## Merge Record
- **Completed**: 2026-05-25
- **Branch**: feature/rate-limit-exhaustion
- **Merge commit**: fc1fc47
- **Archive tag**: feat-rate-limit-exhaustion-20260525
- **Conflicts**: none
- **Verification**: passed (4/4 Gherkin scenarios, go vet + go test pass)
- **Files changed**: 2 (controller/relay.go, monitor/health.go)
