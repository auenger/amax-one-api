# Tasks: feat-channel-test-playground

> Parent / split 协调。具体实现见两个子 feature。

## Task Breakdown

### 1. 子 feature 协调
- [ ] 子1 feat-channel-test-stream-api（后端流式端点）先行，可独立 curl 验证
- [ ] 子2 feat-channel-test-playground-ui（前端弹窗 + 入口）依赖子1，跟进
- [ ] 两个子 feature 都完成并验证后，parent 视为完成

### 2. 验收对齐
- [ ] 端到端：菜单/按钮入口 → 弹窗选模型输 prompt → SSE 流式看到上游响应 + 耗时/错误
- [ ] 测试请求不计配额、仅记测试日志
- [ ] 现有"测试启用渠道"全量按钮、"响应时间标签点击测速"行为不被破坏

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-06-17 | 需求拆分完成，进入队列待开发 | 拆为 stream-api(S) + playground-ui(M) |
