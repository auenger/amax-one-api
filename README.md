# ModelHub — 企业级 AI 管理平台

独立开发的统一 AI 模型管理平台，提供多模型代理转发、智能路由、配额监控等功能。

## 架构

```
┌──────────────────────────────────┐
│  Berry 前端 (React + MUI 5)       │  管理后台 / 模型广场 / 用量报表
│  嵌入 Go binary (go:embed)        │
└────────────┬─────────────────────┘
             │ REST API (/api/*)
             ▼
┌──────────────────────────────────┐
│  ModelHub 后端 (Go + Gin)         │
│  Token 鉴权 (4级角色)             │
│  Channel 路由 (亲和+故障转移+LB)  │
│  38 供应商代理转发                 │
│  并发追踪 + 配额监控              │
│  审批流 / Channel 预算 / 错误透传 │
└────────────┬─────────────────────┘
             │
             ▼
  OpenAI / Anthropic / Gemini / AWS / 百度 / 阿里 / 腾讯 / 38 providers
```

## 快速开始

### 前置要求

- Docker & Docker Compose
- Go 1.20+（本地开发）
- Node.js 16+（前端开发）

### 启动（Docker）

```bash
docker compose up -d
```

ModelHub 运行在 `http://localhost:3000`，默认 root 密码: `123456`（生产环境务必修改）。

### 本地开发

```bash
# 1. 只启动基础设施
docker compose up -d redis db

# 2. 一键构建并运行（推荐）
cd one-api && ./rebuild.sh && ./bin/aihub

# 3. 前端开发（热更新）
cd one-api/web/berry && npm start
```

## 项目结构

```
modelhub/
├── one-api/                    # 核心引擎 (Go + Gin)
│   ├── controller/             # HTTP 处理器
│   │   ├── channel.go          #   Channel CRUD + 预算
│   │   ├── channel-quota.go    #   配额查询 API
│   │   ├── concurrency.go      #   并发数据 API
│   │   ├── routing.go          #   路由策略 API
│   │   ├── token.go            #   Token 管理
│   │   ├── token_request.go    #   审批流
│   │   ├── report.go           #   用量报表 API
│   │   └── ...                 #   log, user, model, billing
│   ├── model/                  # GORM 数据模型
│   │   ├── channel.go          #   Channel + Affinity
│   │   ├── quota.go            #   配额结构体 + Redis 缓存
│   │   ├── ability.go          #   Group-Model-Channel 映射
│   │   └── ...
│   ├── middleware/              # 中间件
│   │   ├── auth.go             #   Token 鉴权
│   │   ├── distributor.go      #   Channel 选择 (加权+亲和)
│   │   ├── rate-limit.go       #   请求限流
│   │   └── ...
│   ├── monitor/                # 监控服务
│   │   ├── concurrency.go      #   Redis 实时并发计数
│   │   ├── loadbalancer.go     #   智能负载均衡
│   │   ├── quota-refresh.go    #   配额定时刷新
│   │   └── health.go           #   健康检查
│   ├── relay/adaptor/          # 38 个供应商适配器
│   ├── service/                # 业务服务 (Claude 格式转换)
│   ├── router/                 # 路由注册
│   ├── common/                 # 通用工具
│   └── web/                    # 前端
│       ├── berry/              #   Berry (MUI 5, 唯一前端)
│       └── build/              #   构建产物 (Go embed 目标)
├── docker-compose.yml          # MySQL + Redis + aihub
├── features/                   # Feature 工作流归档
├── feature-workflow/           # Feature 配置
└── docs/                       # 项目文档
```

## 功能

- **Channel 管理** — 38 个供应商适配器，加权随机路由
- **Token 管理** — API 密钥管理，额度限制，模型限制，过期设置
- **用户角色** — 4 级角色（Guest / Common / Admin / Root），数据隔离
- **用量日志** — 请求日志和 Token 消耗
- **智能路由** — 渠道亲和性 + 故障转移 + 智能负载均衡 (基于并发/配额)
- **并发追踪** — Redis 实时并发计数，模型广场并发负载展示
- **配额监控** — 6 提供商配额 API 适配器，Redis 缓存，管理面板
- **模型广场** — 前端模型卡片，展示渠道/并发/配额信息
- **审批流** — 用户申请 Token，Admin 审批
- **Channel 预算** — 按渠道设置用量上限，超限自动切换
- **Claude 格式** — 原生 Anthropic Messages API 支持
- **用量报表** — Admin 报表页，时间粒度切换（小时/天）
- **错误透传** — 保留上游原始错误信息
- **MCP 集成** — 内置 Minimax MCP 和智谱 MCP 服务

## 技术栈

| 层       | 技术                                   |
| -------- | -------------------------------------- |
| 引擎     | Go + Gin                               |
| 前端     | React + MUI 5 (Berry 主题)            |
| 数据库   | PostgreSQL 16 (生产) / SQLite (开发)   |
| 缓存     | Redis 7                                |
| 部署     | Docker Compose                         |

## 本地构建

```bash
cd one-api && ./rebuild.sh   # 前端构建 + 产物拷贝 + Go 编译，三步合一
./bin/aihub                  # 启动服务
```

关键点：
- 前端使用 Berry 主题 (`web/berry/`)，MUI 5 组件库
- `go:embed` 编译时嵌入前端产物，前端改动后必须重新编译
- `rebuild.sh` 自动处理构建步骤（`npm run build` → 拷贝产物 → `go build`）

## License

Private
