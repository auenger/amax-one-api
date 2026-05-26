# Tasks: feat-glm-coding-plan

## Task Breakdown

### 1. Backend — 渠道类型常量与映射
- [ ] 在 `relay/channeltype/define.go` 中新增 `ZhipuCoding` 和 `ZhipuCodingAnthropic` 常量（Dummy 前插入）
- [ ] 在 `relay/channeltype/url.go` 中新增两个默认 Base URL
- [ ] 在 `relay/apitype/define.go` 中新增 `ZhipuCoding` API type
- [ ] 在 `relay/channeltype/helper.go` 中添加 ChannelType → APIType 映射
- [ ] 验证 init() 的数组长度检查通过

### 2. Backend — ZhipuCoding Adaptor (OpenAI 协议)
- [ ] 创建 `relay/adaptor/zhipucoding/` 目录
- [ ] 实现 Adaptor 结构体，复用 OpenAI adaptor 的请求/响应转换
- [ ] 覆盖 `GetRequestURL`: `{BaseURL}/chat/completions`（无 `/v1/` 前缀）
- [ ] 覆盖 `SetupRequestHeader`: 确认鉴权方式（Bearer 或 JWT）
- [ ] 支持 streaming 模式
- [ ] 支持 embeddings 等其他 mode（如需要）

### 3. Backend — ZhipuCodingAnthropic 映射
- [ ] 在 `relay/adaptor.go` 工厂中注册 ZhipuCoding → adaptor
- [ ] 确认 ZhipuCodingAnthropic → Anthropic adaptor 映射正确
- [ ] 确认 Anthropic adaptor URL `{BaseURL}/v1/messages` 与 GLM 端点匹配

### 4. Frontend — 渠道类型显示
- [ ] 在 `ChannelConstants.js` 的 `CHANNEL_OPTIONS` 中添加两条新映射
- [ ] 验证渠道创建/编辑页面下拉框显示正确

### 5. 集成测试
- [ ] 启动服务，创建 ZhipuCoding 渠道，验证请求路由
- [ ] 创建 ZhipuCodingAnthropic 渠道，验证请求路由
- [ ] 验证现有 Zhipu 渠道不受影响
- [ ] 验证 streaming 模式

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-26 | Feature created | 需求分析完成，技术方案设计完成 |
