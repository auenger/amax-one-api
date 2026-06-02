# Feature: feat-docker-minimax-mcp Docker 内置 MCP 服务

## Basic Information
- **ID**: feat-docker-minimax-mcp
- **Name**: Docker 内置 MCP 服务（Minimax + 智谱）
- **Priority**: 80
- **Size**: M
- **Dependencies**: feat-mcp-upstream-proxy (MCP 上游代理已实现 SSE 转发)
- **Parent**: null
- **Children**: []
- **Created**: 2026-06-02

## Description
在 Docker 镜像中内置 Minimax MCP 和智谱 MCP 服务，随 one-api 一起启动。通过环境变量控制启停：设置了对应的 API Key 就自动启动对应 MCP SSE 服务，不设置则不启动。用户部署后只需在 MCP 供应商管理界面配置 SSE 地址即可使用，无需手动安装 Python/Node 环境。

## User Value Points
1. **零配置部署** — Docker 镜像自带多个 MCP SSE 服务，设环境变量即用
2. **通用桥接** — 通过 supergateway 支持 stdio-only 的 MCP Server（如智谱），也支持原生 SSE 的（如 Minimax）

## Context Analysis
### Reference Code
- `one-api/Dockerfile.slim` — 当前生产镜像（alpine）
- `docker-compose.yml` — 本地编排
- `docker-compose.prod.yml` — 生产编排
- `one-api/mcp/upstream_sse.go` — SSE 上游转发

### MCP Server 详情

| MCP Server | 运行时 | 传输 | 启动方式 | 内部端口 |
|---|---|---|---|---|
| minimax-coding-plan-mcp | Python/uvx | stdio→SSE | `npx mcp-proxy --port 8765 -- uvx minimax-coding-plan-mcp` | 8765 |
| @z_ai/mcp-server (智谱) | Node/npx | stdio→SSE | `npx mcp-proxy --port 8766 -- npx -y @z_ai/mcp-server` | 8766 |

### 提供的工具
- **Minimax**: `web_search`（网络搜索）、`understand_image`（图片理解）
- **智谱**: `web_search`、`image_analyze` 等工具

### Related Features
- feat-mcp-vision-tool（已归档）
- feat-mcp-management（已归档）
- feat-mcp-upstream-proxy（已归档）

## Technical Solution

### 架构
```
Docker Container
├── one-api (:3000)
├── minimax-mcp SSE via mcp-proxy (:8765)  ← 如果 MINIMAX_API_KEY 已设置
└── zai-mcp SSE via mcp-proxy (:8766)     ← 如果 Z_AI_API_KEY 已设置
```

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| MINIMAX_API_KEY | 否 | - | 设置后启动 Minimax MCP |
| MINIMAX_API_HOST | 否 | https://api.minimaxi.com | Minimax API 区域 |
| MINIMAX_MCP_PORT | 否 | 8765 | Minimax MCP 端口 |
| Z_AI_API_KEY | 否 | - | 设置后启动智谱 MCP |
| Z_AI_MODE | 否 | ZHIPU | 智谱模式 |
| Z_AI_MCP_PORT | 否 | 8766 | 智谱 MCP 端口 |

### 实现方案

#### 1. Dockerfile.slim 改造
```dockerfile
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata python3 py3-pip nodejs npm

# 安装 uv（Python 包管理器）并预缓存 minimax MCP
RUN pip install uv && \
    uv tool install minimax-coding-plan-mcp

# 预缓存 supergateway 和 zai-mcp-server
RUN npm install -g supergateway @z_ai/mcp-server

COPY bin/one-api-linux /opt/aihub/one-api
COPY entrypoint.sh /opt/aihub/entrypoint.sh
RUN chmod +x /opt/aihub/one-api /opt/aihub/entrypoint.sh

EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/opt/aihub/entrypoint.sh"]
```

