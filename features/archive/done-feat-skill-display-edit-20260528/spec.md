# Feature: feat-skill-display-edit Skill 展示模式与编辑

## Basic Information
- **ID**: feat-skill-display-edit
- **Name**: Skill 展示模式与编辑
- **Priority**: 70
- **Size**: S
- **Dependencies**: feat-skill-md-render
- **Parent**: feat-skill-market-ux
- **Children**: []
- **Created**: 2026-05-28

## Description
DetailDialog 增加展示模式切换（skill.md 内容 / 描述文本），描述支持长文本 Markdown。上传人可以编辑 Skill 的描述和展示模式偏好。

## User Value Points
- 浏览者可以在详情弹窗中切换查看 skill.md 原始内容或作者编写的描述
- 上传者可以编辑自己上传的 Skill 的描述和展示方式

## Context Analysis
### Reference Code
- `one-api/web/berry/src/views/SkillMarket/index.js:893-943` — DetailDialog 当前实现
- `one-api/controller/skill.go:338-465` — UpdateSkill 接口
- `one-api/model/skill.go:21-43` — Skill 模型（当前无 display_mode 字段）

### Related Documents

### Related Features
- feat-skill-md-render — 前置依赖，提供 MD 渲染能力

## Technical Solution

### 后端改动
1. **Skill 模型新增字段**：
   - `display_mode` (string, `gorm:"size:16;default:'content'"`) — 可选值：`content`（默认，显示 skill.md）或 `description`（显示描述）
   - GORM AutoMigrate 自动添加列
2. **UpdateSkill 扩展**：
   - 支持 `display_mode` 字段更新
   - 支持 `description` 长文本更新（已有 text 类型）

### 前端改动
1. **DetailDialog 展示模式切换**：
   - 添加 Toggle 按钮组：`skill.md` | `描述`
   - 默认展示模式读取 skill.display_mode
   - 切换时无需请求后端，纯前端切换显示内容
   - 两处内容都使用 MarkdownRenderer 渲染
2. **编辑功能**：
   - SkillCard 对 owner/admin 显示编辑按钮
   - 编辑弹窗（EditSkillDialog）：
     - 描述编辑（多行文本，支持 MD 预览）
     - 展示模式选择（下拉：skill.md / 描述）
     - 调用 PUT /api/skill/:id 更新

## Acceptance Criteria (Gherkin)
### User Story
作为 Skill 浏览者，我可以切换查看 skill.md 内容或作者描述。作为 Skill 上传者，我可以编辑描述和展示偏好。

### Scenarios (Given/When/Then)
#### Scenario 1: 默认展示 skill.md
```gherkin
Given 一个 Skill 的 display_mode 为 "content"
When 用户点击 Skill 卡片打开详情
Then 详情弹窗默认显示 skill.md 内容（Markdown 渲染）
```

#### Scenario 2: 切换到描述模式
```gherkin
Given 用户在 Skill 详情弹窗中
When 用户点击"描述"切换按钮
Then 弹窗切换显示 Skill 的 description 内容（Markdown 渲染）
  And 切换按钮高亮当前模式
```

#### Scenario 3: 编辑描述
```gherkin
Given 用户是 Skill 的上传者（或管理员）
When 用户点击编辑按钮
Then 弹出编辑对话框
  And 描述字段为多行文本框
  And 可以修改描述内容
  And 点击保存后描述更新成功
```

#### Scenario 4: 编辑展示模式
```gherkin
Given 用户在 Skill 编辑对话框中
When 用户修改展示模式为 "description"
Then 保存后其他用户查看该 Skill 时默认显示描述
```

#### Scenario 5: 无描述时展示模式切换
```gherkin
Given 一个 Skill 没有描述（description 为空）
When 用户在详情弹窗中切换到"描述"模式
Then 显示"暂无描述"占位文本
```

### UI/Interaction Checkpoints
- DetailDialog 顶部有清晰的 Toggle 按钮组
- 编辑按钮仅在 SkillCard 中对 owner/admin 可见
- 编辑弹窗支持 MD 预览
- 保存成功后 toast 提示

### General Checklist
- [x] display_mode 数据库迁移兼容
- [x] 旧数据默认 display_mode = "content"
- [x] 编辑权限校验（owner 或 admin）
- [x] npm run build 成功

## Merge Record
- **Completed**: 2026-05-28
- **Branch**: feature/skill-display-edit
- **Merge Commit**: af8f05f
- **Archive Tag**: feat-skill-display-edit-20260528
- **Conflicts**: stash pop conflict in SkillMarket/index.js (resolved: kept onEdit prop, merged user prop on InstallDialog)
- **Verification**: PASSED (5/5 Gherkin scenarios, 13/13 tasks)
- **Stats**: 1 commit, 3 files changed (185 insertions, 22 deletions), ~5min
