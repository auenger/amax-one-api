# Feature: feat-portal-pages-enhance 门户页面增强

## Basic Information
- **ID**: feat-portal-pages-enhance
- **Name**: 门户页面增强
- **Priority**: 55
- **Size**: L
- **Dependencies**: none
- **Parent**: null
- **Children**: [feat-marketplace-card-enhance, feat-usage-report-v2]
- **Created**: 2026-05-19

## Description
优化模型广场和用量报表两个门户页面。模型卡片增加渠道信息和点击弹窗详情；用量报表优化筛选器 UX（下拉搜索、布局对齐）并重设计趋势图表（多用户折线图）。

## User Value Points
1. 模型卡片丰富化 — 展示渠道信息，点击弹窗查看模型详情
2. 用量报表筛选器 UX — 用户名/令牌名下拉搜索选中，按钮布局对齐
3. 用量趋势图表重设计 — 仅展示 tokens + 请求数折线图，多用户多线条

## Context Analysis
### Reference Code
- 模型广场页面: `one-api/web/berry/src/views/ModelMarket/index.js`
- 用量报表页面: `one-api/web/berry/src/views/Report/` (index.js, ReportFilter.js, SummaryCards.js, TrendChart.js, TokenUsageTable.js)
- 报表 API: `one-api/controller/report.go` — `GET /api/user/report`
- 模型 API: `one-api/controller/model.go` — `GET /api/user/available_models`, `GET /api/models`
### Related Documents
### Related Features
- feat-model-marketplace (归档 2026-05-18) — 模型广场原始实现
- feat-usage-report (归档 2026-05-18) — 用量报表原始实现
- feat-frontend-redesign (归档 2026-05-12) — 前端 UI 框架和组件库

## Technical Solution
<!-- Split parent — no direct code changes -->

## Acceptance Criteria (Gherkin)
### User Story
作为用户，我希望门户页面信息更丰富、交互更便捷。
### Scenarios (Given/When/Then)
<!-- See children features for detailed scenarios -->
### UI/Interaction Checkpoints (if frontend)
### General Checklist
