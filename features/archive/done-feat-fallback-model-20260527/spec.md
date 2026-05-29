# Feature: feat-fallback-model 兜底模型

## Basic Information
- **ID**: feat-fallback-model
- **Name**: 兜底模型（全局降级路由）
- **Priority**: 80
- **Size**: M
- **Dependencies**: feat-channel-routing (已归档)
- **Parent**: null
- **Children**: empty
- **Created**: 2026-05-27

## Description
在系统设置中配置一个渠道+模型作为全局兜底模型。当请求的目标模型渠道部分或全部不可用时（unhealthy/禁用/配额耗尽），自动将该请求路由到兜底模型。同一会话（conversation）一旦被路由到兜底模型，后续消息自动粘性路由到兜底模型，保证会话连续性。

### 核心流程
1. Admin 在系统设置配置兜底渠道 ID + 兜底模型名 + 开关
2. 请求进入 Distributor 时，检测目标模型的可用渠道比例
3. 若部分渠道不可用 → 按不可用比例随机分流部分新会话到兜底模型
4. 若全部渠道不可用 → 所有新会话路由到兜底模型
5. 被路由到兜底的会话，通过 Redis 记录粘性映射，后续消息自动走兜底

### 与现有机制的区别
- **vs 模型降级 (feat-model-downgrade-strategy)**: 降级是单渠道内的模型替换；兜底是跨渠道+跨模型的全局降级
- **vs 故障转移 (feat-channel-failover)**: 故障转移在同模型的不同渠道间切换；兜底是切换到完全不同的模型
- **vs Affinity (feat-affinity-fallback)**: Affinity 绑定 conversation→channel（同模型）；兜底绑定 conversation→fallback model（跨模型）

## User Value Points

### VP1: 全局兜底模型配置
管理员可以在系统设置中指定一个兜底渠道+模型，作为整个系统的"安全网"。

### VP2: 压力感知降级路由 + 会话粘性
系统自动检测渠道压力，按比例将请求降级到兜底模型，并保证会话级连续性。

## Context Analysis

### Reference Code
- `one-api/middleware/distributor.go` — 渠道分发核心，需修改 `smartSelectChannel()` 加入兜底检测
- `one-api/middleware/affinity.go` — 会话亲和，需扩展支持兜底粘性（或复用现有机制）
- `one-api/common/config/config.go` — 系统配置变量声明
- `one-api/model/option.go` — 系统选项加载/更新，`updateOptionMap()` 分发
- `one-api/model/cache.go` — 渠道缓存 `CacheGetSatisfiedChannels()`，获取可用渠道列表
- `one-api/monitor/health.go` — 渠道健康状态 `ShouldFailover()`
- `one-api/controller/relay.go` — 代理转发，需处理模型名替换
- `one-api/web/berry/src/views/DowngradeRules/index.js` — 降级监控页，新增兜底模型配置区域

### Related Documents
- `one-api/ARCHITECTURE-DECISION.md` — 架构决策

### Related Features
- feat-affinity-fallback (已归档) — Fallback 自动亲和机制，兜底粘性可复用其 Redis key 模式
- feat-model-downgrade-strategy (已归档) — 模型降级策略，概念相关但实现层面不同
- feat-channel-failover (已归档) — 渠道故障转移，兜底是故障转移的"最后防线"

## Technical Solution

### 新增系统选项
```go
// common/config/config.go
var FallbackEnabled = false      // 兜底开关
var FallbackChannelId = int64(0) // 兜底渠道 ID
var FallbackModel = ""           // 兜底模型名
```

### Redis Key 设计
- `fallback-affinity:{conversationId}` → `{channelId}:{model}` (TTL: 同 AFFINITY_TTL_SECONDS)
- `fallback-affinity:session:{sessionId}` → `{channelId}:{model}` (TTL: 同 AFFINITY_FALLBACK_TTL_SECONDS)

### 路由逻辑变更 (distributor.go)
```
1. Affinity 中间件（已有逻辑之前）：
   - 查找 fallback-affinity:{conversationId}
   - 若命中 → 设置 SpecificChannelId + FallbackModelOverride
   - 验证渠道可用性和模型支持

2. Distribute 中间件 smartSelectChannel()：
   - 获取目标模型的可用渠道列表
   - 若 FallbackEnabled：
     a. 计算不可用比例 = unhealthy / total
     b. 如果全部不可用 → 路由到兜底
     c. 如果部分不可用 → 按不可用比例概率路由到兜底
     d. 路由到兜底时：设置 SpecificChannelId = FallbackChannelId, 标记 FallbackModelOverride
   - 正常路由流程不变

3. Relay 控制器：
   - 如果 FallbackModelOverride 标记存在 → 替换请求体中的 model 为 FallbackModel
   - 记录 fallback-affinity 粘性映射
```

