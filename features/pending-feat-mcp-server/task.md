# Tasks: feat-mcp-server
## Task Breakdown

### 1. MCP 路由注册
- [ ] 创建 `one-api/router/mcp.go`，注册 MCP 路由组
- [ ] 路由：POST /mcp/v1/message、GET /mcp/v1/sse、POST /mcp/v1/sse

### 2. MCP 协议处理器
- [ ] 创建 `one-api/mcp/server.go` — JSON-RPC 2.0 消息解析与分发
- [ ] 创建 `one-api/mcp/handler.go` — initialize、ping、tools/list、tools/call 方法处理

### 3. 传输层实现
- [ ] 创建 `one-api/mcp/transport_http.go` — Streamable HTTP 传输
- [ ] 创建 `one-api/mcp/transport_sse.go` — SSE 传输（长连接管理）

### 4. 数据模型
- [ ] 创建 `one-api/model/mcp_tool.go` — MCPTool 模型 + CRUD

### 5. 认证集成
- [ ] MCP 路由集成 TokenAuth 中间件
- [ ] MCP 会话与 AIHub Token 绑定

### 6. 前端（占位）
- [ ] MCP 设置页面入口（基本布局）

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-27 | Feature created | 第一步：协议端点 |
