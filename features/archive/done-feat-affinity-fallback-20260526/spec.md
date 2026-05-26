# Feature: feat-affinity-fallback Fallback 自动亲和

## Basic Information
- **ID**: feat-affinity-fallback
- **Name**: Fallback 自动亲和（Token+Model 绑定）
- **Priority**: 75
- **Size**: S
- **Dependencies**: [feat-affinity-debug-probe]
- **Parent**: feat-affinity-auto-bind
- **Children**: []
- **Created**: 2026-05-26

## Description

当客户端不发送 conversation_id 时，基于 `X-Claude-Code-Session-Id` header 实现 fallback 亲和策略，将同一会话的请求自动绑定到同一渠道。

## User Value Points

### VP1: 自动渠道绑定
无 conversation_id 时，基于 Claude Code Session-Id 自动绑定到同一渠道，减少渠道跳动。

## Context Analysis

### Reference Code
- `one-api/middleware/affinity.go` — 需扩展 fallback 逻辑
- `one-api/middleware/distributor.go` — 渠道分发
- `one-api/common/ctxkey/key.go` — 需新增 context key

### Related Features
- feat-affinity-auto-bind (parent)
- feat-affinity-debug-probe (前置依赖，已完成)
- feat-channel-affinity (已完成)

### 探针实测结论（feat-affinity-debug-probe）

Claude Code 2.1.150 发送 `/v1/messages` 请求时的标识符：

| 标识 | 示例值 | 可用性 |
|------|--------|--------|
| `X-Claude-Code-Session-Id` (header) | `f8fad9d3-07ea-4a0c-9a38-cf51743ff63c` | **最佳** — 同会话所有请求一致，UUID 格式 |
| `metadata.user_id.session_id` (body) | 同上 | 备选 — 需解析 body |
| `metadata.user_id.device_id` (body) | `93aae21f...` | 不适合 — 跨会话不变 |
| `X-Conversation-Id` (header) | 不存在 | 当前亲和依赖此 header，Claude Code 不发送 |
| `conversation_id` (body) | 不存在 | 同上 |
| `User-Agent` | `claude-cli/2.1.150` | 可用于识别 Claude Code 请求 |

**结论：** 使用 `X-Claude-Code-Session-Id` header 作为 fallback 亲和 key，同一会话内稳定，且无需解析 body。

## Technical Solution

在 `affinity.go` 的 `Affinity()` 中间件中，当 `conversation_id` 为空时：

1. **检测 fallback key**: 从 `X-Claude-Code-Session-Id` header 提取 session ID
2. **Redis 映射**: key = `affinity:session:{session_id}`，value = channel_id
3. **TTL**: 30 分钟（可配置 `AFFINITY_FALLBACK_TTL_SECONDS`）
4. **优先级**: 显式 conversation_id > Session-Id fallback > 正常路由
5. **记录时机**: 首次路由成功后记录 session → channel 映射

### 代码改动
- `middleware/affinity.go`: 新增 `extractSessionFallbackId()`，在 conversation_id 为空时尝试提取
- `middleware/affinity.go`: `Affinity()` 中增加 fallback 分支
- `controller/relay.go` + `controller/anthropic_relay.go`: 路由成功后调用 `RecordAffinityMapping()`（已有）
- `common/ctxkey/key.go`: 新增 `SessionFallbackId` key

## Acceptance Criteria (Gherkin)

### Scenario 1: Fallback 亲和绑定（Session-Id）
```gherkin
Given 客户端未发送 conversation_id
And 请求 header 包含 X-Claude-Code-Session-Id=f8fad9d3-...
When 首次请求 "glm-5.1" 被路由到渠道 #4
Then 记录 fallback affinity: "affinity:session:f8fad9d3-..." → "4"
When 后续同 Session-Id 请求
Then 自动使用渠道 #4
```

### Scenario 2: 渠道故障转移
```gherkin
Given fallback affinity 绑定渠道 #4
And 渠道 #4 变为 unhealthy
When 新请求到达
Then 清除 fallback 映射，重新选择渠道
```

### Scenario 3: 显式亲和优先
```gherkin
Given 客户端发送了 X-Conversation-Id
Then 使用显式亲和，不触发 fallback
```

### General Checklist
- [x] 不影响现有 conversation_id 亲和
- [x] 独立 Redis key prefix
- [x] Fallback TTL 可配置

## Merge Record
- **Completed**: 2026-05-26
- **Branch**: feature/affinity-fallback
- **Merge Commit**: a17683c
- **Archive Tag**: feat-affinity-fallback-20260526
- **Conflicts**: none
- **Verification**: 12/12 tests passed
- **Stats**: 6 files changed, 228 insertions, 112 deletions, 1 commit
