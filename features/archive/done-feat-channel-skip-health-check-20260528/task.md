# Tasks: feat-channel-skip-health-check

## Task Breakdown

### 1. 后端：Channel 模型
- [x] 在 `model/channel.go` 的 Channel struct 中新增 `SkipHealthCheck bool` 字段（gorm default:false）
- [x] 确认 GORM AutoMigrate 自动处理新字段

### 2. 后端：健康检查逻辑
- [x] 在 `monitor/health.go` 的 `checkChannelHealth()` 函数中，增加 `SkipHealthCheck` 判断
- [x] 实现 TCP 连通性检测函数 `probeChannelTCP(baseURL string) (bool, int)`
- [x] 跳过 quota window 检查，仅做 TCP 检测

### 3. 前端：渠道编辑弹窗
- [x] 在 `EditModal.js` 高级设置区域增加 Switch 控件
- [x] 绑定 skip_health_check 字段到表单状态
- [x] 添加说明文字

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-28 | 3/3 tasks done | model/channel.go + monitor/health.go + EditModal.js |
