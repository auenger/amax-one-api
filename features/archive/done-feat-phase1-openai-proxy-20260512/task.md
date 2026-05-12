# Tasks: feat-phase1-openai-proxy

## Task Breakdown

### 1. 代理框架
- [x] 实现 Fastify HTTP 代理 (透传到 new-api)
- [x] 实现 Authorization header 替换 (VK → new-api token)
- [x] 支持 Bearer (OpenAI) 和 x-api-key (Anthropic) 两种认证 header
- [x] 实现 OpenAI SSE stream pipe
- [x] 实现 Anthropic SSE stream pipe
- [x] 配置 new-api 连接 (base_url, internal_token, timeout)

### 2. 中间件集成
- [x] 集成 auth-pool validateVirtualKey() 认证中间件
- [x] 集成 model-registry resolveModel() 别名解析
- [x] 集成 usage-metering recordUsage() 用量提取 (Phase 1: 写审计日志, 待 usage-metering feature 接管)

### 3. OpenAI 协议端点
- [x] 实现 POST /v1/chat/completions (非流式透传)
- [x] 实现 POST /v1/chat/completions (流式 SSE 透传)
- [x] 实现 POST /v1/embeddings (透传)
- [x] 实现 GET /v1/models (代理到 model-registry)

### 4. Anthropic 协议端点
- [x] 实现 POST /v1/messages (非流式透传)
- [x] 实现 POST /v1/messages (流式 SSE 透传)

### 5. 响应清洗与 Usage 提取
- [x] 响应 model 字段替换 (返回用户原始模型名/别名)
- [x] 响应 header 清洗 (移除 provider 标识)
- [x] OpenAI 响应: 从 usage 字段提取 token 数
- [x] Anthropic 响应: 从 usage 字段提取 token 数
- [x] 流式: 从最后一个 chunk 提取 usage
- [ ] 错误: 估算 prompt_tokens (推迟到 Phase 2, 需要 tiktoken)

### 6. 错误处理
- [x] VK 失败 → 401 (RFC 7807, 不泄漏 provider)
- [x] Budget 超限 → 429 (RFC 7807)
- [x] 上游不可达 → 502 (RFC 7807, 不暴露 new-api/provider 名)
- [x] 上游超时 → 504 (RFC 7807)
- [x] 上游 4xx/5xx → 统一转为 RFC 7807

### 7. 测试
- [x] 单元测试 (header 替换, usage 提取, 双协议认证)
- [x] 集成测试 — OpenAI 协议路径
- [x] 集成测试 — Anthropic 协议路径
- [x] 集成测试 — 跨协议路由 (Anthropic 输入 → OpenAI 后端, 通过 mock 验证透传逻辑)
- [ ] 性能测试 (P99 < 500ms) (推迟到集成环境部署后)

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-08 | Feature 创建 | 等待前置 Feature 完成 |
| 2026-05-12 | Spec 更新 | 简化为 new-api 透传代理 |
| 2026-05-12 | Spec 更新 | 新增 Anthropic 协议端点，支持双协议入口 |
| 2026-05-12 | 全部核心实现完成 | 31 tests pass (proxy 12 + vk-auth 9 + proxy-routes 10) |

## Files Changed

### New files (gateway)
- `apps/gateway/src/services/proxy.ts` — HTTP 代理服务 (透传到 new-api, 流式/非流式, usage 提取, 响应清洗)
- `apps/gateway/src/plugins/vk-auth.ts` — VK 认证中间件 (Bearer + x-api-key 双协议认证)
- `apps/gateway/src/routes/proxy.ts` — 代理路由 (OpenAI + Anthropic 双协议端点)
- `apps/gateway/test/proxy.test.ts` — 代理服务单元测试 (12 tests)
- `apps/gateway/test/vk-auth.test.ts` — VK 认证中间件测试 (9 tests)
- `apps/gateway/test/proxy-routes.test.ts` — 代理路由集成测试 (10 tests)

### Modified files (gateway)
- `apps/gateway/src/index.ts` — 注册代理路由
- `apps/gateway/src/services/index.ts` — 添加 proxy 服务导出
