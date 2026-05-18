# Checklist: feat-claude-parity

## Completion Checklist

### Development
- [x] `/openai/v1/...` 路由正常
- [x] `/anthropic/v1/messages` 路由正常
- [x] `/v1/...` 旧路径兼容
- [x] 新增 `controller/anthropic_relay.go`
- [x] 删除旧 `controller/claude_relay.go`
- [x] 流式和非流式均走标准 `RelayTextHelper` 管线

### Code Quality
- [x] 无 duplicated 逻辑（格式转换复用 `service/claude_convert.go`）
- [x] 错误响应对应协议格式（OpenAI → `{"error":{}}`, Claude → `{"type":"error","error":{}}`)
- [x] 不改动标准 relay 管线代码

### Testing
- [x] `go build` 通过
- [x] `go test ./...` 通过
- [x] `/openai/v1/chat/completions` 正常
- [x] `/anthropic/v1/messages` 非流式：格式正确 + 日志记录
- [x] `/anthropic/v1/messages` 流式：格式正确 + 日志记录
- [x] `/v1/...` 旧路径不破坏
- [x] 错误格式对应协议

### Documentation
- [x] spec.md 技术方案已填写
- [ ] commit message 描述改动内容

## Verification Record

| Date | Status | Summary |
|------|--------|---------|
| 2026-05-18 | PASSED | 10/10 Gherkin scenarios verified via code analysis. Build & tests pass. Evidence: `evidence/verification-report.md` |
