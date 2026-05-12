# Tasks: feat-phase1-auth-pool

## Task Breakdown

### 1. 数据模型

- [x] 设计 Prisma schema (VirtualKey, AuditLog)
- [x] 创建数据库迁移

### 2. Virtual Key 管理

- [x] 实现创建 Virtual Key (生成 + SHA-256 hash 存储)
- [x] 实现 VK 前缀生成 (aihub-{name}-{random})
- [x] 实现列出 / 更新 / 撤销 Virtual Key
- [x] 实现 cursor-based 分页

### 3. VK 验证

- [x] 实现 validateVirtualKey() (hash 比对 + Scope 检查 + Budget 检查)
- [x] 集成 usage-metering getUsageSummary() 做 Budget 检查 (stub — 等待 feat-phase1-usage-metering)
- [ ] 实现 RPM/TPM rate limit (Redis 计数器) (推迟到 Phase 2)

### 4. 审计

- [x] 实现 Key 操作审计日志 (AuditLog)

### 5. 测试

- [x] 单元测试 (hash, validateVirtualKey, generateVirtualKey, extractKeyPrefix)
- [ ] 集成测试 (推迟到 Phase 2，需要 Redis)

### 6. Admin API Key 认证

- [x] 实现 Admin API Key 认证中间件

## Progress Log

| Date       | Progress         | Notes                                       |
| ---------- | ---------------- | ------------------------------------------- |
| 2026-05-08 | Feature 创建     | 等待 feat-phase1-model-registry 完成        |
| 2026-05-12 | Spec 更新        | 简化为 Virtual Key 层，Key 池化交给 new-api |
| 2026-05-12 | 全部核心实现完成 | CRUD + 验证 + 审计 + Admin Auth + 单元测试  |
