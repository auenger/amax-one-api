# Feature: feat-daily-request-limit 每日请求次数限额

## Basic Information
- **ID**: feat-daily-request-limit
- **Name**: 每日请求次数限额
- **Priority**: 80
- **Size**: M
- **Dependencies**: []
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-28

## Description

为平台增加全局每日请求次数限额功能：

1. **通用限额配置**：管理员通过系统选项设置每日请求次数上限（如 1000 次/天），每个用户独立计数。计数基于 Redis 每日 key，北京时间 0 点重置。超限后该用户当天无法再发起请求，返回 429。
2. **永久豁免**：管理员可以为特定用户设置永久豁免（如 VIP 用户），豁免状态持久化到 User 表，长期有效，手动取消。
3. **当日临时豁免**：管理员可以为某个用户临时解除当天的限额限制，过了北京时间 0 点自动失效。适用于临时救急场景，无需手动清理。

## User Value Points

### VP1：每日请求限额
管理员设置全局每日请求次数上限，每个用户独立计数，超限自动拒绝请求。防止个别用户滥用平台资源，保障整体服务稳定性。

### VP2：管理员豁免特定用户（永久 + 临时）
管理员可以为特定用户解除每日限额限制。提供两种豁免模式：
- **永久豁免**：持久化到 User 表，适用于 VIP 用户、内部测试账号，手动取消。
- **当日临时豁免**：Redis key 当天有效，过 0 点自动失效，适用于临时救急场景。

## Context Analysis

### Reference Code
- **现有限流**: `one-api/middleware/rate-limit.go` — IP 级限流，使用 Redis list + 时间戳模式，无用户级计数
- **User 模型**: `one-api/model/user.go` — `RequestCount` 字段已有但未用于日限额；无豁免标记字段
- **系统选项**: `one-api/model/option.go` — key-value 表 + `config.OptionMap` 内存缓存 + switch 分发
- **配置定义**: `one-api/common/config/config.go` — 包级变量声明模式
- **Auth**: `one-api/middleware/auth.go` — userId 通过 `c.GetInt("id")` 获取

### Related Documents
- `project-context.md` — 项目架构与技术栈

### Related Features
- `feat-rate-limit-exhaustion` — 429 Rate Limit 渠道自动禁用与恢复（参考 rate-limit 模式）

## Technical Solution

### 后端

#### 1. 配置变量
在 `config/config.go` 新增：
```go
DailyRequestLimit     int  // 每日请求次数上限，0 表示不限制
DailyRequestLimitExemptEnabled bool // 是否启用豁免功能
```
在 `option.go` 的 `InitOptionMap()` 和 `updateOptionMap()` 中注册对应 option key。

#### 2. User 模型扩展
在 `User` struct 新增字段：
```go
DailyLimitExempt bool `gorm:"type:boolean;default:false" json:"daily_limit_exempt"`
```
GORM AutoMigrate 自动建列。管理员豁免 = 将此字段设为 true。

#### 3. 新中间件：`middleware/daily-limit.go`
- 在 TokenAuth / UserAuth 之后插入
- 读取 `config.DailyRequestLimit`，若为 0 则 passthrough
- 读取 userId，查询 User.DailyLimitExempt（永久豁免），若 true 则 passthrough
- 检查 Redis key `daily_exempt:{userId}:{YYYYMMDD}`（临时豁免），若存在则 passthrough
- Redis key: `daily_limit:{userId}:{YYYYMMDD}` (北京时间)
- 使用 `INCR` + `EXPIRE`（TTL 设为次日凌晨）
- 若 INCR 结果 > limit，返回 HTTP 429 + message
- 路由位置：`/v1/` relay 路由组（代理转发请求）+ `/api/` 管理 API 中的需要计数的端点

#### 4. 管理员 API
在 `controller/user.go` 或新建 `controller/daily-limit.go`：
- `GET /api/user/daily-limit/status` — 查询指定用户或全部用户的当日使用情况
- `PUT /api/user/:id/daily-limit-exempt` — 设置/取消用户永久豁免（AdminAuth）
- `POST /api/user/:id/daily-limit-exempt-today` — 授予当日临时豁免（AdminAuth），Redis key `daily_exempt:{userId}:{date}` TTL 到次日凌晨
- `GET /api/daily-limit/config` — 获取当前限额配置
- `PUT /api/daily-limit/config` — 更新限额配置（RootAuth）

