# Feature: feat-skill-multi-format 多格式 Skill 与智能上传

## Basic Information
- **ID**: feat-skill-multi-format
- **Name**: 多格式 Skill 与智能上传
- **Priority**: 65
- **Size**: M
- **Dependencies**: [feat-skill-project-org]
- **Parent**: feat-skill-marketplace-v2
- **Children**: []
- **Created**: 2026-05-27

## Description

支持两种 Skill 上传格式：单 Markdown 文件和文件夹/ZIP 压缩包。实现前端文件夹自动打包（JSZip）、skill.md 智能检测、缺失时引导补充描述。

核心需求：
1. 简单 Skill：单个 skill.md 文件，直接存储文本内容
2. 复杂 Skill：ZIP 压缩包（含 skill.md + 脚本/引用等），存储原始 ZIP + 提取的 skill.md 预览
3. 前端支持文件夹选择，使用 JSZip 自动打包
4. 打包前检测是否包含 skill.md，缺失时引导用户补充描述
5. ZIP 大小限制 20MB

## User Value Points
1. **多格式 Skill** — 单 md + 文件夹/zip，20MB 上限，支持脚本和引用
2. **智能上传** — 文件夹自动打包、skill.md 检测、缺失引导补充

## Context Analysis
### Reference Code
- `one-api/model/skill.go` — 需增加 SkillType, Archive, ArchiveSize 字段
- `one-api/controller/skill.go` — CreateSkill/DownloadSkill 需改造支持 multipart 和 blob
- `one-api/web/berry/src/views/SkillMarket/index.js` — 上传对话框需重构
- `one-api/web/berry/package.json` — 需添加 jszip 依赖

### Related Features
- feat-skill-project-org（前序子特性，项目模型）
- feat-skill-marketplace（已完成，原始 Skill CRUD）

## Technical Solution

### 数据模型扩展

**修改 Skill 表**（`one-api/model/skill.go`）：

```go
type Skill struct {
    // ... 现有字段 ...
    ProjectId    int    `json:"project_id" gorm:"index;not null"`
    SkillType    string `json:"skill_type" gorm:"size:16;default:'simple'"` // simple | complex
    Archive      []byte `json:"-" gorm:"type:bytes"`                       // ZIP 原始数据（仅 complex）
    ArchiveSize  int64  `json:"archive_size"`                              // ZIP 字节大小
}
```

### 上传流程

**后端处理逻辑**（`controller/skill.go` CreateSkill）：

1. 接收 multipart/form-data（含 project_id + file + metadata）
2. 检查文件扩展名：
   - `.md` → SkillType="simple"，读取文件内容存入 Content
   - `.zip` → SkillType="complex"，校验大小（≤20MB），解压提取 skill.md 存入 Content，原始 ZIP 存入 Archive
3. 校验项目内名称唯一性
4. 创建记录

**下载逻辑**（DownloadSkill）：
- simple：返回 Content 文本（`text/markdown`）
- complex：返回 Archive ZIP（`application/zip`）

### 前端上传改造

**安装 JSZip**：`npm install jszip`

**上传对话框改造**：
1. 支持两种上传模式：
   - **文件选择**：accept `.md,.zip`
   - **文件夹选择**：`webkitdirectory` 属性 + JSZip 打包
2. 文件夹选择流程：
   - 用户选择文件夹
   - 前端读取所有文件，使用 JSZip 打包
   - 检测包内是否包含 `skill.md`
   - 有 skill.md：自动提取前几行作为描述
   - 无 skill.md：显示提示，引导用户补充名称和描述
3. 打包完成后上传至后端

## Acceptance Criteria (Gherkin)

### User Story
作为一个 Skill 开发者，我想要上传单个 Markdown 或整个文件夹作为 Skill，以便分享简单和复杂的 Claude Code 技能。

### Scenarios (Given/When/Then)

```gherkin
Scenario: 上传单文件 Skill
  Given 用户已登录并选择了项目
  When 用户上传 skill.md 文件
  Then 系统创建 Skill（SkillType=simple），Content 存储文件内容
  And 文件名作为 Skill 名称

Scenario: 上传 ZIP 压缩包 Skill
  Given 用户已登录并选择了项目
  When 用户上传包含 skill.md + scripts/ 的 ZIP 文件（≤20MB）
  Then 系统创建 Skill（SkillType=complex），提取 skill.md 内容到 Content，ZIP 存入 Archive

Scenario: ZIP 超过 20MB 被拒
  Given 用户上传 25MB 的 ZIP 文件
  Then 系统返回错误 "文件大小超过 20MB 限制"

Scenario: 文件夹选择自动打包
  Given 用户点击"上传文件夹"按钮
  When 用户选择包含 skill.md 的文件夹
  Then 前端使用 JSZip 自动打包为 ZIP
  And 自动提取 skill.md 内容填充描述字段
  And 上传至后端

Scenario: 文件夹无 skill.md 时引导补充
  Given 用户选择不包含 skill.md 的文件夹
  Then 前端打包完成后显示提示 "未找到 skill.md"
  And 显示名称和描述输入框供用户补充
  When 用户填写后确认上传
  Then 系统创建 Skill，用户填写的描述作为 Content

Scenario: 下载复杂 Skill
  Given 存在 SkillType=complex 的 Skill
  When 用户点击下载
  Then 系统返回完整 ZIP 压缩包

Scenario: 项目内 Skill 名称唯一
  Given 项目 "Tools" 下已存在 Skill "code-review"
  When 用户尝试上传同名 Skill
  Then 系统返回错误 "该项目下已存在同名 Skill"
```

### UI/Interaction Checkpoints
- [ ] 上传对话框支持拖拽 .md / .zip 文件
- [ ] "选择文件夹"按钮（webkitdirectory）
- [ ] 打包进度指示器
- [ ] skill.md 检测提示（有/无）
- [ ] 描述补充表单（无 skill.md 时）
- [ ] Skill 卡片区分 simple/complex 类型标识
- [ ] 下载按钮对 complex 类型显示 ZIP 图标

### General Checklist
- [ ] multipart 上传接口遵循项目 API 规范
- [ ] 20MB 大小校验（前后端双重验证）
- [ ] ZIP 解压安全：禁止路径穿越（../ 等）
- [ ] 前端 rebuild 成功

## Merge Record
- **Completed**: 2026-05-28
- **Merged Branch**: feature/skill-multi-format
- **Merge Commit**: ca85962
- **Archive Tag**: feat-skill-multi-format-20260528
- **Conflicts**: None
- **Verification**: passed (7/7 Gherkin scenarios, code analysis)
- **Stats**: 4 files changed, 637 insertions, 116 deletions, 1 commit
