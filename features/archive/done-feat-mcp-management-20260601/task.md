# Tasks: feat-mcp-management
## Task Breakdown

### 1. API 完善
- [x] Provider CRUD API 完善（controller/mcp.go）— 已有 CRUD，新增 test/tools/stats 端点
- [x] 连接测试 API（/api/mcp-provider/:id/test）— TestMCPProvider controller
- [x] 工具启用/禁用 API — UpdateMCPToolStatus controller + PUT /api/mcp-tool/:id
- [x] MCP 使用量统计 API — GetMCPStats controller + GET /api/mcp-stats/

### 2. MCPLog 日志模型
- [x] 创建 `one-api/model/mcp_log.go` — MCPLog 模型 + CRUD + 聚合统计查询
- [x] 数据库迁移注册 — model/main.go migrateDB() 添加 AutoMigrate(&MCPLog{})
- [x] 工具调用日志记录 — mcp/handler.go handleToolsCall 中集成日志写入

### 3. 前端 — 菜单和路由
- [x] 侧边栏添加 MCP 菜单项 — panel.js 改为 collapse 类型，含供应商/统计/配置子项
- [x] 注册 MCP 页面路由 — MainRoutes.js 新增 /mcp/providers, /mcp/providers/:id, /mcp/stats

### 4. 前端 — 供应商管理
- [x] MCPProviders.js — 供应商列表页（CRUD + 测试连接 + 同步工具 + 启用/禁用）
- [x] MCPProviderDetail.js — 供应商详情（工具列表 + 连接测试 + 工具启用/禁用）

### 5. 前端 — 使用量统计
- [x] MCPStats.js — 使用量统计面板（按供应商/工具聚合 + 时间范围筛选 + 汇总卡片）
- [x] 按供应商/工具/时间的调用趋势

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-27 | Feature created | 第三步：管理界面 |
| 2026-06-01 | All tasks implemented | 后端 go vet/build 通过，model 测试通过，前端 3 个新页面 |
