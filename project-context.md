---
last_updated: '2026-06-09'
version: 5
features_completed: 37
---

# Project Context: ModelHub — 企业级 AI 管理平台

> 独立开发的统一 AI 模型管理平台。包含 Channel 路由、配额监控、并发追踪、模型广场等功能。所有 AI 代理实现代码时须遵守此文件中的关键规则与约定。

---

## Current Status (2026-06-09)

**品牌重塑完成**：项目已从 one-api fork 独立为 ModelHub 品牌。Go 模块路径为 `github.com/yzw/aihub`，二进制名 `aihub`，前端品牌 "ModelHub"。37 个 feature 已合并到 main。目录已重命名为 `aihub/`，前端目录为 `web/web/`。

## Technology Stack

| Category       | Technology                   | Version  | Notes                                  |
| -------------- | ---------------------------- | -------- | -------------------------------------- |
| Language       | Go                           | 1.20+    | 核心 backend                           |
| Framework      | Gin                          | —        | HTTP framework                         |
| ORM            | GORM                         | —        | 支持 PostgreSQL / MySQL / SQLite       |
| Frontend       | React + MUI 5               | MUI 5.x  | Material UI，嵌入 Go binary            |
| Charts         | ApexCharts                   | 3.35     | 用量图表                               |
| State          | React Context + Hooks        | —        | —                                      |
| Primary DB     | PostgreSQL                   | 16       | 生产环境                               |
| Cache          | Redis                        | 7        | 并发计数、配额缓存、session            |
| Proxy Engine   | 38 supplier adaptors         | —        | relay/adaptor/ 目录                    |
| Deployment     | Docker Compose               | —        | PostgreSQL/MySQL + Redis + aihub       |

## Directory Structure

```
modelhub/
├── aihub/                       # 核心引擎 (Go + Gin)
│   ├── main.go                  # 入口，GORM 初始化 + Gin 路由
│   ├── controller/              # HTTP 处理器
│   ├── model/                   # GORM 数据模型
│   ├── middleware/              # 中间件
│   ├── router/                  # 路由注册
│   ├── relay/adaptor/           # 38 个供应商适配器
│   ├── service/                 # 业务服务
│   ├── monitor/                 # 并发追踪、负载均衡、配额刷新
│   ├── common/                  # 通用工具
│   └── web/
│       └── web/                 # 前端源码 (MUI 5, 唯一前端)
├── features/                    # Feature 工作流归档
├── feature-workflow/            # Feature 配置
├── docker-compose.yml           # PostgreSQL + Redis + aihub
└── CLAUDE.md                    # Claude Code 指引
```

## Architecture

**Pattern**: API Gateway / LLM Proxy

请求流:

```
Client → Gin Router → Auth Middleware (Token/Key) → Distributor (Channel Selection)
  → Relay Adaptor (Provider-specific) → Provider API
```

## Critical Rules

### Must Follow

- **Go embed 前端**: 前端改动后必须 `cd aihub && ./rebuild.sh` 重新构建
- **前端开发**: 所有前端开发在 `web/web/`
- **MUI 组件**: 使用 Material UI 5 组件库，不引入其他 UI 库
- **GORM 跨数据库**: SQL 需兼容 PostgreSQL/MySQL/SQLite
- **Redis 缓存**: 并发数据、配额数据通过 Redis 缓存
- **Channel 分组**: 用户通过 group 关联可用 channel
- **错误格式**: API 返回 `{ success: bool, message: string }` 标准 JSON 格式
- **API 路径**: 管理 API 在 `/api/` 下，代理转发在 `/v1/` 下

### Must Avoid

- API Key 硬编码或明文存储
- 跳过并发计数更新（request 开始 +1，结束 -1）
- 修改 `web/build/` 目录内容（构建产物，由 rebuild.sh 生成）
- 忽略 GORM 迁移兼容性（生产用 PostgreSQL，开发可 SQLite）

## Conventions

| Aspect          | Convention                                     |
| --------------- | ---------------------------------------------- |
| Language        | Go (backend), JavaScript/JSX (frontend)        |
| Backend Style   | gofmt + Go 标准                                |
| Frontend Style  | MUI sx prop / makeStyles，函数组件 + hooks     |
| API Style       | RESTful JSON `{ success, message, data }`      |
| API Prefix      | `/api/` 管理 API, `/v1/` 代理转发              |
| Auth            | Bearer Token / Cookie session                  |
| Pagination      | 页码分页 (page + page_size)                    |
| Build           | `./rebuild.sh` 一键构建（前端 + Go 编译）      |
| Embed           | `//go:embed web/build/*` 嵌入前端产物          |
| Binary          | `aihub`                                        |
| Module          | `github.com/yzw/aihub`                        |

## Update Log

- 2026-06-09: v5 — 目录重命名 one-api→aihub, berry→web，全面统一品牌
- 2026-06-09: v4 — ModelHub 品牌重塑，模块路径改为 github.com/yzw/aihub，删除废弃目录
- 2026-05-20: v3 — 全面重建，反映 one-api Go 后端架构，37 features 完成
- 2026-05-12: v2 — Phase 1 完成（6 features merged）
- 2026-05-07: v1 — 初始 project-context 创建
