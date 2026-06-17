# Checklist: feat-channel-test-stream-api

## Development
- [ ] `TestChannelChat` 实现完成
- [ ] 路由注册在 session 管理员鉴权组内
- [ ] 复用 relay 流式链路 + SpecificChannelId，未重写 adaptor

## Code Quality
- [ ] gofmt 标准格式
- [ ] 直接写 `c.Writer` 实现真实 SSE（非 httptest.NewRecorder）
- [ ] 不计配额、仅记测试日志

## Testing
- [ ] curl 流式/非流式/禁用渠道/上游错误 分支均符合预期
- [ ] `go build ./...` 通过

## Documentation
- [ ] spec.md 技术方案与实现一致
