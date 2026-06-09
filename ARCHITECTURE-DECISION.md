# ModelHub 架构决策：Go + Gin 独立开发

> 决策日期：2026-05-13

## 背景

AIHub Phase 1 使用自建 Gateway（Fastify/TypeScript）+ new-api（Go）双层架构。经评估，Gateway 层与 new-api 功能大量重叠，属于冗余设计。

经过对比三条技术路线，决定采用 **one-api 二开** 方案。

## 技术路线对比

| | one-api 二开 (Go) | new-api 直接用 | Rust 重写 |
|---|---|---|---|
| License | **MIT（闭源商用 OK）** | AGPL-3.0（必须开源） | 完全自主 |
| 基础代码 | 22,179 LOC | 108,155 LOC | 0 |
| 需额外写 | ~3,600 LOC | 0 | ~14,000 LOC |
| 开发时间 | 2-3 周 | 立即 | 4-8 周 |
| 代码掌控 | 容易（22K 全部掌握） | 困难（108K 大量非核心） | 自己写的 |
| 商业安全 | 完全安全 | 需商业授权 | 完全安全 |

## 选择 one-api 的理由

1. **MIT 许可证** — 可自由修改、商用、闭源，仅需保留署名
2. **代码量小** — 22K LOC Go 代码，一个人可在几天内完全读透
3. **核心能力齐全** — Token 鉴权、Channel 路由、计费、SSE 流式、38 个供应商适配器
4. **new-api 是其 fork** — new-api 的所有核心能力都源自 one-api，数据库 schema 兼容

## one-api 核心能力（已具备）

| 能力 | 状态 | 说明 |
|------|:---:|------|
| 管理员/用户角色 (4级) | ✅ | Guest / Common / Admin / Root |
| 用户只看自己用量 | ✅ | `/api/log/self` 自动按 userId 过滤 |
| Token 绑定指定模型 | ✅ | `model_limits_enabled` + `model_limits` |
| Token 额度限制 | ✅ | `remain_quota` + `unlimited_quota` |
| Token 分组隔离 | ✅ | Token `group` 字段，Channel 也绑 group |
| SSE 流式代理 | ✅ | 支持所有适配器的流式响应 |
| 38 个供应商适配器 | ✅ | OpenAI、Claude、Gemini、AWS、百度、阿里等 |
| 模型映射 | ✅ | Channel 级 `model_mapping` |
| 渠道健康检测 | ✅ | 自动禁用/恢复 |

## 需要补充的能力

| 模块 | 估算 LOC | 优先级 |
|------|---------|:---:|
| 加权随机 + 优先级路由 | ~400 | P0 |
| 增强重试/降级逻辑 | ~300 | P0 |
| OpenAI ↔ Claude 双向格式转换 | ~1,000 | P0 |
| Channel 级别用量上限 | ~400 | P1 |
| 用户申请 Token 审批流 | ~500 | P1 |
| 前端管理页面适配 | ~1,000 | P0 |
| **总计** | **~3,600** | |

## 目标架构

```
┌─────────────────────────────────────┐
│       apps/web (Next.js 14)          │
│  Channel / Token / Log / Dashboard   │
└──────────────┬──────────────────────┘
               │ REST API
               ▼
┌─────────────────────────────────────┐
│     one-api (AIHub Fork, Go + Gin)   │
│                                      │
│  Token 鉴权 (Bearer + Session)       │
│  Channel 路由 (优先级 + 加权随机)     │
│  代理转发 (38+ 供应商适配器)          │
│  计费系统 (额度 + 模型倍率)           │
│  审批流程 (用户申请 → Admin 审批)     │
│  Channel 预算限制                     │
└──────────────┬──────────────────────┘
               │
               ▼
    OpenAI / Anthropic / Gemini / AWS / 百度 / 阿里 / ...
```

## one-api 源码结构（关键路径）

```
one-api/
├── controller/         # HTTP 处理 (channel, token, log, user, billing) — 5,043 LOC
├── model/              # 数据模型 (channel, token, user, log, ability) — 2,522 LOC
├── middleware/          # 中间件 (auth, distributor, rate-limit, cors) — 680 LOC
├── router/             # 路由注册 — 279 LOC
├── relay/              # 代理转发引擎 — 12,612 LOC
│   ├── adaptor/        # 38 个供应商适配器 — 9,951 LOC
│   │   ├── openai/     # OpenAI (核心)
│   │   ├── anthropic/  # Claude (核心)
│   │   ├── gemini/     # Gemini
│   │   ├── aws/        # AWS Bedrock
│   │   ├── ali/        # 阿里云
│   │   └── ...         # 其他 33 个
│   └── billing.go      # 计费逻辑
├── common/             # 通用工具 (常量、加密、数据库、日志) — ~2,500 LOC
├── web/                # 前端 (React, 3 个主题)
├── main.go             # 入口
├── go.mod              # Go 依赖
└── LICENSE             # MIT
```

## 实施计划

### Phase 1：Fork + 基础搭建（1 周）

1. Fork one-api 到 AIHub 组织
2. 搭建 Go 开发环境，确保本地编译运行
3. 移除不需要的前端主题（berry、air），保留 default
4. 配置 PostgreSQL + Redis docker-compose
5. 确认所有 38 个适配器可正常工作

### Phase 2：核心增强（1 周）

1. 加权随机路由（修改 `middleware/distributor.go`）
2. 优先级降级重试（修改 relay 重试逻辑）
3. OpenAI ↔ Claude 双向格式转换（新增 `service/convert.go`）

### Phase 3：业务功能（1 周）

1. Channel 级别用量上限（修改 `model/channel.go` + 计费逻辑）
2. 用户申请 Token 审批流（新增 controller + model）
3. 前端管理页面适配（对接新的审批 API）

### Phase 4：前端整合（1 周）

1. apps/web 的 api-client 重写（从调 Gateway 改为调 one-api）
2. 移除 apps/gateway + packages/database + packages/shared
3. docker-compose 简化

## 参考资料

- [one-api GitHub](https://github.com/songquanpeng/one-api) — MIT License
- [new-api GitHub](https://github.com/Calcium-Ion/new-api) — AGPL-3.0（one-api 的 fork）
- [one-api 本地开发文档](https://github.com/songquanpeng/one-api#local-development)
