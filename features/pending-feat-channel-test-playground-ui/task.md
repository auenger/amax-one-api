# Tasks: feat-channel-test-playground-ui

## Task Breakdown

### 1. Playground 弹窗组件
- [ ] 新增 `views/Channel/component/ChannelTestPlayground.js`
  - [ ] Dialog 弹窗，标题含渠道名 + ID
  - [ ] 模型下拉（解析 `item.models`，默认第一个）
  - [ ] prompt 多行输入 + 发送按钮
  - [ ] 响应区流式渲染（`fetch` + `response.body.getReader()` 解析 `data:`）
  - [ ] 状态条：loading / 耗时 / 错误（error 色高亮）
  - [ ] 关闭弹窗 `AbortController.abort()` 中止请求

### 2. 入口接入
- [ ] `TableRow.js` 操作菜单（Popover）新增"测试" MenuItem
- [ ] `TableRow.js` 响应时间列旁增加测速图标 IconButton
- [ ] 两个入口打开同一弹窗（倾向 TableRow 内部持有 open 状态）

### 3. 联调与自测
- [ ] 调用 `POST /api/channel/test/:id/chat`，`{ model, messages, stream: true }`
- [ ] 流式逐字渲染、耗时/错误展示验证
- [ ] `cd aihub/web/web && npm run build` 通过
- [ ] rebuild.sh 嵌入前端

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
