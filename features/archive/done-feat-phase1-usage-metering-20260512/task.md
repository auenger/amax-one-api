# Tasks: feat-phase1-usage-metering

## Task Breakdown

### 1. 数据模型
- [x] 设计 Prisma schema (UsageLog)
- [x] 创建索引 (virtual_key_id+created_at, provider_id+created_at, model_id+created_at, request_id unique)
- [x] 创建数据库迁移

### 2. 内部接口
- [x] 实现 recordUsage() — 写入 UsageLog (fire-and-forget)
- [x] 实现 getUsageSummary() — 按维度聚合查询

### 3. openai-proxy 集成
- [x] 非流式响应：从 OpenAI 格式提取 usage 调用 recordUsage()
- [x] 流式 SSE 响应：从最后一个 chunk 提取 usage 调用 recordUsage()
- [x] 错误响应：估算 prompt_tokens 并记录

### 4. auth-pool 集成
- [x] validateVirtualKey() 增加 budget 检查 (调用 getUsageSummary)
- [x] budget 超限返回 429

### 5. 外部 API
- [x] 实现 GET /v1/usage (查询用量记录)
- [x] 实现 GET /v1/usage/summary (用量汇总)

### 6. 测试
- [x] 单元测试 (recordUsage, getUsageSummary)
- [x] 集成测试 (openai-proxy → metering 链路)
- [x] Budget 检查集成测试

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-12 | Feature 创建 | 等待前置 Feature 完成 |
| 2026-05-12 | 全部实现完成 | UsageLog schema + recordUsage + getUsageSummary + proxy 集成 + auth-pool Budget 集成 + 外部 API + 测试 |

## Files Changed

### New files (gateway)
- `apps/gateway/src/services/usage.ts` — 用量计量服务 (recordUsage, getUsageSummary, getUsageLogs, getUsageGroupSummary)
- `apps/gateway/src/routes/usage.ts` — 用量查询 API (GET /v1/usage, GET /v1/usage/summary)
- `apps/gateway/test/usage.test.ts` — 用量服务单元测试

### New files (database)
- `packages/database/prisma/migrations/20260512_usage_logs/migration.sql` — UsageLog 表迁移

### Modified files (gateway)
- `apps/gateway/src/routes/proxy.ts` — recordUsageAsync 改为调用 recordUsage(), 增加延迟计时和错误用量记录
- `apps/gateway/src/services/virtual-key.ts` — checkBudget 集成 getUsageSummary()
- `apps/gateway/src/services/index.ts` — 导出 usage 服务
- `apps/gateway/src/index.ts` — 注册用量路由

### Modified files (database)
- `packages/database/prisma/schema.prisma` — 新增 UsageLog model, RequestType/UsageStatus enums
