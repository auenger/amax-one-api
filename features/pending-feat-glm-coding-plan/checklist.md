# Checklist: feat-glm-coding-plan

## Completion Checklist

### Development
- [ ] 所有 task.md 中的任务完成
- [ ] ZhipuCoding (OpenAI 协议) 渠道创建和请求正常
- [ ] ZhipuCodingAnthropic (Anthropic 协议) 渠道创建和请求正常
- [ ] 现有 Zhipu 渠道功能不受影响
- [ ] Streaming 模式正常
- [ ] 自定义 Base URL 正常

### Code Quality
- [ ] 代码风格符合项目规范（gofmt）
- [ ] 新增 adaptor 结构与现有 adaptor 一致
- [ ] 不修改现有 Zhipu adaptor 代码
- [ ] ChannelBaseURLs 数组长度等于 Dummy

### Testing
- [ ] 手动测试 ZhipuCoding 渠道
- [ ] 手动测试 ZhipuCodingAnthropic 渠道
- [ ] 回归测试现有 Zhipu 渠道

### Documentation
- [ ] spec.md 技术方案填写完整（确认鉴权方式后更新）
