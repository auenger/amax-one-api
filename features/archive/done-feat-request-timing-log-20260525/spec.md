# Feature: feat-request-timing-log 请求计时日志

## Basic Information
- **ID**: feat-request-timing-log
- **Name**: 请求计时日志
- **Priority**: 80
- **Size**: M
- **Dependencies**: none
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-25

## Description
新增一个管理员专属的请求计时日志页面，记录每次 API 请求各阶段的精确耗时，用于分析代理转发带来的延迟瓶颈。

核心需求：记录每个请求的 4 个关键时间点：
1. **请求到达时间** (`t_request`) — 用户请求到达服务器的时刻
2. **转发渠道时间** (`t_relay`) — 开始向上游渠道发送请求的时刻
3. **渠道返回时间** (`t_upstream`) — 收到上游渠道响应的时刻
4. **响应用户时间** (`t_response`) — 响应完全发送给用户的时刻

从这些时间点可推导出：
- **中间件耗时** = t_relay - t_request（认证、亲和性、渠道路由）
- **上游连接耗时** = HTTP 请求发起到收到响应
- **上游处理耗时** = t_upstream - t_relay_start
- **响应传输耗时** = t_response - t_upstream
- **总延迟** = t_response - t_request

页面仅管理员可见，类似现有日志页面的布局和交互。

## User Value Points
1. **请求分段计时采集** — 后端自动记录每次请求各阶段耗时，无需手动埋点
2. **计时分析管理页面** — 管理员可按时间、渠道、模型、耗时等维度筛选和查看计时数据，定位延迟瓶颈

## Context Analysis

### Reference Code
- **请求管线入口**: `one-api/router/relay.go:14-21` — 中间件链 `RelayPanicRecover → TokenAuth → Affinity → Distribute`
- **现有计时**: `one-api/relay/meta/relay_meta.go:55` — `meta.StartTime = time.Now()`（中间件之后）
- **总耗时记录**: `one-api/relay/controller/helper.go:136` — `ElapsedTime: helper.CalcElapsedTime(meta.StartTime)`
- **上游请求**: `one-api/relay/adaptor/common.go:21-38` — `DoRequestHelper` 发送 HTTP 请求
- **日志模型**: `one-api/model/log.go:15-32` — `Log` 结构体含 `ElapsedTime` 字段（ms）
- **日志 API**: `one-api/router/api.go:144-151` — 日志查询路由
- **前端日志页**: `one-api/web/berry/src/views/Log/` — 可参考的 UI 实现

### Related Documents
- `one-api/DEPLOY.md` — 部署文档

### Related Features
- `feat-monitoring-timing` (归档) — 监控数据时序优化，可参考其计时方案
- `feat-log-channel-visibility` (归档) — 日志渠道信息可见，可参考日志 UI 扩展模式

## Technical Solution

### 数据模型
新增 `RequestTiming` 模型（独立表，不污染现有日志表）：

```go
type RequestTiming struct {
    Id              int
    RequestId       string    // 唯一请求 ID
    ChannelId       int       // 渠道 ID
    ChannelName     string    // 渠道名称
    UserId          int       // 用户 ID
    Username        string    // 用户名
    TokenName       string    // Token 名称
    ModelName       string    // 模型名称
    IsStream        bool      // 是否流式

    // 4 个关键时间点（Unix 毫秒）
    TRequest        int64     // 请求到达时间
    TRelay          int64     // 转发渠道时间（中间件完成后）
    TUpstream       int64     // 渠道返回时间
    TResponse       int64     // 响应用户时间

    // 推导字段（毫秒，避免前端计算）
    MiddlewareMs    int64     // 中间件耗时 t_relay - t_request
    UpstreamMs      int64     // 上游耗时 t_upstream - t_relay
    ResponseMs      int64     // 响应耗时 t_response - t_upstream
    TotalMs         int64     // 总耗时 t_response - t_request

    CreatedAt       int64     // 创建时间
}
```

### 后端计时钩子插入点
| 阶段 | 文件 | 插入方式 |
|------|------|---------|
| t_request | `router/relay.go` | 新增首个中间件，记录 `time.Now().UnixMilli()` 到 gin context |
| t_relay | `relay/meta/relay_meta.go:55` | 在 `StartTime` 设置处同步记录 |
| t_upstream | `relay/adaptor/common.go` | `DoRequestHelper` 中 HTTP 响应返回后记录 |
| t_response | `controller/relay.go` | 请求完成后 defer 记录 |

### API
- `GET /api/timing/` — 管理员查询计时日志（分页、筛选）
- `GET /api/timing/stats` — 耗时统计（P50/P95/P99，按渠道/模型分组）
- `DELETE /api/timing/` — 清理旧数据

### 前端
- 新增 `one-api/web/berry/src/views/TimingLog/` 页面
- 参考现有 Log 页面布局，增加耗时分段柱状图
- 仅管理员可见（注册菜单项时检查角色）

## Acceptance Criteria (Gherkin)

### User Story
作为管理员，我需要查看每次请求的分段耗时数据，以便定位代理服务引入的延迟瓶颈。

### Scenarios

#### Scenario 1: 计时数据自动采集
```gherkin
Given 系统正常运行
When 用户通过 /v1/chat/completions 发起 API 请求
Then 系统记录该请求的 t_request、t_relay、t_upstream、t_response 四个时间点
And 计算并存储 middleware_ms、upstream_ms、response_ms、total_ms
```

#### Scenario 2: 管理员查看计时日志
```gherkin
Given 用户以管理员角色登录
When 导航到"计时日志"页面
Then 显示计时日志列表，包含时间、渠道、模型、各阶段耗时、总耗时
And 可按时间范围、渠道、模型、最小耗时筛选
And 支持分页浏览
```

#### Scenario 3: 非管理员无权限
```gherkin
Given 用户以普通用户角色登录
Then 导航菜单中不显示"计时日志"入口
And 直接访问 /api/timing/ 返回 403
```

#### Scenario 4: 耗时统计
```gherkin
Given 系统已积累多条计时记录
When 管理员查看计时统计
Then 显示各渠道/模型的 P50、P95、P99 耗时
And 可区分中间件耗时、上游耗时、响应耗时分别统计
```

#### Scenario 5: 流式请求计时
```gherkin
Given 系统处理流式（stream=true）请求
When 上游渠道返回首个 chunk
Then t_upstream 记录为首个 chunk 到达时间
And 后续 chunk 传输时间不计入 upstream_ms
```

### UI/Interaction Checkpoints
- 计时日志列表页：表格展示，每行一条请求记录
- 耗时分段可视化：每行可展开查看分段耗时条形图
- 筛选栏：时间范围选择器、渠道下拉、模型下拉、最小耗时输入
- 排序：支持按总耗时、各阶段耗时排序

### General Checklist
- [x] 计时数据不影响正常请求性能（异步写入）
- [x] 支持数据库自动迁移
- [ ] 计时记录可配置保留天数

## Merge Record
- **Completed**: 2026-05-25
- **Branch**: feature/feat-request-timing-log
- **Merge Commit**: 10e31e1
- **Archive Tag**: feat-request-timing-log-20260525
- **Conflicts**: panel.js (stash conflict, auto-resolved by merging both IconClock + IconDownload imports)
- **Verification**: PASSED (go vet, go build, go test, 5/5 Gherkin scenarios via code analysis)
- **Stats**: 16 files changed, 998 insertions, 1 commit
