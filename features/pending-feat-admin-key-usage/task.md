# Tasks: feat-admin-key-usage

## Task Breakdown

### 1. Key 管理 API 集成

- [ ] 创建 `apps/web/src/lib/api/keys.ts` — Virtual Key API 调用函数
- [ ] 创建 `apps/web/src/lib/api/usage.ts` — Usage API 调用函数

### 2. Virtual Key 页面重构

- [ ] 重构 `/dashboard/keys` — 接入真实 API，替换 mock 数据
- [ ] 增强 Key 创建表单（模型多选、供应商多选、Scope、预算）
- [ ] 实现 Key 路由规则展示（详情页/展开行）
- [ ] 实现 Key 撤销/启用操作

### 3. 用量统计页面重构

- [ ] 重构 `/dashboard/usage` — 接入 `/admin/usage/summary` 真实数据
- [ ] 实现时间范围筛选器（今天/7天/30天/自定义）
- [ ] 实现按模型维度的用量排行
- [ ] 实现按 Key 维度的用量排行
- [ ] 更新总量统计卡片

### 4. 设置页面增强

- [ ] 接入系统配置 API
- [ ] 展示供应商连接状态
- [ ] 展示真实系统版本信息

## Progress Log

| Date       | Progress        | Notes                                        |
| ---------- | --------------- | -------------------------------------------- |
| 2026-05-12 | Feature created | 待开始实施（依赖 feat-admin-provider-model） |
