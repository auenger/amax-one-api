# Verification Report: feat-error-passthrough

## Summary
- **Status**: PASSED
- **Date**: 2026-05-19
- **Feature**: 上游错误透传

## Task Completion
- Total: 6 tasks
- Completed: 6 (including build verification)
- Pending: 0

## Code Quality
- `go vet`: no issues
- `go build`: passes

## Gherkin Scenario Results

### Scenario 1: 上游 500 错误透传 (Claude 格式) — PASS
- `anthropic_relay.go:223-231`: Claude 格式错误返回使用 `gin.H` 保留上游 `bizErr.Error.Type` 和 `bizErr.Error.Code`
- 响应包含 `upstream_code` 和 `upstream_status` 字段

### Scenario 2: 上游 429 错误透传 (OpenAI 格式) — PASS
- `relay.go:109-110`: 429 错误保留原始 message，追加中文提示前缀
- 原始 upstream message 不会被完全覆盖

### Scenario 3: 生产环境错误日志 — PASS
- `error.go:78`: 无条件 `logger.SysLog()`，移除了 `config.DebugEnabled` 条件
- `ErrorWithStatusCode.RawBody` 保留原始响应体

### Scenario 4: one-api 内部错误不受影响 — PASS
- 内部错误 (请求解析、配额不足等) 仍使用 `service.ClaudeError` 结构体
- 只有经过 `RelayErrorHandler` 处理的上游错误才受影响

## Files Modified
1. `one-api/relay/model/misc.go` — 新增 `RawBody string` 字段
2. `one-api/relay/controller/error.go` — 移除 debug 条件，始终记录；赋值 RawBody
3. `one-api/controller/anthropic_relay.go` — Claude 错误透传（保留上游 type/code）
4. `one-api/controller/relay.go` — OpenAI 429 错误增强

## Issues
None.
