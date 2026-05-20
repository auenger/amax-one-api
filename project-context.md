---
last_updated: '2026-05-20'
version: 3
features_completed: 37
---

# Project Context: AIHub — 企业级 AI 管理平台

> 基于 one-api (Go + Gin) 二开的统一 AI 模型管理平台。包含 Channel 路由、配额监控、并发追踪、模型广场等功能。所有 AI 代理实现代码时须遵守此文件中的关键规则与约定。

---

## Current Status (2026-05-20)

**Phase 1（接入层 MVP）+ Phase 2 核心功能已完成**。37 个 feature 已合并到 main，涵盖：

- Phase 1: monorepo 基础设施、模型注册、鉴权、代理转发、用量计量 (6 features)
- Rebuild: 前端重构 (Berry/MUI)、one-api 深度二开、清理 (3 features)
- 渠道路由: 多渠道亲和路由、故障转移、智能负载均衡 (3 features)
- Claude 对齐: Anthropic 格式兼容 (1 feature)
- 模型广场: 卡片丰富化、平铺布局 (2 features)
- 用量报表: Admin 报表、时间粒度、报表优化 (3 features)
- 配额监控: API 查询、定时刷新、管理面板 (4 features)
- 并发监控: 追踪后端、广场数据对接、日志渠道可见 (4 features)
- 其他: 用户渠道选择、错误透传、门户增强 (7 features)

## Technology Stack

| Category       | Technology                   | Version  | Notes                                  |
| -------------- | ---------------------------- | -------- | -------------------------------------- |
| Language       | Go                           | 1.20+    | 核心 backend (one-api fork)            |
| Framework      | Gin                          | —        | HTTP framework                         |
| ORM            | GORM                         | —        | 支持 PostgreSQL / MySQL / SQLite       |
| Frontend       | React + MUI (Berry theme)    | MUI 5.x  | Material UI，嵌入 Go binary            |
| Charts         | ApexCharts                   | 3.35     | 用量图表                               |
| State          | React Context + Hooks        | —        | —                                      |
| Primary DB     | PostgreSQL                   | 16       | 生产环境                               |
| Cache          | Redis                        | 7        | 并发计数、配额缓存、session            |
| Proxy Engine   | 38 supplier adaptors         | —        | relay/adaptor/ 目录                    |
| Monorepo       | pnpm workspace + Turborepo   | —        | legacy gateway/web (已废弃)            |
| Deployment     | Docker Compose               | —        | PostgreSQL + Redis + one-api           |

## Directory Structure

```
aihub/
├── one-api/                     # 核心引擎 (Go + Gin, fork of songquanpeng/one-api)
│   ├── main.go                  # 入口，GORM 初始化 + Gin 路由
│   ├── controller/              # HTTP 处理器 (channel, token, log, routing, concurrency, report)
│   ├── model/                   # GORM 数据模型 (User, Token, Channel, Log, Ability, Quota)
│   ├── middleware/              # 中间件 (auth, distributor, rate-limit, affinity, cors, request-id)
│   ├── router/                  # 路由注册 (api, relay, web, dashboard)
│   ├── relay/adaptor/           # 38 个供应商适配器 (openai, anthropic, gemini, aws, etc.)
│   ├── service/                 # 业务服务 (Claude 格式转换)
│   ├── monitor/                 # 并发追踪、负载均衡、配额刷新、健康检查
│   ├── common/                  # 通用工具 (config, logger, helper, crypto)
│   └── web/                     # 前端
│       ├── berry/               # Berry 主题 (MUI 5, 活跃开发)
│       │   └── src/
│       │       ├── views/       # 页面 (Dashboard, Channel, Token, Log, ModelMarket, Report, etc.)
│       │       ├── hooks/       # 自定义 hooks (useAuth, useConcurrencyData, useLogin)
│       │       ├── utils/       # 工具 (api, chart, concurrency, quota, common)
│       │       ├── layout/      # 布局组件
│       │       ├── store/       # 状态管理
│       │       └── routes/      # 路由配置
│       ├── default/             # 默认主题 (Semantic UI, 不活跃)
│       ├── air/                 # Air 主题 (不活跃)
│       └── build/               # 构建产物 (Go embed 目标)
├── features/                    # Feature 工作流归档
├── feature-workflow/            # Feature 配置 (config.yaml, queue.yaml)
├── apps/                        # [legacy] 原 monorepo gateway/web (已废弃)
├── packages/                    # [legacy] 原 shared/database (已废弃)
├── docker-compose.yml           # PostgreSQL 16 + Redis 7 + one-api
├── ARCHITECTURE-DECISION.md     # 架构决策记录
└── project-context.md           # 本文件
```

## Architecture

**Pattern**: API Gateway / LLM Proxy (one-api fork)

请求流:

```
Client → Gin Router → Auth Middleware (Token/Key) → Distributor (Channel Selection)
  → Relay Adaptor (Provider-specific) → Provider API (OpenAI/Anthropic/Gemini/AWS/...)
```

### Core Domains

| Domain           | Package             | Description                          |
| ---------------- | ------------------- | ------------------------------------ |
| 认证             | middleware/auth.go  | Token 4 级角色 (Guest/Common/Admin/Root) |
| 渠道路由         | middleware/distributor.go, controller/routing.go | 加权+亲和+故障转移+智能LB |
| 代理转发         | relay/adaptor/      | 38 个供应商适配器                    |
| 并发追踪         | monitor/concurrency.go | Redis 实时并发计数 + REST API     |
| 配额监控         | model/quota.go, monitor/quota-refresh.go | 6 提供商适配器 + Redis 缓存 |
| 用量计量         | model/log.go        | Token 消耗记录 + 报表 API           |
| 模型广场         | views/ModelMarket/  | 前端模型卡片 + 并发/配额展示        |

