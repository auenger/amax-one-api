# Feature: feat-mcp-pages-enhance MCP 页面增强

## Basic Information
- **ID**: feat-mcp-pages-enhance
- **Name**: MCP 页面增强（工具列表 + 调用明细 + 配置页优化）
- **Priority**: 75
- **Size**: M
- **Dependencies**: feat-mcp-proxy (已完成)
- **Parent**: null
- **Children**: []
- **Created**: 2026-06-02

## Description

对 MCP 模块的三个页面进行增强：

1. **MCP 工具列表页面** — 新增独立页面展示所有已同步的工具（跨供应商），所有用户（包括普通用户）可见，无需 Admin 权限
2. **MCP 使用统计调用明细** — 在现有统计页增加调用明细列表，展示用户名、调用时间、调用工具、耗时、状态等信息
3. **MCP Server 配置页面优化** — 所有用户可见，配置说明完善（如何配置到 Claude Code），localhost:3000 改为动态获取当前 IP 和端口

## User Value Points

### VP1: MCP 工具全局列表（所有用户可见）
用户可以浏览平台所有可用的 MCP 工具，了解每个工具的功能描述、所属供应商、输入参数，无需 Admin 权限。

### VP2: MCP 调用明细追踪
管理员可以查看每次 MCP 工具调用的详细信息（谁调用了什么工具、什么时间、耗时多少、成功/失败），便于审计和问题排查。

### VP3: MCP Server 配置信息可见（所有用户）
所有用户都能看到 MCP Server 的连接配置信息，清楚了解如何将平台 MCP 接入 Claude Code 等客户端，URL 自动适配当前部署地址。

## Context Analysis

### Reference Code
- **前端路由**: `one-api/web/berry/src/routes/MainRoutes.js` — MCP 相关路由定义
- **前端菜单**: `one-api/web/berry/src/menu-items/panel.js` — MCP 菜单项（当前 Admin-only）
- **前端页面**: `one-api/web/berry/src/views/MCPSetting/` — 所有 MCP 页面组件
  - `index.js` — Server 配置页（静态，localhost 硬编码）
  - `Providers.js` — 供应商管理
  - `ProviderDetail.js` — 供应商详情（含工具列表）
  - `Stats.js` — 使用统计（仅汇总，无明细）
  - `ModelMeta.js` — 模型标记
- **后端路由**: `one-api/router/api.go` — MCP API 路由（当前全部 AdminAuth）
- **后端控制器**: `one-api/controller/mcp.go` — MCP API handlers
- **数据模型**:
  - `one-api/model/mcp_tool.go` — MCPTool（已有 GetAllMCPTools 方法）
  - `one-api/model/mcp_log.go` — MCPLog（缺少用户信息字段）
  - `one-api/model/mcp_provider.go` — MCPProvider
- **MCP 协议**: `one-api/mcp/handler.go` — handleToolsCall（需补充用户信息记录）
- **MCP 路由**: `one-api/router/mcp.go` — TokenAuth 中间件已有 user context

### Related Documents

### Related Features
- feat-mcp-proxy (已完成) — MCP 代理平台父 feature
- feat-mcp-server (已完成) — MCP Server 协议端点
- feat-mcp-management (已完成) — MCP 供应商管理界面
- feat-mcp-vision-tool (已完成) — 内置视觉理解 MCP Tool

## Technical Solution

### VP1: MCP 工具全局列表

**后端：**
- 新增公开 API `GET /api/mcp-tool/public/list` — 返回所有 enabled 工具，使用 `model.GetAllMCPTools()`
- 使用 `UserAuth()` 中间件（登录即可访问，不限角色）
- 返回：工具名、显示名、描述、输入参数 schema、所属供应商名

**前端：**
- 新建 `one-api/web/berry/src/views/MCPSetting/Tools.js`
- 表格/卡片展示所有工具，支持搜索过滤
- 每个工具显示：名称、描述、所属供应商、参数 schema（可展开查看）
- 路由: `/panel/mcp/tools`

