# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ModelHub — 企业级 AI 管理平台，独立开发的 Go + Gin 后端 + React (MUI 5) 前端。提供 38 供应商代理转发、Token 鉴权（4 级角色）、智能渠道路由、并发追踪、配额监控、模型广场、用量报表等功能。

前端使用 MUI 5 主题，通过 `go:embed` 嵌入 Go 二进制。

## Project Structure

核心代码在 `aihub/` 目录：

- **`aihub/controller/`** — HTTP 处理器 (channel, token, log, routing, concurrency, report, billing)
- **`aihub/model/`** — GORM 数据模型 (User, Token, Channel, Log, Ability, Quota)
- **`aihub/middleware/`** — 中间件 (auth, distributor, rate-limit, affinity, cors, request-id)
- **`aihub/router/`** — 路由注册 (api.go, relay.go, web.go)
- **`aihub/relay/adaptor/`** — 38 个供应商适配器 (openai, anthropic, gemini, aws, baidu, ali...)
- **`aihub/monitor/`** — 并发追踪、负载均衡、配额刷新、健康检查
- **`aihub/service/`** — 业务服务 (Claude 格式转换)
- **`aihub/common/`** — 通用工具 (config, logger, helper, crypto)
- **`aihub/web/web/`** — 前端 (MUI 5，唯一前端)

## Commands

```bash
# 一键构建（前端 + Go 编译）
cd aihub && ./rebuild.sh

# 启动服务
./aihub/bin/aihub

# 前端开发（热更新）
cd aihub/web/web && npm start

# 基础设施（需要 Docker）
docker compose up -d          # PostgreSQL + Redis + aihub
docker compose up -d redis db  # 只启动数据库

# Go 测试
cd aihub && go test ./...

# 前端构建
cd aihub/web/web && npm run build
```

## Architecture

请求流：Client → Gin Router → Auth Middleware (Token/Key) → Distributor (Channel Selection) → Relay Adaptor (Provider-specific) → Provider API

关键路径：

- **认证**: `middleware/auth.go` — Token 校验，4 级角色 (Guest/Common/Admin/Root)
- **渠道路由**: `middleware/distributor.go` + `controller/routing.go` — 加权随机 + 亲和性 + 故障转移 + 智能 LB
- **代理转发**: `relay/adaptor/` — 38 个供应商适配器，支持 streaming
- **并发追踪**: `monitor/concurrency.go` — Redis 实时计数，REST API 查询
- **配额监控**: `model/quota.go` + `monitor/quota-refresh.go` — 6 提供商适配器 + Redis 缓存
- **用量报表**: `controller/report.go` — Token 消耗统计 + 时间粒度切换

## Conventions

- **Go**: gofmt 标准格式，无额外 linter
- **Frontend**: MUI 5 组件，函数组件 + hooks，JSX
- **API 格式**: JSON `{ success: bool, message: string, data: ... }`
- **API 路径**: `/api/` 管理 API, `/v1/` 代理转发 (OpenAI/Anthropic 兼容)
- **Auth**: Bearer Token 或 Cookie session
- **分页**: 页码分页 (page + page_size)
- **GORM**: 跨数据库兼容（PostgreSQL/MySQL/SQLite），用 `common.UsingPostgreSQL` 判断
- **Redis**: 并发计数 key `channel:concurrency:*`，配额缓存 key `channel:quota:*`
- **Embed**: `//go:embed web/build/*` 嵌入前端，前端改动后必须 rebuild

## Database

**生产环境使用 PostgreSQL**。GORM 字段类型必须使用 PostgreSQL 兼容类型：

| 用途 | PostgreSQL | MySQL | 错误写法 |
|------|-----------|-------|---------|
| 二进制/BLOB | `bytea` | `longblob` | ❌ `longblob` (PG 不支持) |
| 大文本 | `text` | `longtext` | ❌ `longtext` (PG 不支持) |

GORM tag 示例：`gorm:"type:bytea"` 而非 `gorm:"type:longblob"`。

GORM 模型 (`aihub/model/`)：

- `User` — 用户，4 级角色，AccessToken
- `Token` — API 密钥，额度限制，模型限制
- `Channel` — 渠道配置，类型/优先级/权重/预算
- `Ability` — Group-Model-Channel 映射，控制用户可用模型
- `Log` — 请求日志，Token 消耗
- `ChannelQuota` — 配额信息，Redis 缓存

## 本地构建

```bash
cd aihub && ./rebuild.sh   # 前端构建 + 产物拷贝 + Go 编译，三步合一
./bin/aihub                # 启动服务
```

关键点：
- `npm run build` 产物在 `web/build/` 子目录，rebuild.sh 自动拷贝到 `web/build/web/` 层
- embed 是编译时嵌入，前端改动后必须 `go clean -cache` + 重新 `go build`
- `rebuild.sh` 已包含所有步骤

## 生产部署打包

```bash
cd aihub

# 1. 构建前端（如果前端有改动）
cd web/web && npm run build && cd ../..
rm -rf web/build/web/static web/build/web/index.html web/build/web/asset-manifest.json
cp -r web/web/build/* web/build/web/
rm -rf web/web/build

# 2. 交叉编译 Linux 二进制
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o bin/aihub-linux .

# 3. 构建 Docker 镜像
docker build -f Dockerfile.slim -t aihub:latest .

# 4. 导出镜像
docker save aihub:latest | gzip > bin/aihub-image.tar.gz
```

部署产物（上传到服务器即可）：
- `bin/aihub-image.tar.gz` — Docker 镜像压缩包（~37MB）
- `docker-compose.prod.yml` — 编排文件，连接外部 PostgreSQL + Redis

服务器端：`docker load < aihub-image.tar.gz` → 修改 `docker-compose.prod.yml` 中的连接信息 → `docker compose -f docker-compose.prod.yml up -d`

详见 `aihub/DEPLOY.md`。

## Feature Workflow

项目使用 `feature-workflow/` 系统管理需求开发流程（queue.yaml 排队、worktree 隔离、归档）。配置见 `feature-workflow/config.yaml`。