## Critical Rules

### Must Follow

- **Go embed 前端**: 前端改动后必须 `cd one-api && ./rebuild.sh` 重新构建（`go:embed` 编译时嵌入）
- **Berry 主题**: 所有前端开发在 `web/berry/`，其他主题 (default/air) 不活跃
- **MUI 组件**: 使用 Material UI 5 组件库，不引入其他 UI 库
- **GORM 跨数据库**: SQL 需兼容 PostgreSQL/MySQL/SQLite（使用 `common.UsingPostgreSQL` 判断）
- **Redis 缓存**: 并发数据、配额数据通过 Redis 缓存，注意 TTL 和 key 格式
- **Channel 分组**: 用户通过 group 关联可用 channel，Ability 表管理 group-model-channel 映射
- **错误格式**: API 返回 `{ success: bool, message: string }` 标准 JSON 格式
- **API 路径**: 管理 API 在 `/api/` 下，代理转发在 `/v1/` 下
- **上游错误**: 透传上游错误信息（feat-error-passthrough），不吞掉原始错误

### Must Avoid

- API Key 硬编码或明文存储
- 跳过并发计数更新（request 开始 +1，结束 -1）
- 在 distributor 中直接返回 provider 错误而不包装
- 修改 `web/build/` 目录内容（构建产物，由 rebuild.sh 生成）
- 混用前端主题（不要修改 default/air 主题文件）
- 忽略 GORM 迁移兼容性（生产用 PostgreSQL，开发可 SQLite）

## Conventions

| Aspect          | Convention                                     |
| --------------- | ---------------------------------------------- |
| Language        | Go (backend), JavaScript/JSX (frontend)        |
| Backend Style   | gofmt + Go 标准（无需 prettier/eslint）        |
| Frontend Style  | MUI sx prop / makeStyles，函数组件 + hooks     |
| API Style       | RESTful JSON `{ success, message, data }`      |
| API Prefix      | `/api/` 管理 API, `/v1/` 代理转发              |
| Auth            | Bearer Token / Cookie session                  |
| Pagination      | 页码分页 (page + page_size)                    |
| Logging         | Go 标准日志 + GORM logger                      |
| State           | React Context + 自定义 hooks                   |
| Testing         | Go testing package (one-api), Vitest (legacy)  |
| Build           | `./rebuild.sh` 一键构建（前端 + Go 编译）      |
| Embed           | `//go:embed web/build/*` 嵌入前端产物          |

## Security

- **Token Auth**: 4 级角色，User 数据隔离
- **Channel Budget**: 按渠道设置用量上限，超限自动切换
- **Rate Limit**: 内置请求限流中间件
- **CORS**: 可配置跨域
- **审批流**: 用户申请 Token，Admin 审批
- **Provider Key**: 渠道 API Key 在数据库加密存储

## Feature History

| Date       | Feature                           | Size | Value |
| ---------- | --------------------------------- | ---- | ----- |
| 2026-05-20 | feat-log-channel-visibility       | S    | 1     |
| 2026-05-20 | feat-channel-concurrency (parent) | L    | 3     |
| 2026-05-19 | feat-concurrency-market           | S    | 1     |
| 2026-05-19 | feat-concurrency-tracker          | S    | 1     |
| 2026-05-19 | feat-provider-quota-monitor (par) | L    | 6     |
| 2026-05-19 | feat-provider-quota-ui            | S    | 2     |
| 2026-05-19 | feat-provider-quota-refresh       | S    | 2     |
| 2026-05-19 | feat-provider-quota-api           | S    | 2     |
| 2026-05-19 | feat-marketplace-flat-layout      | M    | 3     |
| 2026-05-19 | feat-error-passthrough            | S    | 2     |
| 2026-05-19 | feat-usage-chart-granularity      | M    | 2     |
| 2026-05-19 | feat-user-channel-select          | M    | 2     |
| 2026-05-19 | feat-marketplace-card-enhance     | S    | 2     |
| 2026-05-19 | feat-usage-report-v2              | S    | 2     |
| 2026-05-19 | feat-portal-pages-enhance (par)   | L    | 4     |
| 2026-05-18 | feat-usage-report                 | M    | 2     |
| 2026-05-18 | feat-channel-routing (parent)     | L    | 8     |
| 2026-05-18 | feat-model-marketplace            | S    | 1     |
| 2026-05-18 | feat-claude-parity                | S    | 2     |

## References

| Category     | Resource                                        |
| ------------ | ----------------------------------------------- |
| Upstream     | github.com/songquanpeng/one-api (MIT License)  |
| Fork Base    | github.com/Calcium-Ion/new-api (AGPL-3.0)       |
| Frontend     | Berry Theme (MUI 5 Dashboard)                  |
| Adaptors     | OpenAI, Anthropic, Gemini, AWS, Azure, 38 total |

## Update Log

- 2026-05-20: v3 — 全面重建，反映 one-api Go 后端架构，37 features 完成，Berry 前端
- 2026-05-12: v2 — Phase 1 完成（6 features merged），更新目录结构和实际代码架构
- 2026-05-07: v1 — 初始 project-context 创建，基于 neuro-syntax.config.json
