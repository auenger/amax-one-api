# Checklist: feat-phase1-openai-proxy

## Completion Checklist

### Development
- [ ] Fastify 代理框架搭建完成
- [ ] Authorization header 替换完成
- [ ] VK 验证中间件集成完成
- [ ] 模型别名解析集成完成
- [ ] Chat Completions (非流式) 透传完成
- [ ] Chat Completions (流式 SSE) 透传完成
- [ ] Embeddings API 透传完成
- [ ] Models 列表代理完成
- [ ] Usage 提取 + recordUsage 集成完成
- [ ] 错误处理完成 (401/429/502/504, RFC 7807)

### Code Quality
- [ ] TypeScript strict mode 无错误
- [ ] 遵循项目约定 (RFC 7807, OpenAI 兼容)
- [ ] 无安全漏洞

### Testing
- [ ] 单元测试通过
- [ ] 端到端集成测试通过 (含 new-api)
- [ ] 性能测试达标 (P99 < 500ms)
- [ ] Coverage >= 80%

### Documentation
- [ ] spec.md technical solution 已填写
- [ ] API 使用文档
