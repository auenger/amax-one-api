# Tasks: feat-claude-parity

## Task Breakdown

### 1. 重构路由层 `router/relay.go`
- [ ] 新增 `/openai/v1/...` 路由组，挂载完整中间件
- [ ] 新增 `/anthropic/v1/messages` 路由组，挂载完整中间件
- [ ] 保留 `/v1/...` 兼容旧路径，同时注册 OpenAI 和 Anthropic 端点
- [ ] 删除旧的 `claudeRouter` 及手动 Distribute 调用
- [ ] 三个路由组共享相同中间件（提取 `commonMiddleware`）

### 2. 更新 `relay/relaymode/helper.go`
- [ ] `GetByPath()` 添加去除 `/openai` 和 `/anthropic` 前缀的逻辑
- [ ] 确保路径识别对三种前缀都正确

### 3. 新增 `controller/anthropic_relay.go`
- [ ] 实现 `RelayAnthropic(c *gin.Context)` 入口函数
- [ ] 解析 Claude 格式请求，校验 model/max_tokens
- [ ] 调用 `service.ClaudeToOpenAIRequest()` 转换为 OpenAI 格式
- [ ] 替换 `c.Request.Body`
- [ ] 用 `claudeResponseWriter` 包装 c.Writer 捕获 OpenAI 响应
- [ ] 调用标准 `relayHelper()` → `RelayTextHelper()`
- [ ] 成功时：将 OpenAI 响应转换为 Claude 格式写回（含流式 SSE）
- [ ] 失败时：将 OpenAI 错误转换为 Claude 格式错误
- [ ] 实现重试：保存原始 Claude body，重试时重新转换

### 4. 删除 `controller/claude_relay.go`
- [ ] 删除整个文件（441 行）
- [ ] 确认无其他文件引用

### 5. 验证
- [ ] `go build` 编译通过
- [ ] `go test ./...` 测试通过
- [ ] 手动测试：`/openai/v1/chat/completions` 正常
- [ ] 手动测试：`/anthropic/v1/messages` 非流式格式正确 + 日志记录
- [ ] 手动测试：`/anthropic/v1/messages` 流式格式正确 + 日志记录
- [ ] 手动测试：`/v1/chat/completions` 和 `/v1/messages` 旧路径兼容

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-18 | Feature created | 代码分析完成，问题确认 |
