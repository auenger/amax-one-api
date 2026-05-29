# Tasks: feat-daily-request-limit

## Task Breakdown

### 1. 后端：配置变量注册
- [x] 在 `config/config.go` 新增 `DailyRequestLimit` 和 `DailyRequestLimitExemptEnabled` 变量
- [x] 在 `option.go` 的 `InitOptionMap()` 中设置默认值
- [x] 在 `option.go` 的 `updateOptionMap()` 中添加 switch case

### 2. 后端：User 模型扩展
- [x] 在 `User` struct 新增 `DailyLimitExempt bool` 字段
- [x] 确认 GORM AutoMigrate 能自动建列

### 3. 后端：每日限额中间件
- [x] 新建 `middleware/daily-limit.go`
- [x] 实现 Redis INCR + EXPIRE 计数逻辑（北京时间 key）
- [x] 实现永久豁免 passthrough（User.DailyLimitExempt）
- [x] 实现临时豁免 passthrough（Redis `daily_exempt:{userId}:{date}` EXIST 检查）
- [x] 实现超限 429 响应
- [x] 在 relay 路由组中注册中间件

### 4. 后端：管理员 API
- [x] 新增 `PUT /api/user/:id/daily-limit-exempt` — 切换永久豁免
- [x] 新增 `POST /api/user/:id/daily-limit-exempt-today` — 授予当日临时豁免（Redis key TTL 到次日凌晨）
- [x] 新增 `GET /api/daily-limit/status` — 查询用户当日用量（含豁免状态）
- [x] 新增 `PUT /api/daily-limit/config` — 更新限额配置
- [x] 在 `router/api.go` 注册新路由

### 5. 前端：限额配置面板
- [x] 在系统设置页面新增每日限额配置项
- [x] 实现读取/保存限额数值

### 6. 前端：用户豁免管理
- [x] 在用户列表新增「永久豁免」列（Switch 组件）
- [x] 在用户列表新增「临时豁免」操作按钮（当日有效标记）
- [x] 实现永久豁免状态切换 API 调用
- [x] 实现临时豁免授予 API 调用
- [x] 权限控制：仅管理员可见

## Progress Log
| Date | Progress | Notes |
