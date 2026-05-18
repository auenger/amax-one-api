# Feature: feat-channel-smart-lb 智能负载均衡

## Basic Information
- **ID**: feat-channel-smart-lb
- **Name**: 智能负载均衡
- **Priority**: 70
- **Size**: S
- **Dependencies**: [feat-channel-affinity, feat-channel-failover]
- **Parent**: feat-channel-routing
- **Children**: []
- **Created**: 2026-05-18

## Description
在会话亲和和故障转移基础上，实现基于实时指标的智能负载均衡路由：
1. **指标采集** — 持续采集每个渠道的延迟（P50/P95/P99）、成功率、剩余配额
2. **智能选路** — 新对话首次请求时，基于综合评分选择最优渠道
3. **权重自适应** — 根据渠道实时表现动态调整路由权重
4. **可配置策略** — 支持多种路由策略（延迟优先、成本优先、均匀分配）

## User Value Points
1. **性能优化**: 新对话自动选择当前最优渠道，降低平均响应延迟
2. **资源最大化**: 根据实时负载和配额动态分配流量，避免某渠道过载而其他闲置
3. **策略灵活性**: 管理员可按业务需求选择不同的路由策略

## Context Analysis
### Reference Code
- `one-api/model/cache.go` — 现有加权随机选择（静态权重）
- `one-api/model/ability.go` — Ability 渠道映射
- `feat-channel-affinity` — 亲和路由（前置依赖）
- `feat-channel-failover` — 渠道健康状态（前置依赖）

### Related Features
- feat-channel-affinity (前置依赖)
- feat-channel-failover (前置依赖)

## Technical Solution

### 方案概述
在 Gateway 层维护渠道性能指标，替换 one-api 的静态加权随机为基于实时指标的智能选路。

### 指标采集
```
每次请求完成后（异步 fire-and-forget）:
  → 记录: channel_id, latency_ms, success/error, tokens_used
  → 更新 Redis 滑动窗口指标:
    - channel:metrics:{channel_id}:latency (sorted set, 5min window)
    - channel:metrics:{channel_id}:success_rate (counter, 5min window)
    - channel:metrics:{channel_id}:tokens_used (counter, current period)
```

### 渠道评分模型
```
score = w1 * latency_score + w2 * reliability_score + w3 * quota_score

其中:
  latency_score = 1 - (p95_latency / max_acceptable_latency)
  reliability_score = success_rate (0-1)
  quota_score = remaining_quota / total_quota (0-1)

默认权重: w1=0.4, w2=0.4, w3=0.2
```

### 路由策略
| 策略 | 说明 | 评分侧重 |
|------|------|----------|
| `balanced` (默认) | 综合评分 | w1=0.4, w2=0.4, w3=0.2 |
| `latency-first` | 延迟优先 | w1=0.7, w2=0.2, w3=0.1 |
| `cost-first` | 成本优先（倾向低配额消耗渠道） | w1=0.1, w2=0.2, w3=0.7 |
| `round-robin` | 均匀分配 | 不使用评分，轮询选择 |

### 选路流程
```
新对话首次请求:
  → 查询模型对应的所有 Healthy 渠道
  → 计算每个渠道的综合评分
  → 加权随机选择（评分越高，选中概率越大）
  → 建立亲和映射

已有亲和映射的请求:
  → 走 feat-channel-affinity 逻辑
  → 如渠道 Degraded，触发重选时使用智能评分
```

### 管理接口
- `GET /v1/admin/channels/metrics` — 查看所有渠道实时指标
- `PUT /v1/admin/routing/strategy` — 设置路由策略

## Acceptance Criteria (Gherkin)
### User Story
作为平台管理员，我希望系统能根据渠道的实际表现自动分配流量，在保证服务质量的同时最大化资源利用率。

### Scenarios (Given/When/Then)

#### Scenario 1: 新对话自动选择最优渠道
```gherkin
Given 渠道 A 的 P95 延迟为 200ms，成功率 99%
And 渠道 B 的 P95 延迟为 500ms，成功率 95%
And 路由策略为 balanced
When 新对话 conv-456 发送首次请求
Then 渠道 A 的综合评分高于渠道 B
And conv-456 被路由到渠道 A（高概率）
```

#### Scenario 2: 延迟优先策略
```gherkin
Given 路由策略设置为 latency-first
And 渠道 A 延迟低但配额少
And 渠道 B 延迟高但配额多
When 新对话发送首次请求
Then 倾向选择延迟更低的渠道 A
```

#### Scenario 3: 指标驱动的权重自适应
```gherkin
Given 渠道 A 和渠道 B 初始评分相近
When 渠道 A 近 5 分钟错误率上升
Then 渠道 A 的评分自动降低
And 新对话倾向于被路由到渠道 B
```

#### Scenario 4: 查看渠道指标
```gherkin
Given 系统已运行并处理了若干请求
When 管理员请求 GET /v1/admin/channels/metrics
Then 返回每个渠道的 P50/P95/P99 延迟
And 返回每个渠道的成功率
And 返回每个渠道的 token 消耗统计
```

#### Scenario 5: 切换路由策略
```gherkin
Given 当前路由策略为 balanced
When 管理员请求 PUT /v1/admin/routing/strategy { "strategy": "latency-first" }
Then 路由策略切换为 latency-first
And 后续新对话选路使用新的策略权重
```

### General Checklist
- [x] 渠道性能指标采集与存储
- [x] 渠道综合评分模型
- [x] 多路由策略实现
- [x] 管理接口（指标查询、策略设置）
- [x] 与亲和路由和故障转移集成

## Merge Record
- **Completed**: 2026-05-18
- **Branch**: feature/channel-smart-lb
- **Merge Commit**: 2964872
- **Archive Tag**: feat-channel-smart-lb-20260518
- **Conflict**: none
- **Verification**: passed (37 tests, 5/5 Gherkin scenarios)
- **Duration**: ~20min
- **Commits**: 1
- **Files Changed**: 9
