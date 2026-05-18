# Feature: feat-marketplace-card-enhance 模型卡片丰富化

## Basic Information
- **ID**: feat-marketplace-card-enhance
- **Name**: 模型卡片丰富化
- **Priority**: 55
- **Size**: S
- **Dependencies**: none
- **Parent**: feat-portal-pages-enhance
- **Children**: none
- **Created**: 2026-05-19

## Description
优化模型广场页面的模型卡片，丰富卡片信息展示（渠道信息、供应商标签等），并支持点击卡片弹出模型详情弹窗。

## User Value Points
1. 模型卡片展示更丰富的信息（渠道类型、可用渠道数量等）
2. 点击模型卡片弹出详情弹窗，展示渠道信息、支持的模型能力等

## Context Analysis
### Reference Code
- 模型广场主页面: `one-api/web/berry/src/views/ModelMarket/index.js`
- 模型 API: `one-api/controller/model.go` — `GetUserAvailableModels()`, `DashboardListModels()`
- 路由: `one-api/router/api.go` — `GET /api/user/available_models`, `GET /api/models`
- API 返回格式: `/api/user/available_models` 返回模型名数组；`/api/models` 返回 `channelId2Models` (channel type → model names map)
- 当前 `guessChannelType()` 函数从模型名前缀猜测供应商
### Related Documents
### Related Features
- feat-model-marketplace (归档 2026-05-18) — 原始实现
- feat-portal-pages-enhance (父 feature)

## Technical Solution
### 实现方案
1. **双 API 并行加载**: 使用 `Promise.allSettled` 同时请求 `/api/user/available_models` 和 `/api/models`，获取用户可用模型列表和渠道映射数据
2. **反向渠道映射**: 从 `channelId2Models`（channel type ID -> model names）构建反向映射 `channelMap`（model name -> [{id, label}]），用于卡片展示
3. **卡片丰富化**: 每个模型卡片增加渠道数量 Chip（带 Tooltip），显示该模型有多少个可用渠道
4. **ModelDetailDialog 组件**: MUI Dialog 实现详情弹窗，展示模型名称、渠道类型标签、渠道数量、渠道列表（List 组件），支持 ESC/外部点击/关闭按钮关闭
5. **主题适配**: 所有新增组件均通过 `useTheme()` 获取当前主题，暗色/亮色模式自动适配
6. **降级策略**: 如果 `/api/models` 请求失败，仍使用 `guessChannelType()` 作为兜底，确保页面可用

## Acceptance Criteria (Gherkin)
### User Story
作为用户，我希望在模型广场看到更丰富的模型信息，并能点击查看详情。

### Scenarios (Given/When/Then)

#### Scenario 1: 模型卡片展示渠道信息
```gherkin
Given 用户打开模型广场页面
When 页面加载完成显示模型卡片
Then 每个卡片应展示模型名称、渠道类型标签
And 卡片应显示该模型对应的可用渠道数量
```

#### Scenario 2: 点击卡片弹出详情
```gherkin
Given 模型广场页面已加载
When 用户点击某个模型卡片
Then 弹出详情弹窗，展示模型名称、渠道类型、可用渠道列表
And 弹窗有关闭按钮
```

#### Scenario 3: 空状态处理
```gherkin
Given 模型广场页面已加载
When 某个模型没有可用渠道信息
Then 卡片仍正常显示模型名称
And 不展示渠道相关字段或显示 "暂无渠道信息"
```

### UI/Interaction Checkpoints
- 卡片 hover 效果保持现有动画
- 弹窗使用 MUI Dialog，支持 ESC 关闭和点击外部关闭
- 弹窗内渠道信息以列表/表格形式展示
- 暗色/亮色主题适配

### General Checklist
- [x] 卡片布局不破坏现有响应式网格
- [x] 性能：大量卡片时弹窗不卡顿

## Merge Record
- **Completed**: 2026-05-19
- **Branch**: feature/marketplace-card-enhance
- **Merge Commit**: 06d09fe
- **Archive Tag**: feat-marketplace-card-enhance-20260519
- **Conflicts**: none
- **Verification**: passed (3/3 scenarios, 9/9 tasks)
- **Stats**: 1 commit, 1 file changed, 347 insertions, 81 deletions
