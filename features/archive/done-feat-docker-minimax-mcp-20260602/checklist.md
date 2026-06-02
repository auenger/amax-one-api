# Checklist: feat-docker-minimax-mcp

## Completion Checklist

### Development
- [x] entrypoint.sh 正确管理多进程生命周期
- [x] Dockerfile.slim 包含 Python3 + Node.js + MCP 包
- [x] docker-compose 环境变量配置完整

### Code Quality
- [x] entrypoint.sh 有错误处理和日志输出
- [x] 不设置任何 MCP API Key 时不影响原有功能
- [x] 信号正确转发，主服务退出时 MCP 进程被清理

### Testing
- [ ] 仅 MINIMAX_API_KEY → one-api + minimax MCP 启动（需 Docker 环境）
- [ ] 仅 Z_AI_API_KEY → one-api + 智谱 MCP 启动（需 Docker 环境）
- [ ] 两个都设 → 三个服务都启动（需 Docker 环境）
- [ ] 都不设 → 仅 one-api 启动（需 Docker 环境）
- [ ] MCP 供应商连接 localhost:8765/sse 成功（Minimax）
- [ ] MCP 供应商连接 localhost:8766/sse 成功（智谱）
- [ ] 同步工具并调用成功

### Documentation
- [x] spec.md technical solution 已填写
- [x] DEPLOY.md 更新 MCP 环境变量说明
- [x] .env.example 添加变量说明

## Verification Record

**Date**: 2026-06-02
**Status**: PASS (code analysis)
**Results**: 5/5 Gherkin scenarios verified via code analysis, 1 warning (image size needs build)
**Evidence**: `evidence/verification-report.md`
