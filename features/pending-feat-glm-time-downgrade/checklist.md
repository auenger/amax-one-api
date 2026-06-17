# Checklist: feat-glm-time-downgrade

## Completion Checklist

### Development
- [ ] 所有 tasks 完成
- [ ] 代码自测通过

### Code Quality
- [ ] 代码风格符合项目规范（gofmt）
- [ ] 时间判断逻辑正确（北京时间 UTC+8）
- [ ] 降级优先级正确（时间 > 配额）

### Testing
- [ ] 时间窗口内降级验证
- [ ] 时间窗口外恢复验证
- [ ] 非 GLM 渠道不受影响验证
- [ ] 动态配置即时生效验证

### Documentation
- [ ] spec.md 技术方案已填写
- [ ] 关键代码有注释说明
