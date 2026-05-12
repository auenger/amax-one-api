# Spec Review Report: Phase 1 能力覆盖度

## Review Summary
- **Date**: 2026-05-12
- **Review Type**: 跨 Feature 能力覆盖度审查
- **Target Capabilities**: 注册、申请 Key、申请模型、路由协议、API 转发、Tokens 统计
- **Result**: 已修复所有 Critical 和 Warning 问题

## Issues Found & Fixed

### Critical Issues (已修复)

| ID | 问题 | 修复 |
|----|------|------|
| C1 | Provider 真实 API Key 注册流程缺失 | model-registry 新增 ProviderKey 数据模型 + CRUD API + AES-256-GCM 加密 + new-api 同步 |
| C2 | 管理端点无鉴权 (依赖未实现的 OIDC) | auth-pool 新增 Admin API Key 认证 (环境变量)，端点分三类保护 |
| C3 | project-init 未部署 new-api | Docker Compose 新增 new-api 容器 + 环境变量 + healthcheck |

### Warnings (已修复)

| ID | 问题 | 修复 |
|----|------|------|
| W1 | VK 无 Provider/Model 绑定 | 标记为后续 Phase，Phase 1 全量访问 |
| W2 | RoutingPolicy 数据模型未实际执行 | 移除 RoutingPolicy，别名为 1:1 映射，路由交给 new-api |

## Capability Coverage (修复后)

| # | 能力 | 状态 | 关键 Feature + API |
|---|------|------|--------------------|
| 1 | 注册 (Provider) | ✅ | model-registry: POST /v1/providers + POST /v1/providers/:id/keys |
| 2 | 申请 Key (VK) | ✅ | auth-pool: POST /v1/keys (Admin API Key 保护) |
| 3 | 申请模型 | ✅ | model-registry: POST /v1/models + GET /v1/models |
| 4 | 路由协议 | ✅ | model-registry: 别名 1:1 映射 + resolveModel() |
| 5 | API 转发 | ✅ | openai-proxy: 透传到 new-api (Chat/Embeddings/Models) |
| 6 | Tokens 统计 | ✅ | usage-metering: recordUsage + GET /v1/usage + GET /v1/usage/summary |

## Files Modified

1. `features/pending-feat-phase1-model-registry/spec.md` — 新增 ProviderKey + 移除 RoutingPolicy
2. `features/pending-feat-phase1-model-registry/task.md` — 同步更新任务
3. `features/pending-feat-phase1-auth-pool/spec.md` — Admin API Key 替代 OIDC
4. `features/pending-feat-project-init/spec.md` — new-api Docker Compose + 环境变量
5. `features/pending-feat-phase1-gateway/spec.md` — 更新职责表和描述

## End-to-End Flow (修复后)

```
1. Admin 注册 Provider + API Keys (Admin API Key 保护)
   → POST /v1/providers (含 keys)
   → 同步到 new-api Channel

2. Admin 注册模型
   → POST /v1/models
   → 同步到 new-api Channel models

3. Admin 配置别名
   → POST /v1/aliases (1:1 映射)

4. Admin 创建 Virtual Key
   → POST /v1/keys (Admin API Key 保护)
   → VK 前缀: aihub-{name}-{random}

5. Developer 发起请求
   → POST /v1/chat/completions (VK 认证)
   → Fastify: VK 验证 → 别名解析 → Budget 检查 → 替换 Auth → 透传 new-api
   → new-api: 协议转换 → Key 池化 → Provider API
   → 响应返回 + usage 提取记录

6. Admin 查看用量
   → GET /v1/usage/summary
```
