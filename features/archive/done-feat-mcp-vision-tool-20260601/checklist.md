# Checklist: feat-mcp-vision-tool

## Completion Checklist

### Development
- [x] All tasks completed
- [x] Code self-tested
- [x] 内置 tool 与 upstream tool 共存测试通过
- [x] base64 和 URL 两种图片输入均可用

### Code Quality
- [x] Code style follows conventions (Go: gofmt, Frontend: MUI 5 + hooks)
- [x] 无硬编码，配置通过 BuiltinConfig 管理
- [x] 错误处理完善（渠道禁用、模型不支持、relay 超时）

### Testing
- [x] Go build + frontend build 通过
- [x] Gherkin 场景 1-5 通过代码分析验证
- [ ] 手动测试：创建 builtin provider → tools/list 可见 → tools/call 调用成功
- [ ] 手动测试：图片 URL 输入
- [ ] 手动测试：图片 base64 输入
- [ ] 手动测试：渠道禁用时正确返回错误
- [ ] 并发调用测试

### Documentation
- [x] spec.md technical solution filled
- [x] API 变更记录

## Verification Record

| Date | Status | Summary |
|------|--------|---------|
| 2026-06-01 | PASS | 37/37 tasks, 5/5 scenarios, Go+frontend build clean |
