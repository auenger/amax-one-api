# Tasks: feat-admin-key-usage

## Task Breakdown

### 1. Key 管理 API 集成

- [x] 创建 `apps/web/src/lib/api/keys.ts` — Virtual Key API 调用函数
- [x] 创建 `apps/web/src/lib/api/usage.ts` — Usage API 调用函数

### 2. Virtual Key 页面重构

- [x] 重构 `/dashboard/keys` — 接入真实 API，替换 mock 数据
- [x] 增强 Key 创建表单（模型多选、供应商多选、Scope、预算）
- [x] 实现 Key 路由规则展示（详情页/展开行）
- [x] 实现 Key 撤销/启用操作

### 3. 用量统计页面重构

- [x] 重构 `/dashboard/usage` — 接入 `/admin/usage/summary` 真实数据
- [x] 实现时间范围筛选器（今天/7天/30天/自定义）
- [x] 实现按模型维度的用量排行
- [x] 实现按 Key 维度的用量排行
- [x] 更新总量统计卡片

### 4. 设置页面增强

- [x] 接入系统配置 API
- [x] 展示供应商连接状态
- [x] 展示真实系统版本信息

## Progress Log

| Date       | Progress        | Notes                                        |
| ---------- | --------------- | -------------------------------------------- |
| 2026-05-12 | Feature created | 待开始实施（依赖 feat-admin-provider-model） |
| 2026-05-12 | All tasks done  | API client + pages + settings + build pass   |

## Files Changed

### New files (web)

- `apps/web/src/lib/api/keys.ts` — Virtual Key API call functions (CRUD + revoke)
- `apps/web/src/lib/api/usage.ts` — Usage API call functions (logs + summary)

### Modified files (web)

- `apps/web/src/lib/api/types.ts` — Added VirtualKey, UsageLog, UsageGroupSummary types
- `apps/web/src/app/dashboard/keys/page.tsx` — Full rewrite: real API with SWR, create/revoke/detail dialogs, one-time key reveal, status filter, search
- `apps/web/src/app/dashboard/usage/page.tsx` — Full rewrite: real usage API with time range filter, model/key ranking tables, bar chart
- `apps/web/src/app/dashboard/settings/page.tsx` — Client-side rewrite: real provider/key/model stats, provider connection status display
