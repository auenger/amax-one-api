# Feature: feat-mcp-upstream-proxy 上游 MCP 代理中转

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
- [ ] MCPProvider 模型和迁移
- [ ] MCP Client 连接管理
- [ ] 工具同步（定时 + 手动）
- [ ] 工具调用路由和转发
- [ ] 命名空间前缀处理
- [ ] 错误处理和上游重连
- [ ] Provider CRUD API
