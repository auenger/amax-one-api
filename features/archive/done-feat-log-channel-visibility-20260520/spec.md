# Feature: feat-log-channel-visibility 日志渠道信息可见

## Basic Information
- **ID**: feat-log-channel-visibility
- **Name**: 日志渠道信息可见
- **Priority**: 75
- **Size**: S
- **Dependencies**: feat-concurrency-tracker
- **Parent**: feat-channel-concurrency
- **Children**: none
- **Created**: 2026-05-19

## Description
普通用户在日志页面能够看到自己请求记录对应的渠道名称信息。当前日志表格已有 ChannelId 字段，但普通用户可能无法看到渠道名称。需要在日志 API 和前端表格中增加渠道名称的展示。

## User Value Points
1. **日志渠道透明度** — 普通用户能知道自己的请求被路由到了哪个渠道，增加系统透明度

## Context Analysis
### Reference Code
- `one-api/web/berry/src/views/Log/index.js` — 日志页面
- `one-api/web/berry/src/views/Log/component/TableRow.js` — 日志表格行
- `one-api/web/berry/src/views/Log/component/TableToolBar.js` — 过滤工具栏
- `one-api/web/berry/src/views/Log/component/TableHead.js` — 表头
- `one-api/model/log.go` — Log 模型 (含 ChannelId 字段)
- `one-api/controller/log.go` — 日志查询 API

### Related Documents
- 日志类型定义: `one-api/web/berry/src/views/Log/type/LogType.js`

### Related Features
- [[feat-concurrency-tracker]] — 共享渠道信息基础设施
- [[feat-user-channel-select]] — 用户渠道选择（上下文关联）

## Technical Solution
- **后端**: 新增 `GET /api/user/channel_names` 接口，通过 `CacheGetModelChannels` 获取用户组的渠道并返回 `{id: name}` 映射；`GetUserLogs` 新增 `channel` 参数支持用户级渠道筛选
- **前端**: 渠道列/筛选从 admin-only 改为所有用户可见；非管理员通过 `/api/user/channel_names` 获取渠道名称；已删除渠道降级显示为"渠道#ID"
- **无 N+1**: 渠道名称通过内存缓存批量获取（复用 `CacheGetModelChannels`）

## Acceptance Criteria (Gherkin)
### User Story
作为普通用户，我希望在日志页面看到自己请求记录使用的渠道名称，以便了解请求路由情况。

### Scenarios (Given/When/Then)
```gherkin
Scenario: 普通用户日志表格显示渠道名称
  Given 一个普通用户已登录
  And 用户有使用记录
  When 用户打开日志页面
  Then 日志表格显示每条记录的渠道名称列
  And 渠道名称来自 Channel 表的 Name 字段

Scenario: 日志按渠道筛选
  Given 日志页面已加载
  When 用户在筛选栏选择特定渠道
  Then 只显示该渠道的日志记录

Scenario: 渠道名称为空的降级显示
  Given 某条日志记录的渠道已被删除
  When 用户查看该条记录
  Then 渠道列显示 "未知渠道" 或渠道 ID
```

### UI/Interaction Checkpoints
- 日志表格: 新增/展示渠道名称列
- 日志筛选工具栏: 新增渠道下拉筛选
- 已删除渠道的降级显示

### General Checklist
- [x] 普通用户只能看到自己的日志，不能看到其他用户的
- [x] 渠道名称通过 JOIN 或缓存获取，避免 N+1 查询

## Merge Record
- **Completed**: 2026-05-20
- **Merged Branch**: feature/log-channel-visibility
- **Merge Commit**: e508db1
- **Feature Commit**: d50a79f
- **Archive Tag**: feat-log-channel-visibility-20260520
- **Conflicts**: none
- **Verification**: PASSED (9/9 tasks, 3/3 Gherkin scenarios)
- **Evidence**: evidence/verification-report.md
- **Duration**: ~1 day (started 2026-05-20)
- **Files Changed**: 7 (+106/-42)
