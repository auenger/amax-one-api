# Tasks: feat-mcp-management
## Task Breakdown

### 1. API 完善
- [ ] Provider CRUD API 完善（controller/mcp.go）
- [ ] 连接测试 API（/api/mcp/provider/:id/test）
- [ ] 工具启用/禁用 API
- [ ] MCP 使用量统计 API

### 2. MCPLog 日志模型
- [ ] 创建 `one-api/model/mcp_log.go` — MCP 调用日志
- [ ] 数据库迁移注册

### 3. 前端 — 菜单和路由
- [ ] 侧边栏添加 MCP 菜单项
- [ ] 注册 MCP 页面路由

### 4. 前端 — 供应商管理
- [ ] MCPProviders.js — 供应商列表页
- [ ] MCPProviderDetail.js — 供应商详情（工具列表、连接测试）

### 5. 前端 — 使用量统计
- [ ] MCPStats.js — 使用量统计面板
- [ ] 按供应商/工具/时间的调用趋势

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-27 | Feature created | 第三步：管理界面 |
