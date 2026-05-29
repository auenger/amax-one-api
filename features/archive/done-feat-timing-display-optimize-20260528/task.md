# Tasks: feat-timing-display-optimize

## Task Breakdown

### 1. 后端：Log 模型增加 ProxyMs 字段
- [x] Log 模型新增 `ProxyMs int64` 字段（gorm default:0）
- [x] `controller/relay.go` 的 `recordTiming()` 中同步写入 Log.ProxyMs = middlewareMs

### 2. 前端：Log 页面增加耗时列
- [x] `Log/TableHead.js` 新增"总耗时"和"中转开销"列
- [x] `Log/TableRow.js` 渲染耗时数据 + 颜色标签

### 3. 前端：TimingLog 列头语义化
- [x] `TimingLog/TableHead.js` 重命名列头
- [x] 添加列头 tooltip 说明

### 4. 前端：TimingLog 新增中转占比列
- [x] `TimingLog/TableHead.js` 新增"中转占比"列
- [x] `TimingLog/TableRow.js` 计算并渲染占比 + 颜色标签

### 5. 前端：TimingBar 可视化增强
- [x] `TimingLog/TableRow.js` 的 TimingBar 增加百分比标签
- [x] 每段增加中文标签（中转/上游等待/传输）
- [x] 处理极端值（某段为 0ms 时不显示）

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-28 | Feature created | 待开发 |
| 2026-05-28 | All tasks completed | 5/5 tasks done, go vet passed |
