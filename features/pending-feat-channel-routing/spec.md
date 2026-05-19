# Feature: feat-channel-routing 多渠道智能路由

## Basic Information
- **ID**: feat-channel-routing
- **Name**: 多渠道智能路由
- **Priority**: 70
- **Size**: L (split)
- **Dependencies**: none
- **Parent**: null
- **Children**: [feat-channel-affinity, feat-channel-failover, feat-channel-smart-lb]
- **Created**: 2026-05-18

## Description
当同一模型存在于多个渠道（Channel）时，提供智能路由能力：
1. 会话亲和 — 同一 conversation 的请求固定路由到同一渠道
2. 故障转移 — 渠道不可用/额度不足时自动切换到备选渠道
3. 智能负载均衡 — 基于延迟、成功率、剩余配额等指标做路由决策

## User Value Points
1. **会话亲和**: 同一对话固定到同一渠道，保证上下文连贯性和日志可追溯
2. **故障转移**: 渠道故障时用户无感知切换，保障服务可用性
3. **智能负载均衡**: 根据实时指标动态调整流量分配，最大化资源利用率

## Context Analysis
### Reference Code
- `one-api/middleware/distributor.go` — 当前渠道选择逻辑
- `one-api/model/cache.go` — 加权随机选择算法 (`weightedRandomSelect`)
- `one-api/controller/relay.go` — 重试与故障转移
- `one-api/monitor/channel.go` — 渠道自动禁用
- `apps/gateway/src/services/proxy.ts` — Gateway 代理转发

### Related Documents
- ARCHITECTURE-DECISION.md — 架构决策记录

### Related Features
- feat-phase1-openai-proxy — 代理转发基础
- feat-claude-parity — 协议对齐（已归档）

## Technical Solution
<!-- Split parent — see children for implementation details -->

## Acceptance Criteria (Gherkin)
### User Story
作为一个平台用户，我希望当我使用同一模型发送多个请求时，系统能智能地选择最优渠道，并在渠道故障时自动切换，以确保服务稳定可靠。

### Scenarios (Given/When/Then)
<!-- See children features for detailed scenarios -->

### General Checklist
- [ ] 所有子 Feature 完成并通过验收
- [ ] 集成测试覆盖完整路由链路
- [ ] 性能测试：路由决策延迟 < 5ms
