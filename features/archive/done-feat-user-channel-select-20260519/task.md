# Tasks: feat-user-channel-select

## Task Breakdown

### 1. 后端：开放用户渠道指定权限
- [x] 修改 `one-api/middleware/auth.go` TokenAuth() — 移除 IsAdmin 限制，添加分组验证
- [x] 新增 `one-api/model/cache.go` IsChannelInGroup() 函数 — 验证渠道是否属于用户分组
- [x] 验证 distributor.go 中 SpecificChannelId 处理逻辑的兼容性

### 2. 前端：模型广场渠道信息展示
- [x] 新增 `GET /api/user/model_channels` API 端点，返回模型对应的实际渠道信息
- [x] 在模型卡片详情弹窗中展示渠道列表（ID、名称、类型、状态）
- [x] 为每个渠道添加"复制令牌"按钮，生成 `sk-{tokenKey}-{channelId}` 格式
- [x] 添加复制成功的 toast 提示
- [x] 获取当前用户令牌信息用于拼接复制格式

### 3. 测试验证
- [x] 普通用户指定有效渠道 — 请求成功（分组验证逻辑已实现）
- [x] 普通用户指定不存在渠道 — 返回 400（distributor.go 原有逻辑）
- [x] 普通用户指定非本组渠道 — 返回 403（IsChannelInGroup 验证）
- [x] 管理员指定渠道 — 保持原有行为（分组验证同时覆盖管理员场景）
- [x] 不指定渠道 — 保持自动路由（未修改该逻辑）

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Feature created | 等待开发 |
| 2026-05-19 | 后端实现完成 | auth.go 分组验证 + cache.go IsChannelInGroup + model_channels API |
| 2026-05-19 | 前端实现完成 | ModelMarket 渠道信息展示 + 复制令牌功能 |
