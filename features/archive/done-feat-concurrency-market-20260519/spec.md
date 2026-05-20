# Feature: feat-concurrency-market 模型广场并发数据对接

## Basic Information
- **ID**: feat-concurrency-market
- **Name**: 模型广场并发数据对接
- **Priority**: 75
- **Size**: S
- **Dependencies**: feat-concurrency-tracker
- **Parent**: feat-channel-concurrency
- **Children**: none
- **Created**: 2026-05-19
- **Updated**: 2026-05-19

## Description

提供模型广场所需的并发数据获取和状态管理逻辑。**UI 展示部分已合并至 [[feat-marketplace-flat-layout]]**，本 feature 仅负责数据层的对接。

### 范围变更说明

原设计包含卡片并发指示器和弹窗渠道并发列的 UI 实现。因模型广场布局重构为平铺展开模式（feat-marketplace-flat-layout），UI 部分已移交该 feature 处理。本 feature 聚焦于：

1. 并发数据获取逻辑（API 调用、状态管理）
2. 负载等级计算工具函数
3. 自动刷新机制（供 flat-layout feature 复用）

## User Value Points
1. **并发数据基础设施** — 为模型广场提供标准化的并发数据获取和计算能力

## Context Analysis
### Reference Code
- `/api/user/model_concurrency` — 并发数据 API（由 feat-concurrency-tracker 提供）

### Related Documents
- [[feat-concurrency-tracker]] — 并发追踪后端 API 定义

### Related Features
- [[feat-concurrency-tracker]] — 并发追踪后端（本 feature 的前置依赖）
- [[feat-marketplace-flat-layout]] — 模型广场平铺布局（UI 消费方）

## Technical Solution
- **`hooks/useConcurrencyData.js`** — React hook 封装 `/api/user/model_concurrency` 调用，内置 30s 自动刷新、异步非阻塞加载、优雅错误降级。提供 `{ concurrencyData, loading, error, refresh, lastFetchedAt }` 接口。
- **`utils/concurrency.js`** — 纯工具函数：`getLoadLevel(count, thresholds?)` 返回 `{ level, label, color }`，`getLoadColor(count)` 和 `getLoadLabel(count)` 为便捷包装。`CONCURRENCY_THRESHOLDS` 导出可配置阈值对象（low: 0-2, medium: 3-5, high: 6+）。另提供 `buildConcurrencyMap()` 和 `getTotalConcurrency()` 辅助函数。
- **`views/ModelMarket/index.js`** — 重构为使用 `useConcurrencyData` hook 和 `utils/concurrency.js` 工具，移除内联的并发逻辑代码。30s 自动刷新由 hook 管理，不再在组件内手动维护 `setInterval`。

## Acceptance Criteria (Gherkin)
### User Story
作为开发者，我需要标准化的并发数据获取接口，供模型广场 UI 使用。

### Scenarios (Given/When/Then)
```gherkin
Scenario: 并发数据获取
  Given feat-concurrency-tracker 已部署
  When 调用并发数据获取函数
  Then 返回按模型分组的并发数据
  And 包含每个渠道的当前并发数和最大并发数

Scenario: 负载等级计算
  Given 渠道并发数据
  When 计算负载等级
  Then 0-2 为低负载(绿), 3-5 为中负载(黄), 6+ 为高负载(红)
```

### General Checklist
- [x] 并发数据获取函数可被 flat-layout feature 直接复用
- [x] 负载等级阈值可配置

## Merge Record
- **Completed**: 2026-05-19
- **Branch**: feature/concurrency-market
- **Merge Commit**: ebe618d
- **Archive Tag**: feat-concurrency-market-20260519
- **Conflicts**: None
- **Verification**: 2/2 Gherkin scenarios passed, 51/51 unit tests passed
- **Stats**: 1 commit, 3 files changed, 220 insertions, 93 deletions
