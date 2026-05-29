# Feature: feat-skill-marketplace-v2 Skill Marketplace V2 重构

## Basic Information

* **ID**: feat-skill-marketplace-v2

* **Name**: Skill Marketplace V2 重构

* **Priority**: 65

* **Size**: L

* **Dependencies**: []

* **Parent**: null

* **Children**: [feat-skill-project-org, feat-skill-multi-format]

* **Created**: 2026-05-27

## Description

重构 Skill Marketplace，从扁平列表升级为项目文件夹组织的协作式 Skill 市场。

核心变更：

1. **项目文件夹**：用户可创建项目（全局唯一名称），所有项目全局可见

2. **协作权限**：可在他人项目下上传 Skill；仅作者/Admin 可删除/修改

3. **多格式 Skill**：支持单 md 文件和文件夹/zip 压缩包（含脚本、引用等），20MB 上限

4. **智能上传**：前端文件夹选择自动打包（JSZip），自动检测 skill.md，缺失时引导补充描述

## User Value Points

1. **项目组织** — 用户创建项目文件夹，全局可见，全局唯一名称；二级浏览结构（项目→Skill）

2. **协作权限** — 可在他人项目下上传 Skill；仅作者/Admin 可删除/修改自己的项目和 Skill

3. **多格式 Skill** — 单 md 文件 + 文件夹/zip 压缩包（含 skill.md + 脚本/引用等），20MB 上限

4. **智能上传** — 前端文件夹选择自动打包（JSZip）；自动检测 skill.md 存在性；缺失时引导补充描述

## Context Analysis

### Reference Code

* `one-api/model/skill.go` — 现有 Skill 模型（需改造，增加 ProjectId）

* `one-api/controller/skill.go` — 现有 Skill 控制器（10 个 handler）

* `one-api/router/api.go` — 路由注册（/api/skill/ 路径组）

* `one-api/web/berry/src/views/SkillMarket/index.js` — 前端页面（~502 行）

* `one-api/web/berry/src/menu-items/panel.js` — 侧边栏菜单

* `one-api/web/berry/src/routes/MainRoutes.js` — 路由配置

### Related Documents

* 现有 Skill Marketplace 归档 spec: `features/archive/done-feat-skill-marketplace-20260527/`

### Related Features

* feat-skill-marketplace（已完成归档，直接前序特性）

* feat-model-marketplace（模型广场，UI 模式参考）

## Technical Solution

## Acceptance Criteria (Gherkin)

### User Story

作为一个平台用户，我想要在组织良好的项目文件夹中浏览、上传和管理 Skill，以便更高效地共享和使用 Claude Code 技能。

### General Checklist

* [ ] 所有子特性完成并通过验证
* [ ] 前端 rebuild 成功
* [ ] 手动冒烟测试通过

⠀