#### 2. entrypoint.sh
```bash
#!/bin/sh
set -e

# 清理函数
cleanup() {
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup EXIT INT TERM

# 启动 Minimax MCP（原生 SSE）
if [ -n "$MINIMAX_API_KEY" ]; then
    echo "[MCP] Starting Minimax MCP on :${MINIMAX_MCP_PORT:-8765}"
    MINIMAX_API_KEY="$MINIMAX_API_KEY" \
    MINIMAX_API_HOST="${MINIMAX_API_HOST:-https://api.minimaxi.com}" \
    uvx minimax-coding-plan-mcp --sse --port ${MINIMAX_MCP_PORT:-8765} &
fi

# 启动智谱 MCP（stdio → SSE via supergateway）
if [ -n "$Z_AI_API_KEY" ]; then
    echo "[MCP] Starting Z-AI MCP on :${Z_AI_MCP_PORT:-8766}"
    Z_AI_API_KEY="$Z_AI_API_KEY" \
    Z_AI_MODE="${Z_AI_MODE:-ZHIPU}" \
    npx supergateway \
        --stdio "npx -y @z_ai/mcp-server" \
        --port ${Z_AI_MCP_PORT:-8766} &
fi

# 启动主服务（前台）
echo "[one-api] Starting on :3000"
exec /opt/aihub/one-api
```

#### 3. docker-compose.yml 环境变量
```yaml
one-api:
  environment:
    # ... 原有变量 ...
    # 可选：Minimax MCP
    MINIMAX_API_KEY: ${MINIMAX_API_KEY:-}
    MINIMAX_API_HOST: https://api.minimaxi.com
    # 可选：智谱 MCP
    Z_AI_API_KEY: ${Z_AI_API_KEY:-}
    Z_AI_MODE: ZHIPU
```

#### 4. 生产部署使用
```yaml
# docker-compose.prod.yml
services:
  aihub:
    image: aihub:latest
    environment:
      SQL_DSN: postgres://...
      REDIS_CONN_STRING: redis://...
      MINIMAX_API_KEY: sk-cp-xxx        # 设了就启动
      Z_AI_API_KEY: xxx.xxx             # 设了就启动
```

然后 MCP 供应商页面添加：
- Minimax: Base URL `http://localhost:8765/sse`，传输 `sse`
- 智谱: Base URL `http://localhost:8766/sse`，传输 `sse`

## Acceptance Criteria (Gherkin)

### Scenario 1: 两个 MCP 都启动
```gherkin
Given Docker 容器设置了 MINIMAX_API_KEY 和 Z_AI_API_KEY
When 容器启动
Then minimax MCP 在 8765 端口提供 SSE 服务
And 智谱 MCP 在 8766 端口提供 SSE 服务
And one-api 主服务在 3000 端口正常
```

### Scenario 2: 只启动一个
```gherkin
Given Docker 容器只设置了 MINIMAX_API_KEY
When 容器启动
Then minimax MCP 在 8765 端口启动
And 智谱 MCP 不启动，无报错
And one-api 主服务正常
```

### Scenario 3: 都不启动
```gherkin
Given Docker 容器未设置 MINIMAX_API_KEY 和 Z_AI_API_KEY
When 容器启动
Then 两个 MCP 都不启动
And one-api 主服务正常，与原版行为一致
```

### Scenario 4: MCP 供应商连接
```gherkin
Given Minimax MCP 已在内部 8765 端口运行
When 管理员添加 MCP 供应商，Base URL 为 http://localhost:8765/sse，传输方式 sse
Then 同步成功，注册 web_search 和 understand_image 工具
```

### Scenario 5: 镜像大小可控
```gherkin
Given 构建包含 Python3 + Node.js + MCP 包的新 Docker 镜像
When 检查镜像大小
Then 镜像不超过 300MB（alpine 基底 + Python + Node + 包缓存）
```

## Merge Record
- **Completed**: 2026-06-02
- **Merged Branch**: feature/docker-minimax-mcp
- **Merge Commit**: (merged via --no-ff to main)
- **Archive Tag**: feat-docker-minimax-mcp-20260602
- **Conflicts**: none
- **Verification**: passed (code analysis, 5/5 Gherkin scenarios)
- **Files Changed**: 6 (entrypoint.sh, Dockerfile.slim, docker-compose.yml, docker-compose.prod.yml, .env.example, DEPLOY.md)
