# Tasks: feat-phase1-model-registry

## Task Breakdown

### 1. 数据模型

- [x] 设计 Prisma schema (Provider, ProviderKey, Model, ModelAlias, ChannelSyncLog)
- [x] 创建数据库迁移

### 2. 供应商管理

- [x] 实现 Provider CRUD API (含初始 API Keys)
- [x] 实现 ProviderKey CRUD API (含 AES-256-GCM 加密存储)
- [x] 实现 ProviderKey 脱敏显示 (仅返回 key_prefix)
- [x] 实现 new-api Channel 同步 (创建/更新/删除，含 Key 同步)
- [x] 实现同步失败记录 (ChannelSyncLog)
- [x] 实现同步补偿定时任务

### 3. 模型管理

- [x] 实现 Model CRUD API (含 capability/status 过滤)
- [x] 实现模型变更触发 Channel 同步

### 4. 别名管理

- [x] 实现别名管理 API (1:1 映射)
- [x] 实现 resolveModel() 内部接口

### 5. 测试

- [x] 单元测试 (CRUD, resolveModel, 加密/解密, 同步逻辑)
- [x] 集成测试 (含 new-api 同步)

## Progress Log

| Date       | Progress     | Notes                                        |
| ---------- | ------------ | -------------------------------------------- |
| 2026-05-08 | Feature 创建 | 等待前置 Feature 完成                        |
| 2026-05-12 | Spec 更新    | 新增 new-api Channel 同步 + ProviderKey 管理 |
| 2026-05-12 | 全部实现完成 | 14 tests pass, TypeScript compiles clean     |

## Files Changed

### New files (gateway)

- `apps/gateway/src/utils/crypto.ts` — AES-256-GCM 加密/解密 + 密钥脱敏
- `apps/gateway/src/services/new-api-sync.ts` — new-api Channel 同步服务 (创建/更新/删除/重试)
- `apps/gateway/src/services/model-resolver.ts` — 模型名/别名解析 + 供应商状态查询
- `apps/gateway/src/services/index.ts` — Services barrel export
- `apps/gateway/src/routes/providers.ts` — Provider CRUD + Key CRUD + Sync Status
- `apps/gateway/src/routes/models.ts` — Model CRUD (含 capability/status 过滤, cursor 分页)
- `apps/gateway/src/routes/aliases.ts` — Alias CRUD (1:1 映射)
- `apps/gateway/src/routes/internal.ts` — 内部接口 (resolve, provider-status, sync-retry)
- `apps/gateway/test/crypto.test.ts` — 加密/解密/脱敏单元测试 (7 tests)
- `apps/gateway/test/model-resolver.test.ts` — resolveModel 单元测试 (5 tests)

### Modified files (gateway)

- `apps/gateway/src/index.ts` — 注册所有新路由
- `apps/gateway/src/config/index.ts` — 添加 NEW*API*\*, ADMIN_API_KEY, ENCRYPTION_KEY 环境变量
- `apps/gateway/tsconfig.json` — 清除继承的 paths 以正确解析 workspace 包

### Modified files (database)

- `packages/database/prisma/schema.prisma` — 添加 Provider, ProviderKey, Model, ModelAlias, ChannelSyncLog 模型
- `packages/database/prisma/migrations/20260512_model_registry/migration.sql` — 迁移 SQL
