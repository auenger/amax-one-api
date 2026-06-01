# Feature: feat-mcp-server MCP Server 协议端点

## Basic Information
- **ID**: feat-mcp-server
- **Name**: MCP Server 协议端点
- **Priority**: 75
- **Size**: S
- **Dependencies**: none
- **Parent**: feat-mcp-proxy
- **Children**: []
- **Created**: 2026-05-27

## Merge Record
- **Completed**: 2026-06-01
- **Merged Branch**: feature/mcp-server
- **Merge Commit**: b56a1aa
- **Archive Tag**: feat-mcp-server-20260601
- **Conflicts**: none
- **Verification**: passed (4/4 scenarios)
- **Stats**: 11 files changed, 758 insertions, 1 commit
## Description

实现 AIHub 的 MCP Server 协议端点，使外部 MCP 客户端（Claude Code、Cursor 等）可以将 AIHub 配置为 MCP Server。支持 MCP 协议核心方法（initialize、tools/list、tools/call），通过 Streamable HTTP 和 SSE 传输。

这是 MCP 代理平台的第一步，建立协议层和认证机制。

### 核心能力
1. MCP 协议握手（initialize/ping）
2. 工具列表查询（tools/list）— 返回静态/缓存工具列表
3. 工具调用执行（tools/call）— 框架子，后续子功能填充
4. Token 认证集成
5. SSE + Streamable HTTP 双传输支持

### 技术方案

#### 路由设计
```
POST /mcp/v1/message    — Streamable HTTP 入口
GET  /mcp/v1/sse        — SSE 连接端点
POST /mcp/v1/sse        — SSE 消息发送
```

#### MCP 协议实现
- JSON-RPC 2.0 消息解析和响应
- SSE 事件流管理（text/event-stream）
- Streamable HTTP（单 POST 请求/响应）
- 会话管理（MCP session ID）

#### 数据模型
```go
type MCPTool struct {
    ID          uint   `gorm:"primaryKey"`
    Name        string `gorm:"uniqueIndex;size:128"`  // glm_web_search
    DisplayName string `gorm:"size:256"`               // GLM 网络搜索
    ProviderID  uint   `gorm:"index"`                  // 关联 MCPProvider
    Description string `gorm:"type:text"`
    InputSchema string `gorm:"type:text"`              // JSON Schema
    Enabled     bool   `gorm:"default:true"`
    CreatedAt   int64
    UpdatedAt   int64
}
```

#### 认证
- 复用现有 TokenAuth 逻辑
- MCP 客户端连接时在 Authorization header 或自定义 header 传入 AIHub Token
- 校验通过后建立 MCP 会话

## User Value Points

### VP1: MCP Server 端点可用
用户可以将 AIHub 配置为 Claude Code / Cursor 的 MCP Server，完成协议握手，获取工具列表。

## Context Analysis

### Reference Code
- `one-api/router/relay.go` — 路由注册模式
- `one-api/middleware/auth.go` — Token 认证
- `one-api/model/channel.go` — 数据模型参考

### Related Features
- [[feat-mcp-proxy]] — 父功能
- [[feat-glm-coding-plan]] — GLM Coding Plan 渠道支持

## Technical Solution

### 实现步骤
1. 新增 MCP 路由组 (`one-api/router/mcp.go`)
2. 实现 MCP 协议处理器 (`one-api/mcp/`)
3. 新增 MCPTool 数据模型 (`one-api/model/mcp_tool.go`)
4. 集成 Token 认证
5. SSE / Streamable HTTP 传输实现
6. 前端：MCP 设置页面入口（占位）

### 文件结构
```
one-api/
├── mcp/
│   ├── server.go          — MCP Server 核心（JSON-RPC 处理）
│   ├── transport_sse.go   — SSE 传输实现
│   ├── transport_http.go  — Streamable HTTP 传输
│   └── handler.go         — MCP 方法路由（initialize/tools/list/tools/call）
├── model/
│   └── mcp_tool.go        — MCPTool 数据模型
└── router/
    └── mcp.go             — MCP 路由注册
```

## Acceptance Criteria (Gherkin)

### User Story
作为 AIHub 用户，我希望将 AIHub 配置为 MCP Server，使我的 AI 客户端能通过标准 MCP 协议获取工具列表。

### Scenarios

#### Scenario 1: MCP 握手
```gherkin
Given AIHub 服务运行中
When MCP 客户端发送 initialize 请求到 /mcp/v1/message
Then 返回正确的 initialize 响应（protocolVersion、capabilities、serverInfo）
And 返回 MCP session ID
```

#### Scenario 2: 工具列表
```gherkin
Given MCP 会话已建立
When 客户端发送 tools/list 请求
Then 返回已注册的工具列表（初始阶段可能为空）
And 每个工具包含 name、description、inputSchema
```

#### Scenario 3: 认证保护
```gherkin
Given AIHub MCP 端点需要认证
When 客户端未提供 Token 或 Token 无效
Then 返回 401 错误
And 拒绝所有 MCP 请求
```

#### Scenario 4: SSE 连接
```gherkin
Given MCP 客户端支持 SSE 传输
When 客户端连接 /mcp/v1/sse
Then 建立 SSE 事件流
And 能接收服务端推送事件
```

### General Checklist
- [x] MCP 协议核心方法实现
- [x] SSE 传输支持
- [x] Streamable HTTP 传输支持
- [x] Token 认证集成
- [x] MCPTool 数据模型和迁移
- [x] 前端 MCP 设置入口页

## Post-Merge Fixes (2026-06-01)

### GLM 兼容性修复

**JSONRPCResponse 新增 SessionID 字段** (`server.go`)
- 新增 `SessionID string \`json:"-"\`` 字段，由 transport 层设置，不序列化到 JSON
- 用于存储上游 MCP 服务器返回的 `Mcp-Session-Id` 响应头

**前端 IconSync → IconRefresh** (`Providers.js`, `ProviderDetail.js`)
- `@tabler/icons-react` 不导出 `IconSync`，替换为项目中已有的 `IconRefresh`
