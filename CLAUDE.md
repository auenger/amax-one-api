# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIHub — 企业级 AI 管理平台，基于 [one-api](https://github.com/songquanpeng/one-api) (Go + Gin) 深度二开。提供 38 供应商代理转发、Token 鉴权（4 级角色）、智能渠道路由、并发追踪、配额监控、模型广场、用量报表等功能。

前端使用 Berry 主题 (React + MUI 5)，通过 `go:embed` 嵌入 Go 二进制。

## Project Structure

核心代码在 `one-api/` 目录：

- **`one-api/controller/`** — HTTP 处理器 (channel, token, log, routing, concurrency, report, billing)
- **`one-api/model/`** — GORM 数据模型 (User, Token, Channel, Log, Ability, Quota)
- **`one-api/middleware/`** — 中间件 (auth, distributor, rate-limit, affinity, cors, request-id)
- **`one-api/router/`** — 路由注册 (api.go, relay.go, web.go)
- **`one-api/relay/adaptor/`** — 38 个供应商适配器 (openai, anthropic, gemini, aws, baidu, ali...)
- **`one-api/monitor/`** — 并发追踪、负载均衡、配额刷新、健康检查
- **`one-api/service/`** — 业务服务 (Claude 格式转换)
- **`one-api/common/`** — 通用工具 (config, logger, helper, crypto)
- **`one-api/web/berry/`** — Berry 前端 (MUI 5, 活跃开发)
- **`one-api/web/default/`** — 默认前端 (Semantic UI, 不活跃)
- **`one-api/web/air/`** — Air 前端 (不活跃)

Legacy 目录（已废弃，不修改）：`apps/`, `packages/`

## Commands

```bash
# 一键构建（前端 + Go 编译）
cd one-api && ./rebuild.sh

# 启动服务
./one-api/bin/one-api

# 前端开发（热更新）
cd one-api/web/berry && npm start

# 基础设施（需要 Docker）
docker compose up -d          # PostgreSQL 16 + Redis 7 + one-api
docker compose up -d postgres redis  # 只启动数据库

# Go 测试
cd one-api && go test ./...

# 前端构建
cd one-api/web/berry && npm run build
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

GORM 模型 (`one-api/model/`)：

- `User` — 用户，4 级角色，AccessToken
- `Token` — API 密钥，额度限制，模型限制
- `Channel` — 渠道配置，类型/优先级/权重/预算
- `Ability` — Group-Model-Channel 映射，控制用户可用模型
- `Log` — 请求日志，Token 消耗
- `ChannelQuota` — 配额信息，Redis 缓存

## one-api 本地构建

```bash
cd one-api && ./rebuild.sh   # 前端构建 + 产物拷贝 + Go 编译，三步合一
./bin/one-api                 # 启动服务
```

关键点：
- `npm run build` 产物在 `berry/build/` 子目录，rebuild.sh 自动拷贝到 `berry/` 根层
- embed 是编译时嵌入，前端改动后必须 `go clean -cache` + 重新 `go build`
- `rebuild.sh` 已包含所有步骤

## Feature Workflow

项目使用 `feature-workflow/` 系统管理需求开发流程（queue.yaml 排队、worktree 隔离、归档）。配置见 `feature-workflow/config.yaml`。
