# Tasks: feat-mcp-server
## Task Breakdown

### 1. MCP 路由注册
- [x] 创建 `one-api/router/mcp.go`，注册 MCP 路由组
- [x] 路由：POST /mcp/v1/message、GET /mcp/v1/sse、POST /mcp/v1/sse

### 2. MCP 协议处理器
- [x] 创建 `one-api/mcp/server.go` — JSON-RPC 2.0 消息解析与分发
- [x] 创建 `one-api/mcp/handler.go` — initialize、ping、tools/list、tools/call 方法处理

### 3. 传输层实现
- [x] 创建 `one-api/mcp/transport_http.go` — Streamable HTTP 传输
- [x] 创建 `one-api/mcp/transport_sse.go` — SSE 传输（长连接管理）

### 4. 数据模型
- [x] 创建 `one-api/model/mcp_tool.go` — MCPTool 模型 + CRUD
- [x] 注册 AutoMigrate 到 `model/main.go`

### 5. 认证集成
- [x] MCP 路由集成 TokenAuth 中间件（router/mcp.go 中间件链）
- [x] MCP 会话与 AIHub Token 绑定（session 绑定 tokenID/userID）

### 6. 前端（占位）
- [x] MCP 设置页面入口（views/MCPSetting/index.js）
- [x] 菜单项 + 路由注册

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-27 | Feature created | 第一步：协议端点 |
| 2026-06-01 | All tasks implemented | go vet 通过，model 测试通过 |
