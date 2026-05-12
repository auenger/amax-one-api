# Tasks: feat-phase1-usage-metering

## Task Breakdown

### 1. 数据模型
- [ ] 设计 Prisma schema (UsageLog)
- [ ] 创建索引 (virtual_key_id+created_at, provider_id+created_at, model_id+created_at, request_id unique)
- [ ] 创建数据库迁移

### 2. 内部接口
- [ ] 实现 recordUsage() — 写入 UsageLog (fire-and-forget)
- [ ] 实现 getUsageSummary() — 按维度聚合查询

### 3. openai-proxy 集成
- [ ] 非流式响应：从 OpenAI 格式提取 usage 调用 recordUsage()
- [ ] 流式 SSE 响应：从最后一个 chunk 提取 usage 调用 recordUsage()
- [ ] 错误响应：估算 prompt_tokens 并记录

### 4. auth-pool 集成
- [ ] validateVirtualKey() 增加 budget 检查 (调用 getUsageSummary)
- [ ] budget 超限返回 429

### 5. 外部 API
- [ ] 实现 GET /v1/usage (查询用量记录)
- [ ] 实现 GET /v1/usage/summary (用量汇总)

### 6. 测试
- [ ] 单元测试 (recordUsage, getUsageSummary)
- [ ] 集成测试 (openai-proxy → metering 链路)
- [ ] Budget 检查集成测试

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-12 | Feature 创建 | 等待前置 Feature 完成 |
