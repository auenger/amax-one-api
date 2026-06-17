# Feature: feat-channel-test-playground-ui 渠道测试对话窗（前端）

## Basic Information
- **ID**: feat-channel-test-playground-ui
- **Name**: 渠道测试对话窗（Playground）前端
- **Priority**: 80
- **Size**: M
- **Dependencies**: [feat-channel-test-stream-api]
- **Parent**: feat-channel-test-playground
- **Children**: []
- **Created**: 2026-06-17

## Description
在渠道管理页新增 Playground 弹窗：选模型、输 prompt、SSE 流式渲染上游响应、显示耗时与错误。入口为每行操作菜单"测试"项 + 响应时间列旁测速按钮。消费 `feat-channel-test-stream-api` 提供的 `POST /api/channel/test/:id/chat` 流式端点。

## User Value Points
1. 显式单测入口（菜单项 + 行内测速按钮），点击即打开对话窗——替换当前隐藏在响应时间标签点击里的不可发现入口
2. 可选模型 + 输入 prompt，看到上游真实响应内容（而非仅耗时）
3. SSE 流式逐字渲染 + 耗时 / 错误展示

## Context Analysis

### Reference Code
- 表格行组件（操作菜单、隐藏单测）：`aihub/web/web/src/views/Channel/component/TableRow.js`（菜单 `:249-262`，`handleResponseTime` `:98-107`）
- 响应时间标签（现有隐蔽入口，将旁挂测速按钮）：`aihub/web/web/src/views/Channel/component/ResponseTimeLabel.js`
- 渠道主页面（按钮、manageChannel 封装）：`aihub/web/web/src/views/Channel/index.js`（批量测试 `:245`，`manageChannel` `:111-142`）
- API 封装：`aihub/web/web/src/utils/api.js`
- 前端约定：MUI 5、函数组件 + hooks、JSX（见 CLAUDE.md）

### Related Features
- **feat-channel-test-stream-api**（依赖，提供流式接口）
- feat-health-status-ui（渠道管理页 UI 风格参考）
- feat-provider-quota-ui（同页 ChannelQuotaCell 组件参考）

## Technical Solution
1. 新增组件 `views/Channel/component/ChannelTestPlayground.js`：
   - `Dialog` 弹窗，标题显示渠道名 + ID
   - 模型下拉：从 `item.models`（逗号分隔）解析为 `MenuItem` 列表，默认选第一个
   - prompt 多行输入（`TextField multiline`）+ 发送按钮
   - 响应区：流式追加文本（`fetch` + `response.body.getReader()` 解析 `data:` 行逐块 setState；POST 流式不能用 EventSource）
   - 状态条：流式中 loading，结束后显示总耗时；错误用 error 色高亮
   - 关闭弹窗时 `AbortController.abort()` 中止进行中的请求
2. 入口接入 `TableRow.js`：
   - 操作菜单（`Popover`）新增"测试" `MenuItem`，onClick 打开 Playground（参考编辑/删除 MenuItem 写法 `:249-262`）
   - 响应时间列（`ResponseTimeLabel` 旁）增加测速图标 `IconButton`，onClick 打开同一弹窗
   - 弹窗 open 状态 + 选中 channel：可由 `TableRow` 内部持有，或上提到 `index.js`（若多行共享单实例）；倾向 `TableRow` 内部持有，实现最简
3. 调用 `POST /api/channel/test/:id/chat`，body `{ model, messages, stream: true }`，流式渲染

## Acceptance Criteria (Gherkin)

### User Story
作为渠道管理员，我想从渠道列表直接打开一个测试对话窗，选模型、输 prompt，实时看到上游流式响应，从而验证渠道可用性。

### Scenarios (Given/When/Then)
```gherkin
Scenario: 入口可发现
  Given 渠道管理页表格已渲染
  Then 每行操作菜单(⋮)包含"测试"项
  And 响应时间列旁有一个测速图标按钮

Scenario: 打开对话窗并选模型
  Given 点击某行菜单"测试"项（或测速按钮）
  Then 弹出 Playground 对话窗，标题含渠道名与 ID
  And 模型下拉列出该渠道支持的所有模型，默认选第一个

Scenario: 流式渲染响应
  Given 对话窗已选模型并输入 prompt
  When 点击发送
  Then 响应区逐字流式显示上游响应
  And 流结束后状态条显示总耗时

Scenario: 上游错误展示
  Given 渠道上游异常
  When 发送测试
  Then 响应区或状态条显示上游错误信息（而非静默失败）

Scenario: 关闭弹窗中止请求
  Given 流式响应进行中
  When 关闭对话窗
  Then 中止进行中的流式请求并清理状态
```

### UI/Interaction Checkpoints
- 弹窗模型下拉默认选渠道第一个模型
- 流式期间发送按钮禁用并显示 loading
- 响应区支持滚动，长文本可读
- 错误用 error 色高亮

### General Checklist
- [ ] 菜单项 + 行内按钮两个入口都打开同一弹窗
- [ ] 模型列表来自渠道 `models` 字段
- [ ] SSE 逐字流式渲染（fetch + getReader）
- [ ] 关闭弹窗时 AbortController 中止请求
- [ ] 错误如实展示
- [ ] 遵循 MUI 5 + 函数组件约定
