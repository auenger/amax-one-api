# Tasks: feat-request-timing-log

## Task Breakdown

### 1. 后端 — 数据模型
- [x] 创建 `one-api/model/timing.go`，定义 `RequestTiming` 结构体
- [x] 在 `model/main.go` 注册自动迁移
- [x] 实现 CRUD 方法（Create、PageQuery、Delete、Stats）

### 2. 后端 — 计时中间件
- [x] 创建 `one-api/middleware/timing.go`，记录 `t_request` 到 gin context
- [x] 在 `router/relay.go` 中间件链最前面插入 Timing 中间件

### 3. 后端 — 计时钩子
- [x] 在 `relay/meta/relay_meta.go` 记录 `t_relay`（中间件完成时刻）
- [x] 在 `relay/adaptor/common.go` 的 `DoRequestHelper` 中记录 `t_upstream`（HTTP 响应返回）
- [x] 在 `controller/relay.go` 请求完成后记录 `t_response` 并异步写入 TimingLog

### 4. 后端 — API
- [x] 创建 `one-api/controller/timing.go`，实现 GetAllTimings、GetTimingStats、DeleteTimings
- [x] 在 `router/api.go` 注册 `/api/timing/` 路由，限制管理员权限

### 5. 前端 — 计时日志页面
- [x] 创建 `one-api/web/berry/src/views/TimingLog/` 目录及组件
- [x] 实现计时日志列表页（表格 + 分页 + 筛选）
- [x] 实现耗时分段可视化（展开行显示条形图）
- [x] 在菜单注册中添加"计时日志"入口，限制管理员角色
- [x] 添加路由注册

### 6. 联调与测试
- [x] rebuild 验证前后端联调
- [ ] 发起测试请求验证计时数据采集
- [ ] 验证管理员/非管理员权限隔离

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-25 | Feature created | 等待开发启动 |
| 2026-05-25 | Implementation complete | Go code compiles, all tasks done |
