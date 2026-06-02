# Tasks: feat-docker-minimax-mcp

## Task Breakdown

### 1. entrypoint.sh 双进程管理脚本
- [x] 编写 entrypoint.sh，支持按环境变量启动 MCP 服务
- [x] Minimax MCP: 有 MINIMAX_API_KEY 则 `uvx minimax-coding-plan-mcp --sse --port 8765`
- [x] 智谱 MCP: 有 Z_AI_API_KEY 则 `npx supergateway --stdio "npx -y @z_ai/mcp-server" --port 8766`
- [x] 信号转发和进程清理（trap EXIT/INT/TERM）
- [x] 日志输出标识各服务启动状态

### 2. Dockerfile.slim 改造
- [x] alpine 基础上安装 python3 + py3-pip + nodejs + npm
- [x] 安装 uv 并预缓存 minimax-coding-plan-mcp
- [x] npm 全局安装 supergateway + @z_ai/mcp-server
- [x] COPY entrypoint.sh 并赋权
- [ ] 验证镜像大小（目标 < 300MB）— 需要实际构建验证

### 3. Docker Compose 配置更新
- [x] docker-compose.yml 添加 MCP 相关环境变量（可选，带默认空值）
- [x] docker-compose.prod.yml 添加对应配置
- [x] .env.example 添加 MCP 变量说明

### 4. 生产部署流程更新
- [ ] rebuild.sh 或新脚本支持生成含 MCP 的镜像 — rebuild.sh 无需修改，Dockerfile.slim 已包含所有改动
- [x] DEPLOY.md 补充 MCP 环境变量说明

### 5. 端到端验证
- [ ] 只设 MINIMAX_API_KEY → one-api + minimax 正常
- [ ] 只设 Z_AI_API_KEY → one-api + 智谱正常
- [ ] 都设 → 三个服务都正常
- [ ] 都不设 → 仅 one-api，行为与原版一致
- [ ] MCP 供应商页面连接 SSE 端点并同步工具

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-06-02 | Feature created | 需求分析、spec 编写完成，通用方案支持 Minimax + 智谱 |
| 2026-06-02 | Implementation | entrypoint.sh、Dockerfile.slim、compose、DEPLOY.md 全部完成 |
