# Tasks: feat-channel-test-stream-api

## Task Breakdown

### 1. 后端流式测试端点
- [ ] `controller/channel-test.go` 新增 `TestChannelChat(c *gin.Context)`
  - [ ] 解析 `:id` + `GetChannelById` 校验，禁用渠道拒绝
  - [ ] 解析 body `{ model, messages, stream }`
  - [ ] model 回退逻辑（复用 `channel-test.go:92-104`）
  - [ ] `SetupContextForSelectedChannel` + ctxkey 强制指定 channel
- [ ] 流式分支：`SetEventStreamHeaders` + 复用 relay 流式链路（`RelayTextHelper`/adaptor `StreamHandler`）透传 SSE 到 `c.Writer`
- [ ] 非流式分支：返回标准 OpenAI Chat JSON
- [ ] 不计配额（跳过 quota 扣减 + 正式 Log）
- [ ] 流结束异步 `model.RecordTestLog`（含 model/耗时/成功/失败/上游错误）
- [ ] 上游错误如实透传（参考 feat-error-passthrough）

### 2. 路由注册
- [ ] `router/api.go` 注册 `channelRoute.POST("/test/:id/chat", controller.TestChannelChat)`，置于 session 管理员鉴权组

### 3. 自测
- [ ] curl 流式测试：`curl -N -X POST .../api/channel/test/<id>/chat -d '{...,"stream":true}'` 看到 SSE 块
- [ ] curl 非流式、禁用渠道、上游错误等分支
- [ ] `cd aihub && go build ./...` 通过

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
