# Tasks: feat-affinity-debug-probe

## Task Breakdown

### 1. 增强 Relay debug 日志
- [ ] 在 relay.go Relay() 中添加 headers 日志（遍历 c.Request.Header，Authorization 脱敏）
- [ ] 提取 body 关键字段（user, metadata, conversation_id 等）单独记录
- [ ] 记录 affinity 中间件结果（conversation_id, specific_channel_id）

### 2. Affinity 中间件 debug 日志
- [ ] 在 affinity.go 中添加 debug 日志：输入的 conversation_id 和最终绑定的 channel

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-26 | Feature created | 从 feat-affinity-auto-bind 拆分 |
