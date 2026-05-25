# Checklist: feat-model-downgrade-strategy

## Completion Checklist

### Development
- [x] 所有 tasks 完成
- [x] ModelDowngradeRule 数据模型创建
- [x] 降级引擎集成到 quota-refresh 流程
- [x] distributor 层模型替换逻辑
- [x] 管理 API 端点实现
- [x] 前端管理页面实现
- [x] 代码自测通过

### Code Quality
- [x] Go 代码遵循 gofmt 标准
- [x] 前端代码使用 MUI 5 组件
- [x] API 返回 `{ success, message, data }` 标准格式
- [x] Redis key 格式遵循 `channel:downgrade:*` 约定
- [x] 跨数据库兼容（GORM 无原生 SQL）

### Testing
- [x] 降级触发逻辑验证（超阈值 → 替换模型）
- [x] 降级取消逻辑验证（低于阈值 → 恢复原模型）
- [x] 多供应商独立降级验证
- [x] 规则禁用时不触发降级
- [x] 无规则时正常工作

### Documentation
- [x] spec.md 技术方案已填写
- [x] 关键代码有注释说明 WHY

---

## Verification Record

| Date | Status | Scenarios | Notes |
|------|--------|-----------|-------|
| 2026-05-25 | PASSED | 6/6 | All Gherkin scenarios pass, go build/vet pass, all existing tests pass |
