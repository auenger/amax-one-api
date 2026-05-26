# Feature: feat-affinity-debug-probe 请求调试探针

## Basic Information
- **ID**: feat-affinity-debug-probe
- **Name**: 请求调试探针
- **Priority**: 80
- **Size**: S
- **Dependencies**: []
- **Parent**: feat-affinity-auto-bind
- **Children**: []
- **Created**: 2026-05-26

## Description

在线上 relay 入口添加 debug 日志，捕获 Claude Code 请求的所有 HTTP headers 和 body 关键字段（user、metadata、custom_id 等），用于确认哪些标识符可用于会话亲和。

目标：收集请求数据 → 确认可用的会话标识 → 为 fallback 亲和方案提供依据。

## User Value Points

### VP1: 请求结构可视化
在 DEBUG_ENABLED 模式下，完整记录每个 relay 请求的 headers 和 body 关键字段，便于分析客户端行为。

## Context Analysis

### Reference Code
- `one-api/controller/relay.go:140-146` — 已有 debug body 日志，需增强
- `one-api/common/config/config.go` — `DebugEnabled` 开关

### Related Features
- feat-affinity-auto-bind (parent)
- feat-channel-affinity (已完成)

## Technical Solution

在 `controller/relay.go` 的 `Relay()` 函数中，扩展现有 debug 日志：

1. **Headers 日志**: 遍历 `c.Request.Header` 记录所有 header（排除 Authorization 敏感信息，只保留前8字符）
2. **Body 关键字段**: 从 request body 提取 `user`、`metadata`、`conversation_id` 等字段单独记录
3. **Affinity 状态**: 记录是否命中亲和、使用了哪个 conversation_id

### 日志格式
```
[DEBUG] relay probe | method=POST path=/v1/chat/completions
[DEBUG] relay probe | headers: X-Conversation-Id=, User-Agent=Claude-Code/1.0, ...
[DEBUG] relay probe | body fields: user=xxx, metadata=xxx, model=glm-5.1
[DEBUG] relay probe | affinity: conversation_id=, specific_channel_id=
```

## Acceptance Criteria (Gherkin)

### Scenario 1: Headers 捕获
```gherkin
Given DEBUG_ENABLED=true
When Claude Code 发送 chat completion 请求
Then 日志记录所有 HTTP headers
And Authorization header 只显示前8字符
```

### Scenario 2: Body 关键字段提取
```gherkin
Given DEBUG_ENABLED=true
When 请求 body 包含 "user": "kevin" 和 "metadata": {"session": "abc"}
Then 日志记录 user=kevin, metadata={"session":"abc"}
```

### Scenario 3: Affinity 状态
```gherkin
Given DEBUG_ENABLED=true
When 请求经过 Affinity 中间件
Then 日志记录 conversation_id 值（空或有值）
And 日志记录 specific_channel_id 值
```

### General Checklist
- [ ] Authorization header 脱敏处理
- [ ] 不影响非 debug 模式的性能
- [ ] 日志格式结构化便于 grep
