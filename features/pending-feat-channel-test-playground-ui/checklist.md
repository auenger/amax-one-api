# Checklist: feat-channel-test-playground-ui

## Development
- [ ] `ChannelTestPlayground` 组件完成
- [ ] 菜单"测试"项 + 行内测速按钮两个入口都打开同一弹窗
- [ ] 模型列表来自渠道 `models` 字段
- [ ] SSE 逐字流式渲染（fetch + getReader）
- [ ] 关闭弹窗 AbortController 中止请求

## Code Quality
- [ ] MUI 5 组件 + 函数组件 + hooks，JSX
- [ ] 错误如实展示，loading 态明确
- [ ] 不破坏现有全量测试按钮与响应时间标签行为

## Testing
- [ ] 入口可发现、选模型、流式渲染、错误展示、关闭中止 均符合预期
- [ ] `npm run build` 通过

## Documentation
- [ ] spec.md 技术方案与实现一致
