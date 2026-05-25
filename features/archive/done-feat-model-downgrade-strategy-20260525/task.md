# Tasks: feat-model-downgrade-strategy

## Task Breakdown

### 1. 数据模型 (model/downgrade.go)
- [x] 创建 ModelDowngradeRule 结构体（ProviderType, ThresholdPct, TargetModel, Enabled）
- [x] 实现 CRUD 方法（GetRules, CreateRule, UpdateRule, DeleteRule）
- [x] 在 main.go 中注册 GORM 自动迁移

### 2. 降级引擎 (monitor/quota-refresh.go 修改)
- [x] 在配额刷新流程末尾增加降级规则检查
- [x] 遍历所有启用的降级规则，比对当前配额百分比
- [x] 超阈值：写入 Redis key `channel:downgrade:{provider_type}` → `{target_model}`
- [x] 低于阈值：删除对应 Redis key
- [x] 降级状态变更时打印日志

### 3. 请求时模型替换 (middleware/distributor.go 修改)
- [x] 在 distributor 选择 channel 后、relay 转发前，检查降级标记
- [x] 读取 Redis `channel:downgrade:{provider_type}` 获取目标模型
- [x] 如有降级标记，替换 request body 中的 model 字段
- [x] 在 log 中记录原始模型和降级后模型

### 4. 管理 API (controller/downgrade.go)
- [x] GET /api/downgrade/rules — 列出所有降级规则
- [x] POST /api/downgrade/rules — 创建规则（仅 Admin/Root）
- [x] PUT /api/downgrade/rules/:id — 更新规则
- [x] DELETE /api/downgrade/rules/:id — 删除规则
- [x] GET /api/downgrade/status — 获取当前降级状态
- [x] 在 router/api.go 注册路由

### 5. 前端管理页面
- [x] 创建降级规则管理页面（Berry/MUI）
- [x] 规则列表（供应商、阈值、目标模型、启用状态）
- [x] 新增/编辑规则弹窗
- [x] 当前降级状态展示（哪些供应商正在降级）
- [x] 添加侧边栏菜单入口

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-25 | Feature created | 需求分析完成，待开发 |
| 2026-05-25 | Implementation complete | 全部 5 组任务完成，go build 通过 |
