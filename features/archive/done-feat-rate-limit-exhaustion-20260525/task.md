# Tasks: feat-rate-limit-exhaustion

## Task Breakdown

### 1. monitor/health.go — 新增 MarkChannelRateLimitExhausted
- [x] 添加 `MarkChannelRateLimitExhausted(channelId int, reason string, ttl time.Duration)` 函数
- [x] 复用 `MarkChannelQuotaExhausted` 的 Redis marker + Unhealthy 逻辑
- [x] 对已是 Unhealthy 的渠道做幂等处理，避免重复日志

### 2. controller/relay.go — 修改 processChannelRelayError
- [x] 新增 `isQuotaExhaustedRateLimit(err *model.Error) bool` 判断函数
- [x] 新增 `parseRateLimitExhaustion(err *model.Error) (string, time.Duration)` 解析函数
- [x] 修改 429 分支：配额耗尽型调用 MarkChannelRateLimitExhausted，普通型保留 MarkChannelDegraded
- [x] 对已是 Unhealthy 的渠道跳过重复处理（在 MarkChannelRateLimitExhausted 中实现）

### 3. 测试验证
- [x] go vet 通过
- [ ] 模拟 GLM 429 场景验证 Unhealthy 标记
- [ ] 验证路由跳过 Unhealthy 渠道
- [ ] 验证 TTL 到期后自动恢复

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-25 | 创建 feature | 分析问题根因，制定技术方案 |
| 2026-05-25 | 完成代码实现 | health.go + relay.go, go vet 通过 |
