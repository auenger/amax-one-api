# Feature: feat-mcp-vision-tool 内置视觉理解 MCP Tool

## Basic Information
- **ID**: feat-mcp-vision-tool
- **Name**: 内置视觉理解 MCP Tool
- **Priority**: 75
- **Size**: M
- **Dependencies**: feat-mcp-server, feat-mcp-upstream-proxy, feat-mcp-management
- **Parent**: feat-mcp-proxy
- **Children**: (none)
- **Created**: 2026-06-01

## Description

在现有 MCP 平台基础上，新增一种"内置 Tool"类型——视觉理解工具。不同于现有的 upstream proxy 模式（转发到外部 MCP 服务），该工具直接利用平台已有的多模态 relay 基础设施（OpenAI GPT-4o、Anthropic Claude、Google Gemini 等适配器均已支持图片输入），在管理界面选择一个渠道+模型，将视觉理解能力作为 MCP tool 暴露给下游客户端。

**痛点**：GLM 的视觉 MCP 需要 spawn 本地 Node.js 进程，通过 stdin/stdout 通信，无法通过现有 MCP upstream proxy 直接转发。

**方案**：不依赖外部视觉 MCP 服务，而是复用 AIHub 自身的 38 个供应商适配器，选择一个支持多模态的渠道+模型，将图片理解能力封装为标准 MCP tool。

## User Value Points

### VP1: 内置视觉理解 MCP Tool
作为 MCP 客户端用户，我可以调用 `vision_analyze` tool，传入图片（URL 或 base64）和提示词，获得基于多模态模型的分析结果。无需客户端自行部署视觉理解服务。

### VP2: 渠道/模型配置管理
作为管理员，我可以在 MCP 管理界面配置视觉理解工具使用的渠道和模型，灵活切换不同供应商的多模态模型，并查看使用统计。

## Context Analysis

### Reference Code
- `one-api/mcp/handler.go` — MCP JSON-RPC handler，`handleToolsCall()` 是 tool 调用入口
- `one-api/mcp/server.go` — MCP server 核心，session 管理
- `one-api/mcp/upstream_client.go` — UpstreamClient 是现有外部 MCP 代理实现，新 feature 需要实现类似的"内置"调用逻辑
- `one-api/relay/controller/text.go` — `RelayTextHelper()` 是文本/多模态请求的核心入口
- `one-api/relay/model/message.go` — `Message` 支持 `ContentTypeImageURL`，已有完整的多模态消息模型
- `one-api/relay/adaptor/` — 38 个适配器中 OpenAI/Anthropic/Gemini 等已支持图片输入
- `one-api/common/image/image.go` — 图片处理工具（URL 获取、base64 转换、尺寸计算）
- `one-api/model/channel.go` — Channel 模型，`Type` 决定使用哪个 adaptor
- `one-api/model/mcp_provider.go` — MCPProvider 模型
- `one-api/model/mcp_tool.go` — MCPTool 模型
- `one-api/controller/mcp.go` — MCP 管理控制器

### Related Documents
- ARCHITECTURE-DECISION.md — MCP 代理平台架构决策
- one-api/DEPLOY.md — 部署文档

### Related Features
- feat-mcp-server (已完成) — MCP Server 协议端点，本 feature 的基础
- feat-mcp-upstream-proxy (已完成) — 上游 MCP 代理中转，参考实现模式
- feat-mcp-management (已完成) — MCP 供应商管理界面，需要扩展

## Technical Solution

### 核心设计

新增一种 MCP Provider 类型：`built-in`（内置工具），区别于现有的 `upstream`（外部代理）类型。

#### 1. 数据模型变更

**MCPProvider** 新增字段：
- `Type` (string) — `"upstream"` (默认，现有行为) 或 `"builtin"` (内置工具)
- `BuiltinConfig` (string, JSON) — 内置工具配置，格式：
  ```json
  {
    "tool_type": "vision",
    "channel_id": 123,
    "model": "gpt-4o",
    "system_prompt": "You are a helpful vision assistant.",
    "max_tokens": 4096
  }
  ```

#### 2. 内置 Tool 注册

当 Provider 类型为 `builtin` 时：
- 不创建 UpstreamClient，不连接外部服务
- 直接在 `mcp_tools` 表注册内置 tool：
  - `vision_analyze`：接受 `image` (URL/base64) 和 `prompt` (文本) 参数
  - `inputSchema` 定义为标准 JSON Schema
- Tool name 使用 provider 的 `ToolPrefix` 前缀，与 upstream tool 一致

#### 3. Tool 调用实现

