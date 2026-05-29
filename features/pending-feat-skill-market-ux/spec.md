# Feature: feat-skill-market-ux Skill 市场 UI 优化

## Basic Information
- **ID**: feat-skill-market-ux
- **Name**: Skill 市场 UI 优化
- **Priority**: 70
- **Size**: L
- **Dependencies**: feat-skill-version-upgrade
- **Parent**: null
- **Children**: [feat-skill-md-render, feat-skill-batch-upload, feat-skill-display-edit]
- **Created**: 2026-05-28

## Description
Skill 市场多项 UX 优化，包括 Markdown 渲染、批量/拖拽上传、展示模式切换和编辑功能。

## User Value Points
1. **MD 渲染** — 弹窗和预览中的 Markdown 内容从原始文本变为渲染后富文本
2. **批量上传** — 支持多选文件（每个目录=独立 Skill）和拖拽文件上传
3. **展示模式切换 + 编辑** — 可切换查看 skill.md / 描述，上传人可编辑

## Context Analysis
### Reference Code
- `one-api/web/berry/src/views/SkillMarket/index.js` — 前端主文件（~1270 行）
- `one-api/controller/skill.go` — 后端 Skill CRUD
- `one-api/model/skill.go` — Skill 数据模型

### Related Documents
- `one-api/web/berry/package.json` — 前端依赖管理

### Related Features
- feat-skill-version-upgrade (2026-05-28) — 最近 Skill 变更
- feat-skill-multi-format (2026-05-28) — 多格式上传基础
- feat-skill-marketplace (2026-05-27) — 初始 marketplace

## Technical Solution
<!-- To be filled during implementation -->

## Acceptance Criteria (Gherkin)
### User Story
作为 Skill 市场用户，我希望在浏览和上传 Skill 时获得更好的阅读和操作体验。

### Scenarios (Given/When/Then)
See sub-features for detailed scenarios.

### UI/Interaction Checkpoints
- DetailDialog 中 MD 内容正确渲染（标题、列表、代码块、链接）
- 上传对话框支持拖拽文件和多选
- 展示模式 toggle 切换流畅
- 编辑描述保存后立即反映

### General Checklist
- [ ] react-markdown 依赖添加
- [ ] 前端构建无错误
- [ ] 后端 API 兼容旧数据
