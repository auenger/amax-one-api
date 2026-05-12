# Checklist: feat-phase1-usage-metering

## Completion Checklist

### Development
- [ ] Prisma schema (UsageLog) 定义完成
- [ ] recordUsage() 内部接口完成
- [ ] getUsageSummary() 内部接口完成
- [ ] openai-proxy 集成 (非流式 + 流式)
- [ ] auth-pool budget 检查集成
- [ ] GET /v1/usage 查询 API 完成
- [ ] GET /v1/usage/summary 汇总 API 完成
- [ ] 错误请求记录逻辑完成

### Code Quality
- [ ] TypeScript strict mode 无错误
- [ ] 遵循项目约定 (RFC 7807, cursor-based 分页)
- [ ] recordUsage 为 fire-and-forget，不影响请求响应
- [ ] 无安全漏洞

### Testing
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] Budget 检查场景测试通过
- [ ] Coverage >= 80%

### Documentation
- [ ] spec.md technical solution 已填写
- [ ] API 使用文档
