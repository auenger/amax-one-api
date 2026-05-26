# Tasks: feat-affinity-fallback

## Task Breakdown

### 1. Fallback 亲和实现
- [x] 新增 fallback key 生成函数 (extractSessionFallbackId)
- [x] 新增 Redis key prefix `affinity:session:`
- [x] 新增 `AFFINITY_FALLBACK_TTL_SECONDS` 环境变量（默认 1800s）
- [x] 修改 affinity middleware：无 conversation_id 时生成 fallback key

### 2. 测试
- [x] 单元测试：fallback key 生成 (TestExtractSessionFallbackId)
- [x] 单元测试：fallback 亲和绑定/解绑 (TestGetAffinityFallbackTTL, TestAffinityRedisKeyFormat)
- [x] 单元测试：显式亲和优先级 (TestAffinityFallback_PriorityConversationOverSession)

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-26 | Feature created | 从 feat-affinity-auto-bind 拆分，依赖探针结果 |
| 2026-05-26 | Implementation complete | 4 files changed, 12 tests passing |
