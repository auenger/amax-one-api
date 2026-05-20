# Feature: feat-provider-quota-ui Channel 管理页配额面板

## Basic Information
- **ID**: feat-provider-quota-ui
- **Name**: Channel 管理页配额面板
- **Priority**: 75
- **Size**: S
- **Dependencies**: feat-provider-quota-refresh
- **Parent**: feat-provider-quota-monitor
- **Children**: null
- **Created**: 2026-05-19
- **Updated**: 2026-05-19

## Description

在 Channel 管理页展示配额信息。**模型广场的配额展示已合并至 [[feat-marketplace-flat-layout]]**，本 feature 仅负责 Channel 管理员页面的配额展示。

### 范围变更说明

原设计包含模型广场卡片和详情弹窗的配额展示。因模型广场布局重构为平铺展开模式，配额 UI 部分已移交 [[feat-marketplace-flat-layout]] 处理。公共组件（QuotaProgressBar 等）由本 feature 提供，flat-layout feature 复用。

### 展示位置

#### 1. Channel 管理页配额列

Channel 列表页新增配额显示列：

```
┌──────┬──────────┬────────┬────────────────────────┐
│ ID   │ 名称     │ 类型   │ 配额                    │
├──────┼──────────┼────────┼────────────────────────┤
│ 5    │ GLM Pro  │ Zhipu  │ ████████░░ 47% 5h      │
│      │          │        │ ██░░░░░░░ 31% 7d       │
├──────┼──────────┼────────┼────────────────────────┤
│ 12   │ DS Main  │ DeepSeek│ 余额: ¥10.50          │
└──────┴──────────┴────────┴────────────────────────┘
```

#### 2. Channel 详情页配额卡片

Channel 详情页新增完整配额卡片：
- 账户类型标签（Pro/Max）
- 各时间窗口完整进度条 + 百分比 + 剩余时间
- 余额型渠道显示余额金额
- 手动刷新按钮

### 数据流

Channel 管理页配额数据通过 Channel 管理 API 获取（管理员权限），与模型广场的数据源不同。

## User Value Points
1. 管理员在 Channel 管理页直接查看各渠道配额状况
2. 快速识别配额紧张或耗尽的渠道

## Technical Solution

### New Files
- `utils/quota.js` — Shared utility functions: getQuotaColor, formatRemaining, formatBalance
- `views/Channel/component/QuotaProgressBar.js` — Reusable progress bar (compact/standard modes)
- `views/Channel/component/ChannelQuotaCell.js` — Compact quota cell for table rows
- `views/Channel/component/ChannelQuotaCard.js` — Full quota card for edit modal (with refresh button)

### Modified Files
- `views/Channel/index.js` — Added quotaMap state, loadQuotaData(), passes quota to table rows and edit modal
- `views/Channel/component/TableHead.js` — Added "配额" column header
- `views/Channel/component/TableRow.js` — Added quota prop, ChannelQuotaCell in new column
- `views/Channel/component/EditModal.js` — Added quota prop, ChannelQuotaCard shown for existing channels

### Data Flow
1. ChannelPage loads quota data from `GET /api/channel/quota` (returns all cached quotas)
2. Data is stored as `quotaMap[channelId]` and passed to TableRow and EditModal
3. ChannelQuotaCard has its own refresh button calling `POST /api/channel/:id/quota/refresh`
4. Graceful degradation: no data shows "-", unsupported types show "不支持"

## Acceptance Criteria (Gherkin)

### Channel 列表页
```gherkin
Given 管理员打开 Channel 管理页
When 页面加载完成
Then Channel 列表新增配额列
And 时间窗口型渠道显示进度条 + 百分比 + 窗口标签
And 余额型渠道显示余额金额
And 无配额数据的渠道显示 "-"
```

### Channel 详情页
```gherkin
Given 管理员打开某 Channel 详情页
And 该渠道有配额数据
Then 显示完整配额卡片
And 显示账户类型标签
And 显示各窗口进度条 + 百分比 + 剩余时间
And 手动刷新按钮可点击更新数据
```

### General Checklist
- [x] QuotaProgressBar 组件可被 flat-layout feature 复用
- [x] 颜色规则: 0-60% 绿 / 60-85% 黄 / 85-100% 红

## Merge Record
- **Completed**: 2026-05-19
- **Merged Branch**: feature/provider-quota-ui
- **Merge Commit**: f03acbb
- **Archive Tag**: feat-provider-quota-ui-20260519
- **Conflicts**: none
- **Verification**: PASS (all Gherkin scenarios validated)
- **Stats**: 8 files changed, 394 insertions(+), 6 deletions(-)
