# Feature: feat-mcp-upstream-proxy 上游 MCP 代理中转

## Merge Record
- **Completed**: 2026-06-01
- **Merged Branch**: feature/mcp-upstream-proxy
- **Merge Commit**: c6d0fc6
- **Archive Tag**: feat-mcp-upstream-proxy-20260601
- **Conflicts**: none
- **Verification**: passed (all 4 Gherkin scenarios validated, go vet clean)
- **Stats**: 3 commits, 9 files changed, ~1100 lines added

## Basic Information
- **ID**: feat-mcp-upstream-proxy
- **Name**: 上游 MCP 代理中转
- **Priority**: 75
- **Size**: S
- **Dependencies**: feat-mcp-server
- **Parent**: feat-mcp-proxy
- **Children**: []
- **Created**: 2026-05-27

## Description

实现 AIHub 作为 MCP Client 连接到上游 MCP 服务（如 GLM），透明转发工具调用。这是 MCP 代理平台的核心中转层。

### 核心能力
1. 上游 MCP 服务器连接管理（SSE/Streamable HTTP Client）
2. 工具发现与同步（从上游 tools/list 拉取并缓存）
3. 工具调用代理转发（tools/call → 上游 → 客户端）
4. 流式响应处理（上游 SSE → 下游 SSE/HTTP）
5. 命名空间隔离（工具名前缀：`glm_`、`providerx_`）

### 技术方案

#### MCP Client 实现
```go
type MCPUpstreamClient struct {
    ProviderID   uint
    ProviderName string
    BaseURL      string
    AuthToken    string
    Transport    string  // "sse" | "streamable-http"
    Tools        []MCPTool  // 缓存的工具列表
    ToolPrefix   string     // "glm"
    LastSync     time.Time
}
```

#### 数据模型
```go
type MCPProvider struct {
    ID          uint   `gorm:"primaryKey"`
    Name        string `gorm:"uniqueIndex;size:128"`  // glm
    DisplayName string `gorm:"size:256"`               // 智谱 GLM
    BaseURL     string `gorm:"size:512"`               // 上游 MCP Server URL
    AuthToken   string `gorm:"size:512"`               // 上游认证凭据
    Transport   string `gorm:"size:32"`                // sse / streamable-http
    ToolPrefix  string `gorm:"size:64"`                // glm
    Enabled     bool   `gorm:"default:true"`
    AutoSync    bool   `gorm:"default:true"`           // 自动同步工具列表
    Group       string `gorm:"size:256"`               // 可访问的用户组
    LastSyncAt  int64
    CreatedAt   int64
    UpdatedAt   int64
}
```

#### 工具同步流程
1. 定时或手动触发 `tools/list` 请求到上游
2. 为每个工具添加前缀（如 `web_search` → `glm_web_search`）
3. 存入 MCPTool 表，关联 ProviderID
4. AIHub MCP Server 暴露聚合后的工具列表

#### 工具调用流程
1. 客户端调用 `glm_web_search`
2. AIHub 解析前缀 → 路由到 GLM MCP Client
3. Client 去掉前缀 → 发送 `tools/call web_search` 到上游
4. 上游返回结果 → Client 转回 AIHub → 返回客户端

### 文件结构
```
one-api/
├── mcp/
│   ├── upstream_client.go    — MCP Client（连接上游）
│   ├── upstream_sse.go       — SSE Client 传输
│   ├── upstream_http.go      — Streamable HTTP Client 传输
│   ├── router.go             — 工具调用路由（prefix → provider）
│   └── sync.go               — 工具列表同步
├── model/
│   ├── mcp_provider.go       — MCPProvider 模型 + CRUD
│   └── mcp_tool.go           — 新增 ProviderID 关联
└── controller/
    └── mcp.go                — MCP 管理 API（provider CRUD + sync trigger）
```

## User Value Points

### VP1: 上游 MCP 工具透明代理
配置上游 MCP 供应商后，AIHub 自动同步工具列表，客户端可通过 AIHub 直接使用上游工具。

## Context Analysis

### Reference Code
- `one-api/relay/adaptor/proxy/` — 透明代理模式参考
- `one-api/relay/adaptor/zhipu/` — GLM 适配器（了解 GLM API 格式）
- `one-api/model/channel.go` — Channel 模型（Provider 模型参考）

### Related Features
- [[feat-mcp-proxy]] — 父功能
- [[feat-mcp-server]] — 前置依赖（MCP Server 端点）
- [[feat-glm-coding-plan]] — GLM Coding Plan 渠道

## Technical Solution

### 实现步骤
1. MCPProvider 数据模型 + CRUD API
2. MCPUpstreamClient（SSE/HTTP Client）
3. 工具同步逻辑（定时 + 手动触发）
4. 工具调用路由（prefix → provider）
5. tools/call 代理转发实现
6. 错误处理和重连机制

## Acceptance Criteria (Gherkin)

### User Story
作为 AIHub 管理员，我希望添加 GLM MCP 供应商后，团队成员可以通过 AIHub 直接使用 GLM 的图片识别和搜索工具。

### Scenarios

