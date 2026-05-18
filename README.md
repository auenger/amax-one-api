# AIHub — 企业级 AI 管理平台

基于 [one-api](https://github.com/songquanpeng/one-api)（MIT License）二开的统一 AI 模型管理平台。

## 架构

```
┌──────────────────────────┐
│  内置管理后台              │  React + Semantic UI
│  Channel / Token / Log   │
└────────────┬─────────────┘
             │ REST API
             ▼
┌──────────────────────────┐
│  one-api fork (Go + Gin)  │  MIT License
│  Token 鉴权 (4级角色)      │
│  Channel 路由 (加权+优先级) │
│  38 供应商代理转发          │
│  计费与用量统计             │
│  + 审批流 / Channel 预算   │  ← 二开增强
└────────────┬─────────────┘
             │
             ▼
  OpenAI / Anthropic / Gemini / AWS / 百度 / 阿里 / ...
```

## 快速开始

### 前置要求

- Docker & Docker Compose
- Go 1.20+（本地开发 one-api）
- Node.js 16+（本地开发前端）

### 启动（Docker）

```bash
# 启动所有服务（one-api + PostgreSQL + Redis）
docker compose up -d

# 停止
docker compose down
```

one-api 运行在 `http://localhost:3000`，默认 root token: `sk-aihub-root-token-change-me`（生产环境务必修改）。

### 本地开发（推荐，方便二开调试）

```bash
# 1. 只启动基础设施
docker compose up -d postgres redis

# 2. 源码运行 one-api
cd one-api
SQL_DSN="postgres://aihub:aihub@localhost:5432/aihub?sslmode=disable" \
REDIS_CONN_STRING="redis://localhost:6379" \
MEMORY_CACHE_ENABLED=true \
go run main.go

# 3. 前端开发（另一个终端）
cd one-api/web/default
npm install && npm start
```

## 项目结构

```
aihub/
├── one-api/                # 核心引擎（Go + Gin）
│   ├── controller/         # HTTP 处理器
│   ├── model/              # GORM 数据模型
│   ├── middleware/          # 中间件（auth, distributor, rate-limit）
│   ├── router/             # 路由注册
│   ├── relay/adaptor/      # 38 个供应商适配器
│   ├── service/            # 业务服务（Claude 格式转换）
│   ├── common/             # 通用工具
│   └── web/                # 内置前端（3 个主题）
├── features/               # Feature 工作流归档
├── feature-workflow/       # Feature 配置
├── docker-compose.yml      # 基础设施编排
├── ARCHITECTURE-DECISION.md  # 架构决策记录
└── project-context.md      # 项目上下文
```

## 功能

- **Channel 管理** — 配置 AI 供应商渠道（38 个供应商适配器）
- **Token 管理** — 创建和管理 API 密钥，支持额度限制、模型限制、过期设置
- **用户角色** — 4 级角色（Guest / Common / Admin / Root），用户数据隔离
- **审批流** — 用户申请 Token，Admin 审批（二开增强）
- **用量日志** — 查看请求日志和 Token 消耗，用户只看自己的
- **仪表盘** — 使用统计和关键指标
- **模型路由** — 加权随机 + 优先级降级 + 自动重试（二开增强）
- **Channel 预算** — 按渠道设置用量上限，超限自动切换（二开增强）
- **Claude 格式** — 原生支持 Anthropic Messages API（二开增强）

## 技术栈

| 层       | 技术                              |
| -------- | --------------------------------- |
| 引擎     | one-api fork (Go + Gin, MIT)     |
| 前端     | React + Semantic UI（内置）       |
| 数据库   | PostgreSQL 16                    |
| 缓存     | Redis 7                          |
| 部署     | Docker Compose                   |

## 相关项目

- [one-api](https://github.com/songquanpeng/one-api) — 核心引擎上游（MIT License）
- [new-api](https://github.com/Calcium-Ion/new-api) — one-api 的重度 fork（AGPL-3.0）

## License

Private（one-api fork 部分遵循 MIT License，保留原始版权声明）
