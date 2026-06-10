# ModelHub

企业级 AI 管理平台 — 多模型统一代理、智能路由、配额监控。

## 特性

- 38+ 供应商代理转发（OpenAI、Anthropic、Gemini、AWS Bedrock、百度、阿里等）
- Token 鉴权（4 级角色：Guest / Common / Admin / Root）
- 智能渠道路由：加权随机 + 亲和性 + 故障转移 + 智能 LB
- 并发追踪、配额监控、用量报表
- MCP 服务集成（Minimax、智谱）
- React 前端（MUI 5）

## 快速开始

```bash
# 构建
cd aihub && ./rebuild.sh

# 启动
./bin/aihub
```

浏览器访问 `http://localhost:3000`，默认管理员账号 `root` / `123456`。

## 部署

详见 [DEPLOY.md](./DEPLOY.md)。

## 技术栈

- **后端**: Go + Gin + GORM（PostgreSQL/MySQL/SQLite）
- **前端**: React + MUI 5
- **缓存**: Redis
- **容器**: Docker + Docker Compose
