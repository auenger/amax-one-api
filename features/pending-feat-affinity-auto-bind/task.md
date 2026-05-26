# Tasks: feat-affinity-auto-bind

## Task Breakdown

### 1. 调试探针
- [ ] 在 relay.go 增强 debug 日志，记录所有 headers 和 body 关键字段
- [ ] 部署到线上，收集 Claude Code 请求样本
- [ ] 分析样本，确认可用的会话标识符

### 2. Fallback 亲和实现
- [ ] 在 affinity.go 添加 fallback key 生成逻辑 (token+model)
- [ ] 添加 fallback Redis key prefix `affinity:fallback:`
- [ ] 添加 fallback TTL 配置 (`AFFINITY_FALLBACK_TTL_SECONDS`, 默认 1800s)
- [ ] 修改 ExtractConversationId 或新增 fallback 逻辑
- [ ] 确保健康检查和渠道可用性验证覆盖 fallback affinity

### 3. 测试
- [ ] 单元测试：fallback key 生成
- [ ] 单元测试：fallback 亲和绑定和解绑
- [ ] 单元测试：fallback 与显式亲和优先级
- [ ] 手动测试：模拟 Claude Code 请求验证渠道绑定

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-26 | Feature created | 线上日志分析确认问题 |
