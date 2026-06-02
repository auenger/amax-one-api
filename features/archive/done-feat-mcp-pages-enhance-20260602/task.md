# Tasks: feat-mcp-pages-enhance

## Task Breakdown

### 1. 后端：MCP 工具公开 API
- [ ] 在 `router/api.go` 添加 `GET /api/mcp-tool/public/list` 路由（UserAuth）
- [ ] 在 `controller/mcp.go` 添加 `GetPublicMCPTools` handler

### 2. 后端：MCP 调用明细 API
- [ ] `model/mcp_log.go` 新增 UserID, UserName, TokenID 字段
- [ ] `model/mcp_log.go` 新增 `GetMCPLogsWithUser` 分页查询方法
- [ ] `mcp/handler.go` handleToolsCall 补充用户信息到日志
- [ ] 在 `router/api.go` 添加 `GET /api/mcp-stats/logs` 路由（AdminAuth）
- [ ] 在 `controller/mcp.go` 添加 `GetMCPLogDetails` handler

### 3. 后端：Server 配置动态 API
- [ ] 在 `router/api.go` 添加 `GET /api/mcp-provider/server-config` 路由（UserAuth）
- [ ] 在 `controller/mcp.go` 添加 `GetMCPServerConfig` handler，从 Host header 提取地址

### 4. 前端：MCP 工具列表页
- [ ] 新建 `views/MCPSetting/Tools.js` 页面
- [ ] 添加路由 `/panel/mcp/tools`
- [ ] 菜单项增加"工具列表"

### 5. 前端：MCP 调用明细展示
- [ ] 在 `Stats.js` 增加调用明细区域
- [ ] 分页、时间范围过滤、用户名筛选

### 6. 前端：Server 配置页优化
- [ ] 重构 `index.js`，从 API 获取动态 URL
- [ ] 完善 Claude Code 配置说明
- [ ] 菜单权限从 Admin-only 改为所有用户可见

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-06-02 | Feature created | 需求收集和技术方案完成 |
