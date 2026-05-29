# Feature: feat-mcp-proxy MCP 代理平台

## Basic Information
- **ID**: feat-mcp-proxy
- **Name**: MCP 代理平台
- **Priority**: 75
- **Size**: L
- **Dependencies**: feat-glm-coding-plan
- **Parent**: null
- **Children**: [feat-mcp-server, feat-mcp-upstream-proxy, feat-mcp-management]
- **Created**: 2026-05-27

## Description

AIHub 实现 MCP (Model Context Protocol) 代理平台能力：AIHub 作为 MCP Server 对外暴露工具给外部客户端（Claude Code、Cursor 等），内部代理转发到 GLM 等上游 MCP 服务。设计上支持多供应商扩展，GLM 是第一个接入的供应商。

### 背景
- MCP 是 AI 客户端与工具服务之间的标准协议（JSON-RPC over SSE/Streamable HTTP）
- GLM Coding Plan 提供 MCP 服务（图片识别、网络搜索等），通过 HTTP/SSE 传输
- 团队成员通过 AIHub 统一代理 LLM 请求，也希望统一代理 MCP 工具调用
- 需要支持多供应商扩展，未来接入 OpenAI、Anthropic 等 MCP 服务

### 架构
```
Claude Code / Cursor / Any MCP Client
        │
        │  MCP Protocol (SSE / Streamable HTTP)
        │  Auth: Bearer <aihub-token>
        ▼
┌─────────────────────────────────┐
│        AIHub MCP Server         │
│  ┌───────────┐ ┌─────────────┐  │
│  │ MCP Proto │ │ Auth &      │  │
│  │ Handler   │ │ Quota Check │  │
│  └─────┬─────┘ └──────┬──────┘  │
│  ┌─────▼──────────────▼──────┐  │
│  │   MCP Upstream Router     │  │
│  │  (tool → provider mapping)│  │
│  └─────┬────────────┬───────┘  │
│  ┌─────▼─────┐ ┌────▼──────┐  │
│  │ GLM MCP   │ │ Provider X│  │
│  │ Client    │ │ Client    │  │
│  └─────┬─────┘ └────┬──────┘  │
└────────┼────────────┼──────────┘
         ▼            ▼
  GLM MCP Server   Future Providers
```

### 关键设计点
1. **认证**: 客户端用 AIHub Token 连接 MCP 端点，AIHub 用配置的上游凭据连接上游 MCP
2. **工具命名空间**: `glm_image_analysis`、`glm_web_search`，避免多供应商工具冲突
3. **配置存储**: 新增 `MCPProvider` 数据模型，复用 Channel 管理思路
4. **传输层**: 优先支持 Streamable HTTP（MCP 新标准），兼容 SSE

## User Value Points

### VP1: MCP Server 协议端点（feat-mcp-server）
AIHub 实现 MCP 协议端点，外部客户端可以将 AIHub 配置为 MCP Server。支持 initialize、tools/list、tools/call 等核心方法，通过 Streamable HTTP 和 SSE 传输。

### VP2: 上游 MCP 代理中转（feat-mcp-upstream-proxy）
AIHub 作为 MCP Client 连接到上游 MCP 服务（如 GLM），透明转发工具调用。支持 SSE/Streamable HTTP 传输，缓存工具列表，处理流式响应。

### VP3: MCP 供应商管理（feat-mcp-management）
管理员可在后台配置多个上游 MCP 供应商，控制工具可见性，查看使用量统计。

## Context Analysis

### Reference Code
- `one-api/relay/adaptor/` — 38 个供应商适配器，了解 adaptor 接口模式
- `one-api/relay/adaptor/zhipu/` — 智谱 GLM 适配器
- `one-api/relay/adaptor/proxy/` — 透明代理适配器（最接近 MCP 代理模式）
- `one-api/middleware/auth.go` — Token 认证中间件
- `one-api/router/relay.go` — 路由注册模式
- `one-api/model/channel.go` — Channel 数据模型参考

### Related Documents
- MCP Protocol Spec: https://spec.modelcontextprotocol.io/
- GLM MCP Documentation: 智谱 BigModel 开放平台

### Related Features
- [[feat-glm-coding-plan]] — GLM Coding Plan 渠道支持（LLM 代理层面）

## Technical Solution
<!-- To be filled during implementation -->

## Acceptance Criteria (Gherkin)

### User Story
作为 AIHub 管理员，我希望配置 MCP 供应商后，团队成员可以在 Claude Code 等客户端中使用 AIHub 作为 MCP Server，统一访问各供应商的 MCP 工具（如 GLM 的图片识别、网络搜索），无需各自配置上游凭据。

### Scenarios (Given/When/Then)

#### Scenario 1: MCP 客户端连接 AIHub
```gherkin
Given AIHub MCP Server 已启动
And 用户已配置 AIHub Token
When 用户在 Claude Code 中配置 AIHub 为 MCP Server
Then Claude Code 能成功完成 MCP initialize 握手
And 能获取到已配置供应商的工具列表
```

#### Scenario 2: 通过 AIHub 调用 GLM MCP 工具
```gherkin
Given 已配置 GLM 为上游 MCP 供应商
And GLM 供应商已启用且有可用工具
When 客户端发送 tools/call 请求（如 glm_web_search）
Then AIHub 将请求代理到 GLM MCP Server
And 返回工具执行结果给客户端
And 记录用量日志
```

#### Scenario 3: 管理员配置 MCP 供应商
```gherkin
Given 管理员已登录 AIHub Admin
When 管理员添加新的 MCP 供应商（URL、认证信息、工具过滤）
Then 供应商连接测试通过后自动同步可用工具列表
And 指定用户组可使用该供应商的工具
```

#### Scenario 4: 多供应商工具隔离
```gherkin
Given 已配置 GLM 和 Provider X 两个 MCP 供应商
And 两者都有 image_analysis 工具
When 客户端请求 tools/list
Then 工具列表中显示 glm_image_analysis 和 providerx_image_analysis
And 调用 glm_image_analysis 时路由到 GLM
```

#### Scenario 5: 认证失败
```gherkin
Given AIHub MCP Server 已启动
When 客户端使用无效 Token 连接
Then 返回认证错误
And 拒绝所有 MCP 请求
```

### UI/Interaction Checkpoints
- MCP 供应商管理页面（添加/编辑/删除/测试连接）
- MCP 工具列表查看（同步状态、启用/禁用）
- MCP 使用统计面板（调用次数、成功率、延迟）

### General Checklist
- [ ] MCP 协议兼容性测试（SSE + Streamable HTTP）
- [ ] 上游 MCP 连接稳定性（重连、超时）
- [ ] 工具缓存一致性（上游工具变更时同步）
- [ ] 并发工具调用支持
- [ ] 错误透传和友好提示
