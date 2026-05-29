# Tasks: feat-health-status-ui

## Task Breakdown

### 1. 后端恢复阈值优化
- [x] `one-api/monitor/quota-refresh.go`: `defaultQuotaRecoveryThreshold` 从 95.0 改为 100.0

### 2. 后端 API 暴露健康状态
- [x] `one-api/controller/channel.go`: 渠道列表 API 返回中附加 `health_status` 字段
- [x] `one-api/controller/model.go`: `GetModelChannels` 的 `ChannelInfo` 增加 `HealthStatus` 字段

### 3. 前端渠道列表健康状态列
- [x] `one-api/web/berry/src/views/Channel/component/TableHead.js`: 增加健康状态列表头
- [x] `one-api/web/berry/src/views/Channel/component/TableRow.js`: 增加健康状态 Label + Tooltip

### 4. 前端模型广场健康状态展示
- [x] `one-api/web/berry/src/views/ModelMarket/index.js`: 渠道卡片增加健康状态指示

### 5. 构建验证
- [ ] `cd one-api && ./rebuild.sh` 验证前后端构建通过
- [ ] 启动服务验证页面显示

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-28 | Feature created | 需求文档完成，等待开发 |
| 2026-05-28 | Tasks 1-4 implemented | 后端阈值优化 + API 暴露 + 前端展示 |