### 前端变更
在 `DowngradeRules/index.js` 页面顶部新增**兜底模型配置卡片**（位于降级渠道表格上方）：
- "启用兜底模型" Switch (`FallbackEnabled`)
- "兜底渠道 ID" Input (`FallbackChannelId`)
- "兜底模型名称" Input (`FallbackModel`)
- 配置通过 `/api/option/` 读取和保存，与其他系统选项一致

## Acceptance Criteria (Gherkin)

### User Story
作为 AIHub 管理员，我希望配置一个兜底模型，当目标模型的渠道不可用时自动降级到兜底模型，保证服务可用性和会话连续性。

### Scenarios

#### Scenario 1: 配置兜底模型
```gherkin
Given 管理员已登录系统
When 管理员在运营设置中启用"兜底模型"
  And 设置兜底渠道 ID 为 5
  And 设置兜底模型名称为 "gpt-4o-mini"
Then 系统保存配置
  And 后续请求路由时读取该配置
```

#### Scenario 2: 部分渠道不可用时触发兜底
```gherkin
Given 系统已配置兜底模型 (FallbackEnabled=true, FallbackChannelId=5, FallbackModel="gpt-4o-mini")
  And 模型 "claude-3-opus" 有 4 个渠道，其中 2 个 unhealthy
When 用户发送请求 model="claude-3-opus"
Then 系统以约 50% 概率路由到兜底渠道 5 的 "gpt-4o-mini"
  Or 以约 50% 概率路由到正常渠道的 "claude-3-opus"
  And 被路由到兜底的请求，请求体中 model 被替换为 "gpt-4o-mini"
```

#### Scenario 3: 全部渠道不可用时触发兜底
```gherkin
Given 系统已配置兜底模型 (FallbackEnabled=true, FallbackChannelId=5, FallbackModel="gpt-4o-mini")
  And 模型 "claude-3-opus" 的所有渠道均 unhealthy 或禁用
When 用户发送请求 model="claude-3-opus"
Then 系统路由到兜底渠道 5 的 "gpt-4o-mini"
  And 请求体中 model 被替换为 "gpt-4o-mini"
  And Redis 记录 fallback-affinity:{conversationId} → "5:gpt-4o-mini"
```

#### Scenario 4: 会话级兜底粘性
```gherkin
Given 系统已配置兜底模型
  And 会话 "conv-123" 已被路由到兜底模型 (Redis 有 fallback-affinity:conv-123)
When 用户发送会话 "conv-123" 的后续消息 model="claude-3-opus"
Then 系统直接路由到兜底渠道 5 的 "gpt-4o-mini"
  And 不再检查原始模型渠道可用性
```

#### Scenario 5: 兜底渠道本身不可用
```gherkin
Given 系统已配置兜底模型 (FallbackChannelId=5)
  And 兜底渠道 5 本身已被禁用或不可用
When 用户发送请求触发兜底
Then 系统跳过兜底路由，执行正常路由逻辑
  And 日志记录兜底渠道不可用的警告
```

#### Scenario 6: 兜底未配置时无影响
```gherkin
Given 系统未启用兜底模型 (FallbackEnabled=false)
When 用户发送正常请求
Then 路由逻辑完全不受影响，按现有规则执行
```

### UI/Interaction Checkpoints
- 降级监控页顶部新增"兜底模型"配置卡片，与下方降级渠道表格形成层级关系
- 三个字段：启用开关（Switch）、渠道 ID（数字输入）、模型名（文本输入）
- 启用开关关闭时，渠道 ID 和模型名输入框灰化
- 保存时校验：启用状态下渠道 ID 和模型名不能为空
- 卡片样式与现有降级监控页风格一致（MUI Card + Stack）

### General Checklist
- [x] 兜底路由不影响正常路由性能（仅增加一次 Redis 查询）
- [x] 兜底粘性映射 TTL 与现有亲和 TTL 一致
- [x] 兜底渠道不可用时不阻塞正常路由
- [x] 配置变更实时生效（通过 SyncOptions）
