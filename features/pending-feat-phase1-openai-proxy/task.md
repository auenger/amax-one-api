# Tasks: feat-phase1-openai-proxy

## Task Breakdown

### 1. 代理框架
- [ ] 实现 Fastify HTTP 代理 (透传到 new-api)
- [ ] 实现 Authorization header 替换 (VK → new-api token)
- [ ] 支持 Bearer (OpenAI) 和 x-api-key (Anthropic) 两种认证 header
- [ ] 实现 OpenAI SSE stream pipe
- [ ] 实现 Anthropic SSE stream pipe
- [ ] 配置 new-api 连接 (base_url, internal_token, timeout)

### 2. 中间件集成
- [ ] 集成 auth-pool validateVirtualKey() 认证中间件
- [ ] 集成 model-registry resolveModel() 别名解析
- [ ] 集成 usage-metering recordUsage() 用量提取

### 3. OpenAI 协议端点
- [ ] 实现 POST /v1/chat/completions (非流式透传)
- [ ] 实现 POST /v1/chat/completions (流式 SSE 透传)
- [ ] 实现 POST /v1/embeddings (透传)
- [ ] 实现 GET /v1/models (代理到 model-registry)

### 4. Anthropic 协议端点
- [ ] 实现 POST /v1/messages (非流式透传)
- [ ] 实现 POST /v1/messages (流式 SSE 透传)

### 5. 响应清洗与 Usage 提取
- [ ] 响应 model 字段替换 (返回用户原始模型名/别名)
- [ ] 响应 header 清洗 (移除 provider 标识)
- [ ] OpenAI 响应: 从 usage 字段提取 token 数
- [ ] Anthropic 响应: 从 usage 字段提取 token 数
- [ ] 流式: 从最后一个 chunk 提取 usage
- [ ] 错误: 估算 prompt_tokens

### 6. 错误处理
- [ ] VK 失败 → 401 (RFC 7807, 不泄漏 provider)
- [ ] Budget 超限 → 429 (RFC 7807)
- [ ] 上游不可达 → 502 (RFC 7807, 不暴露 new-api/provider 名)
- [ ] 上游超时 → 504 (RFC 7807)
- [ ] 上游 4xx/5xx → 统一转为 RFC 7807

### 7. 测试
- [ ] 单元测试 (header 替换, usage 提取, 双协议认证)
- [ ] 集成测试 — OpenAI 协议路径
- [ ] 集成测试 — Anthropic 协议路径
- [ ] 集成测试 — 跨协议路由 (Anthropic 输入 → OpenAI 后端)
- [ ] 性能测试 (P99 < 500ms)

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-08 | Feature 创建 | 等待前置 Feature 完成 |
| 2026-05-12 | Spec 更新 | 简化为 new-api 透传代理 |
| 2026-05-12 | Spec 更新 | 新增 Anthropic 协议端点，支持双协议入口 |
