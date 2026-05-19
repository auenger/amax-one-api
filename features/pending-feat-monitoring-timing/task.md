# Tasks: feat-monitoring-timing

## Task Breakdown

### 1. Backend: 并发延迟递减
- [x] 修改 `monitor/concurrency.go` DecrConcurrency 为异步延迟 1 分钟执行
- [x] 确认 relay.go / anthropic_relay.go 的 defer 调用不受影响（不阻塞响应）

### 2. Backend: 配额刷新加速
- [x] 修改 `monitor/quota-refresh.go` defaultQuotaRefreshInterval 30→10
- [x] 修改 `model/quota.go` QuotaCacheTTL 1800→600

### 3. Frontend: 轮询加速
- [x] 修改 `useConcurrencyData.js` DEFAULT_REFRESH_INTERVAL 30000→15000

### 4. 验证
- [x] rebuild 并测试并发计数非零
- [x] 确认配额刷新日志间隔正确

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-20 | All tasks completed | rebuild.sh 成功，Go 测试通过 |