#### 5. 路由注册
在 `router/api.go` 注册新路由组，使用 AdminAuth/RootAuth 中间件。

### 前端

#### 6. 系统设置面板
在系统设置或管理后台中新增每日限额配置项（输入框 + 保存按钮）。

#### 7. 用户管理增强
在用户列表/编辑页面增加「豁免」开关列（Switch/Toggle），管理员可直接操作。

### Redis 方案
```
计数 Key:    daily_limit:{userId}:{20260528}
  Cmd:       INCR key → 若 == 1 则 EXPIRE key {seconds_to_midnight_beijing}
  Check:     count > DailyRequestLimit → 429
  TTL:       自动过期（次日凌晨），无需手动清理

临时豁免 Key: daily_exempt:{userId}:{20260528}
  Cmd:       SET key 1 EX {seconds_to_midnight_beijing}
  Check:     中间件中 EXIST 检查，存在即豁免
  TTL:       次日凌晨自动过期，无需手动清理
```

## Acceptance Criteria (Gherkin)

### User Story
作为平台管理员，我需要限制每个用户每天的请求次数，以防止资源滥用；同时需要为特定用户（如 VIP）解除限制。

### Scenario 1: 每日限额生效
```
Given 管理员设置了每日请求限额为 100 次
And 用户 A 当天已请求 99 次
When 用户 A 发起第 100 次请求
Then 请求成功（count=100，未超限）

When 用户 A 发起第 101 次请求
Then 请求被拒绝，返回 HTTP 429
And 响应消息包含「每日请求次数已用尽」
```

### Scenario 2: 限额为 0 时不限制
```
Given 管理员设置了每日请求限额为 0
When 任何用户发起请求
Then 请求正常通过，不进行次数计数
```

### Scenario 3: 每日 0 点重置
```
Given 管理员设置了每日请求限额为 100 次
And 用户 A 昨天已用尽 100 次
When 今天北京时间 0 点后用户 A 发起请求
Then 请求成功，当日计数从 1 开始
```

### Scenario 4: 管理员永久豁免特定用户
```
Given 每日请求限额为 100 次
And 用户 B 当天已请求 100 次（已达上限）
When 管理员为用户 B 设置永久豁免
Then 用户 B 可以继续请求，不受每日限额限制
And 永久豁免状态持久化，次日仍然有效
```

### Scenario 5: 取消用户永久豁免
```
Given 用户 B 已被永久豁免
When 管理员取消用户 B 的永久豁免
And 用户 B 当天已超限
Then 用户 B 的后续请求被拒绝，返回 429
```

### Scenario 6: 管理员授予当日临时豁免
```
Given 每日请求限额为 100 次
And 用户 C 当天已请求 100 次（已达上限）
When 管理员为用户 C 授予当日临时豁免
Then 用户 C 可以继续请求，不受每日限额限制
```

### Scenario 7: 临时豁免过 0 点自动失效
```
Given 用户 C 已被授予当日临时豁免
And 用户 C 当天已超限
When 次日北京时间 0 点后用户 C 发起请求
And 用户 C 当天已超限
Then 用户 C 的请求被拒绝，返回 429
And 无需管理员手动取消临时豁免
```

### Scenario 8: 用户查看当日用量
```
Given 每日请求限额为 100 次
When 用户 A 查看自己的请求状态
Then 可以看到「今日已用 X/100 次」
```

### UI/Interaction Checkpoints
- 管理员可在系统设置中输入并保存每日限额数值
- 用户列表中新增「永久豁免」列，显示开关状态
- 管理员点击开关即可切换用户永久豁免状态
- 用户列表中新增「临时豁免」按钮/操作，管理员可一键授予当日临时豁免
- 临时豁免授予后 UI 显示当天有效的标记（如「当日豁免 ✓」）
- 非管理员用户看不到豁免相关 UI

### General Checklist
- [ ] Redis 计数 key 格式正确，TTL 北京时间次日凌晨
- [ ] Redis 临时豁免 key 格式正确，TTL 北京时间次日凌晨
- [ ] 超限返回标准 429 JSON 响应
- [ ] 限额为 0 时完全跳过计数逻辑
- [ ] 永久豁免字段持久化到 User 表
- [ ] 临时豁免通过 Redis TTL 自动过期，无需手动清理
- [ ] GORM AutoMigrate 自动添加新字段
