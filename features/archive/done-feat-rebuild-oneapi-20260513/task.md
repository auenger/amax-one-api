# Tasks: feat-rebuild-oneapi

## Task Breakdown

### 1. Fork + 环境搭建
- [x] Fork one-api 到 AIHub 组织或 clone 到项目
- [x] 配置 Go 1.20+ 开发环境
- [x] docker-compose: one-api + PostgreSQL + Redis
- [x] 验证核心 API（Channel CRUD、Token CRUD、代理转发）

### 2. 加权路由 + 优先级降级
- [x] Channel model 加 Weight 字段（已存在）
- [x] 修改 cache.go 选择逻辑（加权随机 - 轮盘赌算法）
- [x] 实现优先级降级重试（已有基础，优化了加权选择）
- [x] 全局 RETRY_TIMES 配置（已有，docker-compose 设置为 3）
- [x] 添加 GetWeight 辅助方法

### 3. Claude 格式转换
- [x] 新增 service/claude_convert.go（Claude↔OpenAI 双向转换）
- [x] ClaudeToOpenAIRequest — Claude Messages → OpenAI Chat Completions
- [x] OpenAIResponseToClaude — OpenAI response → Claude response
- [x] OpenAIStreamChunkToClaudeEvents — OpenAI SSE → Claude SSE
- [x] 处理 tool_call、tool_result、thinking block
- [x] 路由注册 /v1/messages（controller/claude_relay.go）
- [x] 新增 claudeResponseWriter 拦截非流式响应

### 4. Channel 预算限制
- [x] Channel model 加 BudgetLimit、BudgetUsed 字段
- [x] relay 后累加预算检查（集成到 postConsumeQuota）
- [x] 超限自动禁用（IncreaseChannelBudgetUsed + UpdateChannelStatusById）
- [x] Admin 查看/重置 API（controller/channel-budget.go）
- [x] 定时检查任务（CheckBudgetsCron）
- [x] 路由注册 /api/channel/budget/*

### 5. Token 审批流
- [x] 新增 TokenRequest model + migration
- [x] 用户申请 API（POST /api/token_request）
- [x] Admin 审批列表 API（GET /api/token_request）
- [x] 审批通过自动创建 Token（ApproveTokenRequest）
- [x] 拒绝 API（POST /api/token_request/:id/reject）

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-13 | Task 1-5 完成 | 所有任务实现，代码通过 gofmt 语法检查 |
