# Tasks: feat-mcp-vision-tool

## Task Breakdown

### 1. 数据模型
- [x] MCPProvider 新增 `Type` 字段 (`upstream` / `builtin`)
- [x] MCPProvider 新增 `BuiltinConfig` 字段 (JSON string)
- [x] 数据库 migration 兼容（已有 provider 默认 `type=upstream`）
- [x] 新增 `BuiltinProviderConfig` 解析结构体
- [x] 新增 `IsBuiltin()` 辅助方法
- [x] 新增 `GetBuiltinMCPProviders()` / `GetUpstreamMCPProviders()` 查询函数

### 2. 内置 Tool 核心逻辑
- [x] 新建 `mcp/builtin.go`，实现 `callBuiltinTool()` 函数
- [x] 解析 BuiltinConfig 获取 channel_id + model
- [x] 构造多模态请求消息（image + prompt → Message with ContentTypeImageURL）
- [x] 内部调用 relay 层发送请求到指定渠道
- [x] 处理 relay 响应，提取文本内容作为 MCP tool result
- [x] 错误处理（渠道禁用、模型不支持图片、relay 超时等）
- [x] 使用函数注册模式（`VisionRelayFunc`）避免循环依赖

### 3. Tool 注册
- [x] 新建 `RegisterBuiltinTools()` 注册内置 tool（不走 upstream sync）
- [x] `vision_analyze` tool 的 InputSchema 定义（image: string, prompt: string）
- [x] builtin provider 启用/禁用时自动注册/注销 tool
- [x] `InitBuiltinProviders()` 启动时加载所有 builtin provider

### 4. MCP Handler 修改
- [x] 重构 `handleToolsCall()`，增加 provider 类型检查
- [x] 根据 tool 关联的 provider 类型，调用 `callBuiltinTool()` 或 `callUpstreamTool()`
- [x] 内置 tool 调用日志正确记录到 mcp_logs

### 5. Admin API 扩展
- [x] 修改 `controller/mcp.go` 的 Add 接口支持 `type=builtin` + `builtin_config`
- [x] 修改 Update 接口支持 builtin 类型（类型切换、tool 重新注册）
- [x] 修改 Delete 接口支持 builtin 类型清理
- [x] 新增 API：`GET /api/mcp-provider/vision-channels` 查询支持多模态的渠道列表
- [x] builtin provider 的 Test 接口（发送测试图片验证连通性）
- [x] 创建 builtin provider 时校验 channel_id 有效性和模型
- [x] 新增 `controller/mcp_builtin.go` 实现 VisionRelayFunc

### 6. 前端管理界面
- [x] MCP 供应商创建/编辑表单增加类型切换（外部代理 / 内置视觉理解）
- [x] 选择内置类型时，隐藏 BaseURL/AuthToken/Transport 字段
- [x] 显示渠道选择器（筛选支持多模态的渠道）
- [x] 显示模型选择器（根据选中渠道的 Models 列表）
- [x] Provider 列表中显示类型标签（内置/外部）
- [x] 可选：配置 system_prompt 和 max_tokens

### 7. UpstreamClient Store 适配
- [x] 修改 `mcp/sync.go`，`InitUpstreamClients` 只处理 upstream 类型
- [x] `tools/list` 响应中包含 builtin tool（已有，从 DB 读取所有 MCPTool）
- [x] `handleToolsCall` 中 tool → provider 的查找逻辑兼容两种类型

### 8. 启动初始化
- [x] 修改 `router/mcp.go`，启动时初始化 upstream + builtin providers

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-06-01 | Feature created | 需求文档和任务拆解完成 |
| 2026-06-01 | Implementation complete | 全部 7 个 task 完成，Go + 前端编译通过 |
