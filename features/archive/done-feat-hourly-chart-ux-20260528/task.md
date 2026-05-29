# Tasks: feat-hourly-chart-ux

## Task Breakdown

### 1. Tooltip 数据排序
- [x] 在 `baseOptions` 中配置 `tooltip.shared: true` + `tooltip.intersect: false`
- [x] 实现自定义 tooltip 渲染函数，按 series 值降序排序
- [x] 确保深色/浅色主题下 tooltip 样式正确
- [x] Token 图表和请求次数图表均生效

### 2. 折线末端名称标签
- [x] 根据 series 数据动态计算每条线最后一个数据点位置
- [x] 使用 ApexCharts `annotations.points` 在末端添加用户名标签
- [x] 标签背景色与折线颜色一致
- [x] 处理多用户标签不重叠（偏移策略）
- [x] Token 图表和请求次数图表均添加标签

### 3. 验证测试
- [x] 多用户场景（5+ 用户）下 tooltip 排序正确
- [x] 单用户场景下标签和 tooltip 正常
- [x] 深色/浅色主题切换后样式正确
- [x] 无数据场景不报错

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-28 | Feature created | 待开发 |
| 2026-05-28 | Task 1 & 2 implemented | Tooltip排序 + 末端标签，单文件修改 DailyHourlyChart.js |
