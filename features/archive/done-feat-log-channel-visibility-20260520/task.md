# Tasks: feat-log-channel-visibility

## Task Breakdown
### 1. 后端日志 API 增强
- [x] 日志查询 API 返回渠道名称
  - 新增 GET /api/user/channel_names 用户级渠道名称接口
  - GetUserLogs 新增 channel 参数支持渠道筛选
  - 普通用户权限隔离：用户只能查自己的日志（已有 user_id 过滤）
- [x] 确认普通用户日志查询权限（只能查自己的）

### 2. 前端日志页面增强
- [x] 修改 TableRow.js — 渠道列对所有用户可见，降级显示"渠道#ID"
- [x] 修改 TableHead.js — 渠道列表头对所有用户可见
- [x] 修改 TableToolBar.js — 渠道筛选下拉对所有用户可见
- [x] 修改 index.js — 非管理员通过 /api/user/channel_names 加载渠道名称
- [x] 已删除渠道降级显示处理（显示"渠道#ID"）

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Created | 初始创建 |
| 2026-05-20 | All tasks completed | 后端+前端全部实现，Go vet 通过 |

## Files Changed

### Modified files (one-api)
- `one-api/model/log.go` — GetUserLogs 新增 channel 参数支持渠道筛选
- `one-api/controller/log.go` — GetUserLogs 传递 channel 参数；新增 GetUserChannelNames 用户级渠道名称查询
- `one-api/router/api.go` — 注册 /api/user/channel_names 路由

### Modified files (one-api web)
- `one-api/web/berry/src/views/Log/component/TableHead.js` — 渠道列表头对所有用户可见
- `one-api/web/berry/src/views/Log/component/TableRow.js` — 渠道列对所有用户可见，降级显示
- `one-api/web/berry/src/views/Log/component/TableToolBar.js` — 渠道筛选下拉对所有用户可见，替代原来的渠道ID输入框
- `one-api/web/berry/src/views/Log/index.js` — 非管理员通过 /api/user/channel_names 加载渠道名称和选项；支持渠道筛选参数传递
