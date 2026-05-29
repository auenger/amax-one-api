# Feature: feat-mcp-management MCP 供应商管理界面

## Basic Information
- **ID**: feat-mcp-management
- **Name**: MCP 供应商管理界面
- **Priority**: 75
- **Size**: S
- **Dependencies**: feat-mcp-upstream-proxy
- **Parent**: feat-mcp-proxy
- **Children**: []
- **Created**: 2026-05-27

## Description

为 MCP 代理平台提供管理界面，包括供应商配置页面、工具列表管理、使用量统计、连接测试等功能。

### 核心能力
1. MCP 供应商 CRUD 管理页面
2. 工具列表查看和管理（启用/禁用）
3. 连接测试（一键验证上游连通性）
4. 使用量统计面板（调用次数、成功率、延迟）
5. 用户组权限控制（哪些组可用哪些供应商的工具）

### 技术方案

#### 前端页面
```
Berry 前端新增：
├── MCPMenu.js              — 侧边栏 MCP 菜单项
├── MCPProviders.js          — 供应商列表页
├── MCPProviderDetail.js     — 供应商详情（含工具列表、连接测试）
└── MCPSettings.js           — MCP 全局设置（端口、传输方式等）
```

#### API 端点
```
GET    /api/mcp/provider        — 列出所有供应商
POST   /api/mcp/provider        — 创建供应商
PUT    /api/mcp/provider/:id    — 更新供应商
DELETE /api/mcp/provider/:id    — 删除供应商
POST   /api/mcp/provider/:id/test     — 测试连接
POST   /api/mcp/provider/:id/sync     — 手动同步工具
GET    /api/mcp/provider/:id/tools    — 获取供应商工具列表
PUT    /api/mcp/tool/:id              — 更新工具（启用/禁用）
GET    /api/mcp/stats                  — MCP 使用量统计
```

#### 使用量统计
- 扩展现有 Log 模型，新增 MCP 调用日志类型
- 或新建 MCPLog 模型：provider_id、tool_name、request_params、response_status、duration、created_at
- 前端展示：按供应商/工具/时间的调用趋势图

## User Value Points

### VP1: MCP 供应商可视化管理
管理员通过 UI 完成供应商的添加、配置、测试和监控，无需手动操作数据库。

## Context Analysis

### Reference Code
- `one-api/web/berry/src/views/` — 前端页面参考
- `one-api/controller/channel.go` — Channel CRUD API 参考
- `one-api/web/berry/src/views/ChannelSetting/` — Channel 设置页面参考

### Related Features
- [[feat-mcp-proxy]] — 父功能
- [[feat-mcp-upstream-proxy]] — 前置依赖（Provider 模型和 API）

## Technical Solution

### 实现步骤
1. Provider CRUD API 完善（controller/mcp.go）
2. MCP 日志模型（MCPLog）
3. 前端：侧边栏 MCP 菜单
4. 前端：供应商列表页（CRUD + 连接测试）
5. 前端：供应商详情页（工具列表 + 同步）
6. 前端：使用量统计面板

## Acceptance Criteria (Gherkin)

### User Story
作为 AIHub 管理员，我希望通过 Web 界面管理 MCP 供应商配置，查看工具状态和使用统计。

### Scenarios

#### Scenario 1: 添加供应商
```gherkin
Given 管理员在 MCP 供应商管理页面
When 填写 GLM 供应商信息（名称、URL、Token、传输方式）并保存
Then 供应商创建成功
And 自动触发连接测试和工具同步
```

#### Scenario 2: 连接测试
```gherkin
Given 已配置一个 MCP 供应商
When 管理员点击"测试连接"
Then AIHub 尝试连接上游 MCP Server
And 显示连接状态（成功/失败 + 延时）
```

#### Scenario 3: 工具管理
```gherkin
Given 供应商已连接且工具已同步
When 管理员查看工具列表
Then 显示所有同步到的工具（名称、描述、schema）
And 管理员可以启用/禁用单个工具
```

#### Scenario 4: 使用量统计
```gherkin
Given MCP 代理已运行一段时间
When 管理员查看统计面板
Then 显示各供应商/工具的调用次数、成功率、平均延迟
And 支持按时间范围筛选
```

### General Checklist
- [ ] Provider CRUD API 完善
- [ ] MCPLog 日志模型
- [ ] 前端 MCP 菜单和路由
- [ ] 供应商管理页面
- [ ] 工具列表和启用/禁用
- [ ] 使用量统计面板
