# Feature: feat-error-passthrough 上游错误透传

## Basic Information
- **ID**: feat-error-passthrough
- **Name**: 上游错误透传
- **Priority**: 65
- **Size**: S
- **Dependencies**: none
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-19

## Description
当上游 provider 返回错误时，one-api 当前会丢失部分错误细节（Claude 格式统一返回 api_error，429 被中文覆盖，原始响应只在 debug 模式记录）。本 feature 要求将上游错误"原样"透传给客户端，并始终记录原始响应，方便分析和降级决策。

## User Value Points
1. **错误透传** — 客户端收到上游 provider 的完整错误信息（type、code、message），而非 one-api 重新包装的通用错误
2. **错误日志增强** — 生产环境始终记录上游原始错误响应体，不再依赖 debug 模式

## Context Analysis
### Reference Code
- `one-api/relay/controller/error.go` — `RelayErrorHandler()` 解析上游错误，仅在 `config.DebugEnabled` 时记录原始 body
- `one-api/controller/relay.go:108-118` — OpenAI 格式最终错误返回，429 被中文覆盖
- `one-api/controller/anthropic_relay.go:213-231` — Claude 格式最终错误返回，所有错误统一为 `"api_error"` 类型
- `one-api/relay/model/misc.go` — `Error` / `ErrorWithStatusCode` 结构体
- `one-api/service/claude_convert.go` — `ClaudeError` / `ClaudeErrorDetail` 类型

### Related Documents
### Related Features
- [[feat-claude-parity]] — Anthropic 协议对齐（已归档）
- [[feat-channel-failover]] — 渠道故障转移（已归档）

## Technical Solution

### 修改 1: `relay/controller/error.go` — 始终记录原始响应

当前代码（line 79-81）：
```go
if config.DebugEnabled {
    logger.SysLog(fmt.Sprintf("error happened, status code: %d, response: \n%s", resp.StatusCode, string(responseBody)))
}
```

改为始终记录（INFO 级别，因为这是上游错误不是本地 bug）：
```go
logger.SysLog(fmt.Sprintf("upstream error, status code: %d, response: %s", resp.StatusCode, string(responseBody)))
```

同时在 `ErrorWithStatusCode` 中保留原始响应体，供后续使用：
- 在 `relay/model/misc.go` 的 `ErrorWithStatusCode` 中新增 `RawBody string` 字段
- 在 `RelayErrorHandler` 中赋值

### 修改 2: `controller/anthropic_relay.go` — Claude 格式错误透传

当前代码（line 223-229）所有错误都变为 `"api_error"`：
```go
c.JSON(bizErr.StatusCode, service.ClaudeError{
    Type: "api_error",
    Error: service.ClaudeErrorDetail{
        Type:    "api_error",
        Message: bizErr.Error.Message,
    },
})
```

改为：保留上游错误信息，将 one-api 的元数据放在额外字段：
```go
c.JSON(bizErr.StatusCode, gin.H{
    "type": "error",
    "error": gin.H{
        "type":    bizErr.Error.Type,    // 保留上游类型 (upstream_error, one_api_error 等)
        "message": bizErr.Error.Message,
    },
    "upstream_code": bizErr.Error.Code,   // 上游错误码
    "upstream_status": bizErr.StatusCode,  // 上游 HTTP 状态码
})
```

### 修改 3: `controller/relay.go` — OpenAI 格式错误增强

当前 429 被覆盖：
```go
if bizErr.StatusCode == http.StatusTooManyRequests {
    bizErr.Error.Message = "当前分组上游负载已饱和，请稍后再试"
}
```

改为：保留原始错误信息，附加中文提示：
```go
if bizErr.StatusCode == http.StatusTooManyRequests {
    bizErr.Error.Message = "当前分组上游负载已饱和，请稍后再试 | upstream: " + bizErr.Error.Message
}
```

## Acceptance Criteria (Gherkin)
### User Story
作为 API 使用者，当上游 provider 返回错误时，我希望能在响应中看到完整的错误信息，以便诊断问题和实现降级策略。

### Scenarios (Given/When/Then)

#### Scenario 1: 上游 500 错误透传（Claude 格式）
```gherkin
Given 上游 provider 返回 500 错误，body 为 {"error": {"type": "server_error", "message": "sequence item 0: expected str instance, NoneType found"}}
When 客户端通过 /v1/messages 发送请求
Then 响应中保留上游的 error type ("server_error") 和原始 message
And 响应包含 upstream_code 和 upstream_status 字段
```

#### Scenario 2: 上游 429 错误透传（OpenAI 格式）
```gherkin
Given 上游 provider 返回 429 错误，body 为 {"error": {"message": "Rate limit exceeded", "type": "rate_limit_error"}}
When 客户端通过 /v1/chat/completions 发送请求
Then 响应中包含中文提示和原始上游错误信息
And 原始 upstream message 不会被完全覆盖
```

#### Scenario 3: 生产环境错误日志
```gherkin
Given 生产环境 config.DebugEnabled = false
When 上游 provider 返回错误响应
Then one-api 日志中记录上游的 HTTP status code 和原始 response body
```

#### Scenario 4: one-api 内部错误不受影响
```gherkin
Given 用户配额不足
When 请求通过认证
Then 返回原有的 "insufficient_user_quota" 错误格式不变
```

### General Checklist
- [x] 不影响正常请求的成功响应
- [x] 向后兼容现有客户端
- [x] 错误日志不泄露敏感信息（API key 等）
