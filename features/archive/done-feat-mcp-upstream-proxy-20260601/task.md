# Tasks: feat-mcp-upstream-proxy
## Task Breakdown

### 1. MCPProvider 数据模型
- [x] 创建 `one-api/model/mcp_provider.go` — MCPProvider 模型
- [x] 数据库迁移注册（model/main.go）

### 2. MCP Client 实现
- [x] 创建 `one-api/mcp/upstream_client.go` — 上游 MCP Client 核心逻辑
- [x] 创建 `one-api/mcp/upstream_sse.go` — SSE Client 传输
- [x] 创建 `one-api/mcp/upstream_http.go` — Streamable HTTP Client 传输

### 3. 工具同步
- [x] 创建 `one-api/mcp/sync.go` — 工具列表同步逻辑
- [x] 定时同步任务注册（StartSyncScheduler）
- [x] 手动同步 API（SyncMCPProvider controller）

### 4. 工具调用路由
- [x] 更新 `one-api/mcp/handler.go` — handleToolsCall 替换 stub 为实际路由
- [x] tools/call 代理转发实现（prefix → provider → upstream）
- [x] 命名空间前缀处理（ResolveProvider + prefix stripping）

### 5. Provider CRUD API
- [x] 创建 `one-api/controller/mcp.go` — Provider 管理 API
- [x] 路由注册（router/api.go — /api/mcp-provider/*）

### 6. 错误处理
- [x] 上游不可用时的错误响应（JSONRPCError -32603 + upstream unavailable message）
- [x] 连接超时和重连机制（CallTool 失败标记 disconnected，handleToolsCall 自动重连）

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-27 | Feature created | 第二步：上游代理中转 |
| 2026-06-01 | All tasks implemented | go vet 通过，model 测试通过 |
