# Tasks: feat-mcp-upstream-proxy
## Task Breakdown

### 1. MCPProvider 数据模型
- [ ] 创建 `one-api/model/mcp_provider.go` — MCPProvider 模型
- [ ] 数据库迁移注册

### 2. MCP Client 实现
- [ ] 创建 `one-api/mcp/upstream_client.go` — 上游 MCP Client 核心逻辑
- [ ] 创建 `one-api/mcp/upstream_sse.go` — SSE Client 传输
- [ ] 创建 `one-api/mcp/upstream_http.go` — Streamable HTTP Client 传输

### 3. 工具同步
- [ ] 创建 `one-api/mcp/sync.go` — 工具列表同步逻辑
- [ ] 定时同步任务注册
- [ ] 手动同步 API

### 4. 工具调用路由
- [ ] 创建 `one-api/mcp/router.go` — prefix → provider 路由
- [ ] tools/call 代理转发实现
- [ ] 命名空间前缀处理（添加/去除）

### 5. Provider CRUD API
- [ ] 创建 `one-api/controller/mcp.go` — Provider 管理 API
- [ ] 路由注册

### 6. 错误处理
- [ ] 上游不可用时的错误响应
- [ ] 连接超时和重连机制

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-27 | Feature created | 第二步：上游代理中转 |
