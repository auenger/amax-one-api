# Feature: feat-channel-test-playground 渠道测试对话窗（Playground）

## Basic Information
- **ID**: feat-channel-test-playground
- **Name**: 渠道测试对话窗（Playground）
- **Priority**: 80
- **Size**: L
- **Dependencies**: []
- **Parent**: null
- **Children**: [feat-channel-test-stream-api, feat-channel-test-playground-ui]
- **Created**: 2026-06-17
- **Split**: true

## Description
当前渠道管理页的"渠道测试"只有两种形态：① 工具栏"测试启用渠道"按钮，全量跑所有渠道（`views/Channel/index.js:245`）；② 点击每行响应时间标签触发单渠道测速，只返回耗时（`component/TableRow.js:98-107`，入口隐藏在数字标签里几乎不可发现）。两种都**看不到上游实际响应内容**，也无法用自定义 prompt / 模型验证渠道在真实对话下是否可用。

本 feature 在渠道管理页增加一个**渠道测试对话窗（Playground）**：独立弹窗，可选该渠道支持的模型、输入自定义 prompt，以 **SSE 流式**实时查看上游远程响应，并显示耗时与错误。入口为每行操作菜单的"测试"项 + 响应时间列旁的测速按钮。

测试请求**不计入用户配额**，仅记录一条测试日志（与现有 `TestChannel` 一致）。

后端基础设施已就绪：强制指定渠道的 `SpecificChannelId` 机制（`middleware/distributor.go:33-48`）与完整 SSE 流式链路（`controller/relay.go:145` → `relay/controller/text.go:27` → `relay/adaptor/openai/main.go:27`）均已存在。现有 `testChannel`（`controller/channel-test.go:68-167`）走 `httptest.NewRecorder` 旁路、不支持流式，无法复用，需新增一条"指定渠道 + 流式"的测试通道。

## User Value Points
1. **显式单测入口**：每行菜单"测试"项 + 响应时间列测速按钮，点击即打开对话窗（当前入口隐藏在响应时间标签点击里，几乎不可发现）
2. **可选模型 + 看上游响应**：对话窗内选模型、输 prompt，看到上游真实响应内容（而非仅耗时），验证渠道在真实对话下的可用性
3. **SSE 流式逐字显示**：实时流式渲染上游响应，提供即时反馈

## Context Analysis

### Reference Code
- 后端单测现状（旁路、非流式）：`aihub/controller/channel-test.go:68-167`（`testChannel` 用 httptest.NewRecorder，只回耗时+文本）
- 后端批量测试：`aihub/controller/channel-test.go:219-295`
- 路由：`aihub/router/api.go:86-87`（`GET /api/channel/test`、`GET /api/channel/test/:id`）
- **强制指定渠道机制（关键复用）**：`aihub/middleware/distributor.go:33-48`（`SpecificChannelId`），`SetupContextForSelectedChannel` `:244-281`
- **流式 SSE 链路（关键复用）**：`aihub/controller/relay.go:145`（`Relay`）→ `aihub/relay/controller/text.go:27`（`RelayTextHelper`）→ `aihub/relay/adaptor/openai/main.go:27`（`StreamHandler`）→ `aihub/common/render/render.go`（`SetEventStreamHeaders`/`StringData`/`Done`）
- 前端批量测试按钮：`aihub/web/web/src/views/Channel/index.js:245`
- 前端表格行 + 隐藏单测：`aihub/web/web/src/views/Channel/component/TableRow.js:98-107`（`handleResponseTime`）、`:249-262`（操作菜单只有"编辑""删除"）
- 前端响应时间标签（现有隐蔽入口）：`aihub/web/web/src/views/Channel/component/ResponseTimeLabel.js`

### Related Documents
- `CLAUDE.md`（渠道测试、relay 链路、API 约定）

### Related Features（归档）
- **feat-user-channel-select** —— `sk-{token}-{channelId}` 指定渠道机制，与 `SpecificChannelId` 同源，实现参考
- **feat-error-passthrough** —— 上游错误透传，对话窗需如实展示上游错误
- **feat-affinity-debug-probe** —— relay 调试探针，调试类功能参考

## Technical Solution
拆分为 2 个子 feature，顺序开发：

### 子1 feat-channel-test-stream-api（后端，S）
新增 `POST /api/channel/test/:id/chat`，session 鉴权（与其它 `/api/` 管理接口一致）。复用 distributor 的 `SpecificChannelId` 机制 + relay 流式链路，强制用指定 channel 转发，SSE 透传上游响应。不计配额，记测试日志（`RecordTestLog`）。

### 子2 feat-channel-test-playground-ui（前端，M，依赖子1）
Playground 弹窗（选模型 / prompt 输入 / SSE 流式渲染 / 耗时与错误显示）。入口：`TableRow.js` 菜单加"测试"项 + `ResponseTimeLabel` 旁测速按钮，统一打开弹窗。

## Acceptance Criteria (Gherkin)
（parent 层只列整体用户故事，具体场景见子 feature）

### User Story
作为渠道管理员，我希望在渠道列表里对单个渠道打开一个测试对话窗，选模型、输 prompt、实时看到上游流式响应，从而快速验证某个渠道（尤其是改完配置或新增后）在真实对话下是否可用、延迟如何、是否有错误——而不必依赖全量测试或隐蔽的响应时间点击。

### Scenarios (Given/When/Then)
见子 feature `feat-channel-test-stream-api` 与 `feat-channel-test-playground-ui`。

### General Checklist
见子 feature。