### VP2: MCP 调用明细

**后端：**
- `mcp_logs` 表新增字段：`user_id int`, `user_name varchar(128)`, `token_id int`
- `handler.go` 的 `handleToolsCall` 中从 session 获取 UserID/UserName，写入日志
- 新增 API `GET /api/mcp-stats/logs` — 分页查询调用明细，支持按用户/工具/时间过滤
- 使用 `AdminAuth()` 中间件

**前端：**
- 在 `Stats.js` 页面增加"调用明细"Tab 或下方区域
- 明细表格列：用户名、工具名、供应商、调用时间、耗时、状态、错误信息
- 支持分页、时间范围过滤

### VP3: Server 配置页优化

**后端：**
- 新增 API `GET /api/mcp-provider/server-config` — 返回动态构建的连接配置
- 从请求 Host header 或配置中获取当前服务地址（IP + 端口）
- 使用 `UserAuth()` 中间件（所有登录用户可见）

**前端：**
- 重构 `index.js` — 从 API 获取动态 URL，替换硬编码 localhost:3000
- 完善 Claude Code 配置说明（含 Streamable HTTP 和 SSE 两种方式的配置示例）
- 菜单项权限从 Admin-only 改为所有用户可见

## Acceptance Criteria (Gherkin)

### User Story
作为平台用户，我希望能够浏览所有可用的 MCP 工具、查看工具调用明细、了解如何配置 MCP 连接，以便更好地使用平台的 MCP 服务。

### Scenarios (Given/When/Then)

#### Scenario 1: 普通用户查看 MCP 工具列表
```gherkin
Given 用户已登录（任意角色）
When 用户访问 /panel/mcp/tools 页面
Then 页面展示所有已启用的 MCP 工具
And 每个工具显示名称、描述、所属供应商
And 工具可按名称搜索过滤
```

#### Scenario 2: 管理员查看调用明细
```gherkin
Given 用户已登录且为 Admin 角色
When 用户访问 MCP 使用统计页面
Then 页面展示调用明细列表
And 每条记录包含：用户名、工具名、调用时间、耗时、状态
And 支持分页浏览
And 支持按时间范围过滤
```

#### Scenario 3: 普通用户查看 Server 配置
```gherkin
Given 用户已登录（任意角色）
When 用户访问 MCP Server 配置页面
Then 页面展示 Streamable HTTP 和 SSE 的连接地址
And 地址中的主机部分为当前实际部署地址（非 localhost）
And 包含清晰的 Claude Code 配置步骤说明
```

#### Scenario 4: 调用日志记录用户信息
```gherkin
Given MCP 服务已启动
When 用户通过 MCP 协议调用工具
Then mcp_logs 表记录包含 user_id, user_name, token_id
And 在调用明细页面可以按用户名筛选
```

### UI/Interaction Checkpoints
- 工具列表页：表格/卡片布局，搜索框，工具参数 schema 可展开
- 统计明细：Tab 切换或折叠面板，分页控件，时间范围选择器
- 配置页：代码块展示配置内容，一键复制按钮，地址自动适配

### Merge Record
- **Completed**: 2026-06-02
- **Branch**: feature/mcp-pages-enhance
- **Merge Commit**: f0e7776
- **Archive Tag**: feat-mcp-pages-enhance-20260602
- **Conflicts**: none
- **Verification**: skipped (requires full build)
- **Stats**: 1 commit, 10 files changed, +1042/-263

## General Checklist
- [ ] 新增 API 路由需区分 UserAuth 和 AdminAuth
- [ ] 数据库迁移：mcp_logs 新增 3 个字段（向下兼容，允许 NULL）
- [ ] 前端菜单权限调整
- [ ] 动态 URL 获取考虑反向代理场景（X-Forwarded-Host / X-Forwarded-Proto）
