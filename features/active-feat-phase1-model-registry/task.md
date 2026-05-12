# Tasks: feat-phase1-model-registry

## Task Breakdown

### 1. 数据模型
- [ ] 设计 Prisma schema (Provider, ProviderKey, Model, ModelAlias, ChannelSyncLog)
- [ ] 创建数据库迁移

### 2. 供应商管理
- [ ] 实现 Provider CRUD API (含初始 API Keys)
- [ ] 实现 ProviderKey CRUD API (含 AES-256-GCM 加密存储)
- [ ] 实现 ProviderKey 脱敏显示 (仅返回 key_prefix)
- [ ] 实现 new-api Channel 同步 (创建/更新/删除，含 Key 同步)
- [ ] 实现同步失败记录 (ChannelSyncLog)
- [ ] 实现同步补偿定时任务

### 3. 模型管理
- [ ] 实现 Model CRUD API (含 capability/status 过滤)
- [ ] 实现模型变更触发 Channel 同步

### 4. 别名管理
- [ ] 实现别名管理 API (1:1 映射)
- [ ] 实现 resolveModel() 内部接口

### 5. 测试
- [ ] 单元测试 (CRUD, resolveModel, 加密/解密, 同步逻辑)
- [ ] 集成测试 (含 new-api 同步)

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-08 | Feature 创建 | 等待前置 Feature 完成 |
| 2026-05-12 | Spec 更新 | 新增 new-api Channel 同步 + ProviderKey 管理 |
