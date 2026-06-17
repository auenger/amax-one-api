# Feature: feat-channel-test-stream-api 渠道流式测试端点

## Basic Information
- **ID**: feat-channel-test-stream-api
- **Name**: 渠道流式测试端点
- **Priority**: 80
- **Size**: S
- **Dependencies**: []
- **Parent**: feat-channel-test-playground
- **Children**: []
- **Created**: 2026-06-17

## Description
为渠道测试对话窗提供后端流式接口。新增 `POST /api/channel/test/:id/chat`，复用现有 relay 流式链路与 `SpecificChannelId` 指定渠道机制，把上游 SSE 响应透传给前端。请求不计入用户配额，仅记一条测试日志（`RecordTestLog`）。

## User Value Points
1. 提供"指定单渠道 + 流式"的测试通道，前端 Playground 可直接消费标准 OpenAI SSE，无需改造 relay 主链路

## Context Analysis

### Reference Code
- 现有非流式 TestChannel（旁路，不可复用于流式）：`aihub/controller/channel-test.go:68-214`
- model 选择/回退逻辑（可复用）：`channel-test.go:92-104`
- 测试日志记录：`channel-test.go:124`（`model.RecordTestLog`）
- **SpecificChannelId 机制（关键复用）**：`aihub/middleware/distributor.go:33-48`，`SetupContextForSelectedChannel` `:244-281`
- **relay 流式入口（关键复用）**：`aihub/controller/relay.go:145`（`Relay`），`aihub/relay/controller/text.go:27`（`RelayTextHelper`，内部按 `meta.IsStream` 分流）
- SSE 渲染：`aihub/common/render/render.go`（`SetEventStreamHeaders`、`StringData`、`Done`）
- ctxkey：`aihub/common/ctxkey/key.go`（`Channel`、`BaseURL`、`Config`、`SpecificChannelId`）
- 路由注册：`aihub/router/api.go:86-87`（channelRoute 组，需确认 session 鉴权挂载位置）

### Related Features
- **feat-user-channel-select**（指定渠道机制同源，参考）
- **feat-error-passthrough**（上游错误透传，测试需如实返回上游错误）

## Technical Solution
1. 在 `controller/channel-test.go` 新增 `TestChannelChat(c *gin.Context)`：
   - 解析 `:id`、`model.GetChannelById(id, true)` 校验存在，状态非启用则拒绝（参考 distributor 对禁用渠道的处理）
   - 解析 body：`{ model, messages[], stream }`（OpenAI Chat 格式）
   - 构造 `GeneralOpenAIRequest`；model 不在渠道支持列表时回退到渠道第一个模型（复用 `channel-test.go:92-104` 逻辑）
   - 通过 `SetupContextForSelectedChannel` + `ctxkey`（Channel/BaseURL/Config）注入，强制指定该 channel（**不**走 distributor 的 group/model 选择）
   - 流式分支：`common.SetEventStreamHeaders(c)`，调用 relay 流式链路（优先 `relay.RelayTextHelper` 或直接走 adaptor `StreamHandler`），把上游 SSE 透传写 `c.Writer`
   - 非流式分支（`stream=false`）：返回标准 OpenAI Chat JSON
   - **不计配额**：测试通道跳过 quota 扣减与正式 Log 记录
   - 流结束后异步 `model.RecordTestLog`（含 channelId、model、耗时、成功/失败/上游错误）
2. 在 `router/api.go` 注册 `channelRoute.POST("/test/:id/chat", controller.TestChannelChat)`，确保位于 session 管理员鉴权组内（与 `GET /test/:id` 同组）

> 实现注意：现有 `testChannel` 用 `httptest.NewRecorder`（缓冲）无法流式，新函数必须直接写 `c.Writer` 走真实 SSE。优先复用 relay 链路而非重写 adaptor 调用。

## Acceptance Criteria (Gherkin)

### User Story
作为前端 Playground，我需要一个"指定单渠道 + 流式"的后端接口，发标准 OpenAI Chat 请求即可拿到上游 SSE 流。

### Scenarios (Given/When/Then)
```gherkin
Scenario: 流式测试成功
  Given 已存在一个启用的渠道 #10，支持模型 gpt-4o
  When 管理员 POST /api/channel/test/10/chat，body 含 {"model":"gpt-4o","messages":[{"role":"user","content":"hi"}],"stream":true}
  Then 响应 Content-Type 为 text/event-stream
  And 上游响应以 SSE data: 块逐块透传给客户端
  And 流结束后记录一条测试日志（channel=10, model=gpt-4o, 耗时=X）
  And 不扣减任何用户配额、不产生正式请求日志

Scenario: 模型不在渠道支持列表时回退
  Given 渠道 #10 支持 [gpt-4o]，请求 model=claude-3
  When POST /api/channel/test/10/chat
  Then 使用渠道第一个支持模型（gpt-4o）发起测试

Scenario: 渠道不存在或已禁用
  Given 渠道 #99 不存在，或渠道 #10 已被禁用
  When POST /api/channel/test/99/chat（或 /10/chat）
  Then 返回 success=false 并给出明确错误信息

Scenario: 上游错误透传
  Given 渠道配置错误导致上游返回 4xx/5xx
  When POST /api/channel/test/10/chat
  Then 上游错误信息如实返回客户端（参考 feat-error-passthrough）
  And 记录一条失败测试日志

Scenario: 非流式模式
  When POST /api/channel/test/10/chat body 含 stream=false
  Then 返回标准 OpenAI Chat JSON 响应（非 SSE）
```

### General Checklist
- [ ] 端点注册在 session 管理员鉴权组内
- [ ] 复用 relay 流式链路 + SpecificChannelId，不重写 adaptor
- [ ] 不计配额，仅记测试日志
- [ ] 上游错误如实透传
- [ ] 直接写 c.Writer 实现真实 SSE（非 recorder）