#### Scenario 1: 添加 MCP 供应商
```gherkin
Given 管理员配置 GLM MCP 供应商（URL、Token、Transport）
When 保存供应商配置
Then AIHub 尝试连接上游 MCP Server
And 连接成功后自动同步工具列表（如 image_analysis、web_search）
And 工具以 glm_ 前缀注册到 MCPTool 表
```

#### Scenario 2: 代理工具调用
```gherkin
Given GLM 供应商已配置且工具已同步
And MCP 客户端已连接 AIHub
When 客户端调用 glm_web_search 工具（参数：query="AIHub"）
Then AIHub 路由到 GLM Client
And GLM Client 转发 tools/call web_search 到上游
And 返回搜索结果给客户端
```

#### Scenario 3: 上游不可用
```gherkin
Given GLM 上游 MCP Server 不可达
When 客户端调用 glm_ 开头的工具
Then 返回工具调用失败错误
And 错误信息包含上游不可用提示
```

#### Scenario 4: 工具列表同步
```gherkin
Given 已配置自动同步（间隔 5 分钟）
When 同步触发时
Then AIHub 向上游发送 tools/list
And 更新本地工具缓存
And 新增工具自动可用，移除的工具标记为禁用
```

### General Checklist
- [x] MCPProvider 模型和迁移
- [x] MCP Client 连接管理
- [x] 工具同步（定时 + 手动）
- [x] 工具调用路由和转发
- [x] 命名空间前缀处理
- [x] 错误处理和上游重连
- [x] Provider CRUD API

## Post-Merge Fixes (2026-06-01)

### GLM MCP 兼容性修复

测试 GLM 的三个远程 MCP 服务（联网搜索 `web_search_prime`、网页读取 `web_reader`、开源仓库 `zread`）时发现多个兼容性问题，全部修复。

#### 问题 1: 缺少 Accept 头导致 406 错误

GLM MCP 服务器（基于 Spring WebFlux）强制要求请求头包含 `Accept: application/json, text/event-stream`。

**修复**: `upstream_http.go` — 发送请求时添加 `Accept` 头
```go
httpReq.Header.Set("Accept", "application/json, text/event-stream")
```

#### 问题 2: SSE 响应格式解析失败

GLM 返回 SSE 格式响应（`id:1\nevent:message\ndata:{json}`），而非纯 JSON。原代码直接 `json.Unmarshal` 导致解析失败（empty body）。

**修复**: `upstream_http.go` — 新增 `extractJSONFromResponse()` 和 `extractSSEData()` 函数
- 检测响应是否为 SSE 格式（包含 `data:` 行）
- 从 `data:` 行中提取 JSON 内容后再解析

#### 问题 3: 缺少 MCP Session ID 管理

GLM 在 initialize 响应头返回 `Mcp-Session-Id`，后续请求必须携带此头。原代码未捕获和传递 session ID，导致上游拒绝请求。

**修复**: `upstream_client.go` + `upstream_http.go` + `upstream_sse.go`
- `UpstreamClient` 新增 `sessionID string` 字段
- `sendStreamableHTTP()` / `sendSSE()` 参数新增 `sessionID`
- 从 HTTP 响应头 `Mcp-Session-Id` 捕获 session ID
- 后续请求自动携带 `Mcp-Session-Id` 请求头

#### 问题 4: 缺少 notifications/initialized

MCP 协议规定 initialize 后必须发送 `notifications/initialized` 通知。缺失导致部分服务器不响应后续请求。

**修复**: `upstream_client.go` — `Connect()` 中新增 `sendInitialized()` 调用

#### 问题 5: 请求缺少 ID 导致 nil pointer panic

JSON-RPC 2.0 规定：无 `id` 的请求为 notification（不期望响应）。`initialize`、`tools/list`、`tools/call` 都未设置 ID，被 `sendStreamableHTTP` 当作 notification 返回 `(nil, nil)`，导致 `resp.Error` nil pointer panic。

**修复**: 所有内部上游请求添加 `ID: json.RawMessage("1")`

#### 问题 6: SyncTools 未连接时直接发请求

`SyncTools` 未检查连接状态，在 client 未连接时直接发送 `tools/list` 导致失败。

**修复**: `sync.go` — 开头增加连接检查和自动重连
```go
if !c.IsConnected() {
    if err := c.Connect(ctx); err != nil {
        return fmt.Errorf("reconnect failed: %w", err)
    }
}
```

#### 问题 7: sync 端点 client 为空时直接报错

`/api/mcp-provider/:id/sync` 找不到 client 时直接返回错误，不尝试从 DB 加载。

**修复**: `controller/mcp.go` — client 为空时从 DB 加载 provider 并注册新 client

### GLM MCP 端点配置参考

| 服务 | base_url | transport |
|---|---|---|
| 联网搜索 | `https://open.bigmodel.cn/api/mcp/web_search_prime/mcp` | streamable-http |
| 网页读取 | `https://open.bigmodel.cn/api/mcp/web_reader/mcp` | streamable-http |
| 开源仓库 | `https://open.bigmodel.cn/api/mcp/zread/mcp` | streamable-http |
| 视觉理解 | stdio (`npx @z_ai/mcp-server`) | 不支持（需要本地 Node.js） |
