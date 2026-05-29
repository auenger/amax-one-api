# Feature: feat-skill-batch-upload Skill 批量上传与拖拽

## Basic Information
- **ID**: feat-skill-batch-upload
- **Name**: Skill 批量上传与拖拽
- **Priority**: 70
- **Size**: S
- **Dependencies**: feat-skill-md-render
- **Parent**: feat-skill-market-ux
- **Children**: []
- **Created**: 2026-05-28

## Description
支持 Skill 市场的批量上传功能：多选文件时每个目录自动创建为独立 Skill，同时支持拖拽文件进入上传区域。

## User Value Points
- 用户可以一次选择多个目录/文件，系统自动拆分为独立 Skill 创建
- 用户可以拖拽文件到上传区域，提升操作效率

## Context Analysis
### Reference Code
- `one-api/web/berry/src/views/SkillMarket/index.js:434-819` — UploadDialog 组件
- `one-api/controller/skill.go:159-335` — CreateSkill 后端接口（当前只支持单文件）
- `one-api/web/berry/src/views/SkillMarket/index.js:547-610` — handleFolderSelect 当前逻辑

### Related Documents
- `one-api/web/berry/package.json` — 已有 JSZip 依赖

### Related Features
- feat-skill-multi-format — 引入了文件夹上传和 ZIP 打包逻辑

## Technical Solution

### 前端改动
1. **UploadDialog 重构**：
   - 添加拖拽区域（onDragOver/onDrop 事件处理）
   - 多选模式：`<input multiple>` 允许选择多个 .md/.zip 文件
   - 文件夹多选：检测多个目录，每个目录独立打包为 ZIP
   - 添加 `BatchUploadProgress` 组件，显示批量上传进度
2. **批量创建逻辑**：
   - 前端遍历每个文件/目录，逐个调用 `/api/skill/` 接口
   - 显示每个文件的上传状态（成功/失败）
   - 全部完成后刷新列表

### 后端改动
- 无需改动后端（复用现有单文件 CreateSkill 接口，前端循环调用）

## Acceptance Criteria (Gherkin)
### User Story
作为 Skill 上传者，我希望可以一次选择多个文件/文件夹进行批量上传，也可以通过拖拽方式上传。

### Scenarios (Given/When/Then)
#### Scenario 1: 多文件选择批量上传
```gherkin
Given 用户点击"上传 Skill"按钮
When 用户选择多个 .md 文件（如 skill-a.md, skill-b.md）
Then 系统为每个文件创建一个独立的 Skill
  And 显示批量上传进度（2/2 完成）
  And 上传完成后列表自动刷新
```

#### Scenario 2: 多目录批量上传
```gherkin
Given 用户使用文件夹上传模式
When 用户选择了多个目录（如 skill-a/, skill-b/）
Then 每个目录被独立打包为 ZIP 并创建为独立 Skill
  And Skill 名称使用目录名
```

#### Scenario 3: 拖拽上传
```gherkin
Given 用户打开上传弹窗
When 用户拖拽一个 .zip 文件到拖拽区域
Then 文件被识别并显示在文件列表中
  And 可以继续添加更多文件或直接上传
```

#### Scenario 4: 拖拽多文件
```gherkin
Given 用户打开上传弹窗
When 用户拖拽多个 .md 文件到拖拽区域
Then 所有文件被列出
  And 点击上传后每个文件创建为独立 Skill
```

### UI/Interaction Checkpoints
- 拖拽区域有虚线边框和视觉提示
- 拖入文件时边框高亮
- 批量进度条显示当前上传进度
- 失败的文件显示错误信息，不影响其他文件

### General Checklist
- [ ] 拖拽上传区域样式与现有 UI 一致
- [ ] 批量上传进度反馈清晰
- [ ] 错误处理：单个文件失败不影响整体
- [ ] 文件夹多选每个目录独立 Skill