在 `handleToolsCall()` 中增加分支：
```
if provider.Type == "builtin" {
    // 解析 BuiltinConfig
    // 构造多模态请求：将 image + prompt 组装为 Message{ContentTypeImageURL, ContentTypeText}
    // 通过内部 relay 调用指定 channel 的模型
    // 返回模型响应作为 tool result
}
```

内部 relay 调用不走 HTTP，而是直接调用 relay 层的函数，复用现有的：
- 模型映射 (`ModelMapping`)
- Token 计费
- 日志记录
- 渠道选择逻辑

#### 4. Admin API 扩展

新增/修改 API：
- `POST /api/mcp-provider/` — 支持 `type: "builtin"` + `builtin_config`
- `GET /api/mcp-provider/:id/test` — 对 builtin 类型，发送测试图片验证连通性
- `GET /api/mcp-provider/:id/vision-channels` — 列出支持多模态的渠道供选择

#### 5. 前端管理界面

在 MCP 供应商管理页新增：
- 创建 Provider 时可选类型：外部代理 / 内置视觉理解
- 选择内置视觉理解时，显示渠道+模型选择器（只列出支持多模态的渠道）
- 内置工具不需要 BaseURL、AuthToken、Transport 等字段

### 文件变更预估

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `model/mcp_provider.go` | 修改 | 新增 Type、BuiltinConfig 字段 |
| `mcp/handler.go` | 修改 | handleToolsCall 增加 builtin 分支 |
| `mcp/builtin.go` | 新增 | 内置工具调用逻辑（构造多模态请求、调用 relay） |
| `mcp/sync.go` | 修改 | builtin provider 的 tool 注册逻辑 |
| `controller/mcp.go` | 修改 | 扩展 CRUD 支持 builtin 类型，新增可用渠道查询 |
| `web/berry/src/views/MCPProvider/` | 修改 | 前端管理界面支持 builtin 类型 |

## Acceptance Criteria (Gherkin)

### User Story
作为 AIHub 管理员，我希望配置一个内置视觉理解 MCP tool，让下游 MCP 客户端（如 Claude Code）可以直接调用图片分析能力，而无需部署外部视觉 MCP 服务。

### Scenarios (Given/When/Then)

#### Scenario 1: 创建内置视觉理解 Provider
```gherkin
Given 管理员已登录 AIHub 后台
And 系统中存在一个支持多模态的渠道（如 GPT-4o）
When 管理员在 MCP 供应商管理页创建新 Provider
And 选择类型为"内置视觉理解"
And 选择渠道和模型
And 点击保存
Then 系统注册 "vision_analyze" tool 到 mcp_tools 表
And 该 tool 出现在下游客户端的 tools/list 响应中
```

#### Scenario 2: 调用视觉理解 Tool
```gherkin
Given 一个内置视觉理解 Provider 已配置并启用
When MCP 客户端发送 tools/call 请求
And tool 名称为 "vision_analyze"
And arguments 包含 image (URL) 和 prompt (文本)
Then 系统内部构造多模态请求发送到配置的渠道+模型
And 返回模型的视觉分析结果作为 tool result
And 记录调用日志到 mcp_logs 表
```

#### Scenario 3: 内置 Tool 不依赖外部服务
```gherkin
Given 一个内置视觉理解 Provider 已配置
When 系统启动或 Provider 启用
Then 不创建 UpstreamClient
Then 不发起任何外部 MCP 连接
Then 内置 tool 直接可用
```

#### Scenario 4: 错误处理 — 渠道不可用
```gherkin
Given 内置视觉理解 Provider 配置的渠道已被禁用
When MCP 客户端调用 vision_analyze tool
Then 返回 MCP 错误响应，提示渠道不可用
And 日志记录错误信息
```

#### Scenario 5: 前端类型选择
```gherkin
Given 管理员在 MCP 供应商管理页
When 点击创建新 Provider
Then 显示类型选择：外部代理 / 内置视觉理解
When 选择"内置视觉理解"
Then 隐藏 BaseURL、AuthToken、Transport 字段
And 显示渠道选择器和模型选择器
```

### UI/Interaction Checkpoints
- MCP 供应商创建/编辑表单增加类型切换
- 选择内置类型时，动态显示渠道+模型选择器
- 内置 Provider 在列表中显示"内置"标签，区分于外部代理

### General Checklist
- [ ] 内置 tool 与 upstream tool 共存，互不影响
- [ ] 支持 base64 和 URL 两种图片输入格式
- [ ] Token 消耗正确计费（使用渠道的计费规则）
- [ ] 调用日志正确记录到 mcp_logs
- [ ] 并发安全（多个客户端同时调用）
