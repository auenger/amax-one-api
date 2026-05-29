# Feature: feat-skill-project-org 项目组织与协作权限

## Basic Information
- **ID**: feat-skill-project-org
- **Name**: 项目组织与协作权限
- **Priority**: 65
- **Size**: M
- **Dependencies**: []
- **Parent**: feat-skill-marketplace-v2
- **Children**: []
- **Created**: 2026-05-27

## Merge Record
- **Completed**: 2026-05-28
- **Branch**: feature/skill-project-org
- **Merge Commit**: ab2e893
- **Merged To**: main
- **Archive Tag**: feat-skill-project-org-20260528
- **Conflicts**: none
- **Verification**: passed (7/7 Gherkin scenarios)
- **Stats**: 1 commit, 7 files changed

## Description

引入 SkillProject 模型作为 Skill 的组织容器，建立二级浏览结构（项目→Skill），实现协作式权限模型。

核心需求：
1. 用户可创建项目（全局唯一名称），所有项目全局可见
2. 用户可删除/修改自己的项目，Admin 可操作所有项目
3. Skill 必须归属某个项目，名称在项目内唯一
4. 任意用户可在任何项目下上传 Skill
5. 仅 Skill 作者/Admin 可删除/修改该 Skill

## User Value Points
1. **项目组织** — 二级结构（项目→Skill），全局可见，全局唯一名称
2. **协作权限** — 跨项目上传，作者/Admin 删除/修改权限隔离

## Context Analysis
### Reference Code
- `one-api/model/skill.go` — 现有 Skill 模型，需增加 ProjectId 字段
- `one-api/model/main.go:175` — AutoMigrate 注册点
- `one-api/controller/skill.go` — 现有 10 个 handler，需改造
- `one-api/router/api.go:172-186` — 路由注册
- `one-api/web/berry/src/views/SkillMarket/index.js` — 前端页面
- `one-api/model/channel.go` — 参考 Channel 模型的权限检查模式（UserId + Role）

### Related Features
- feat-skill-marketplace（已完成，基础 Skill CRUD）

## Technical Solution

### 数据模型

**新增 SkillProject 表**（`one-api/model/skill_project.go`）：

```go
type SkillProject struct {
    Id           int    `json:"id" gorm:"primaryKey"`
    UserId       int    `json:"user_id" gorm:"index"`
    UserName     string `json:"user_name" gorm:"-"`
    Name         string `json:"name" gorm:"uniqueIndex;size:128;not null"`
    Description  string `json:"description" gorm:"type:text"`
    Status       int    `json:"status" gorm:"default:1"`
    SkillCount   int    `json:"skill_count" gorm:"-"`
    CreatedTime  int64  `json:"created_time"`
    UpdatedTime  int64  `json:"updated_time"`
}
```

**修改 Skill 表**（`one-api/model/skill.go`）：
- 新增 `ProjectId int` 字段（索引，FK → SkillProject）
- 名称唯一约束从全局改为 `(ProjectId, Name)` 联合唯一

### API 设计

```
# 项目 CRUD
POST   /api/skill-project/          创建项目
GET    /api/skill-project/          列表（分页，?p=N&keyword=X）
GET    /api/skill-project/:id       详情（含 SkillCount）
PUT    /api/skill-project/:id       更新（仅作者/Admin）
DELETE /api/skill-project/:id       删除（仅作者/Admin，需项目下无 Skill）

# Skill CRUD（改造现有）
POST   /api/skill/                  创建（需传 project_id）
GET    /api/skill/?project_id=N     列表（按项目过滤）
GET    /api/skill/:id               详情
PUT    /api/skill/:id               更新（仅作者/Admin）
DELETE /api/skill/:id               删除（仅作者/Admin）
```

### 前端改造

将 `SkillMarket` 页面改为两级浏览：
1. **项目列表视图**（默认）：展示所有项目卡片，含创建按钮
2. **项目详情视图**：进入项目后展示该项目下的 Skill 列表

使用 URL 参数或 state 管理视图切换（如 `/panel/skills?project=N`）。

## Acceptance Criteria (Gherkin)

### User Story
作为一个平台用户，我想要在项目文件夹中组织 Skill，并能在他人项目下贡献 Skill，以便高效协作和分享。

### Scenarios (Given/When/Then)

```gherkin
Scenario: 创建项目
  Given 用户已登录
  When 用户提交项目名称 "Claude Code Tools" 和描述
  Then 系统创建项目并返回项目信息
  And 项目对所有人可见

Scenario: 项目名称全局唯一
  Given 已存在项目 "Claude Code Tools"
  When 用户尝试创建同名项目
  Then 系统返回错误 "项目名称已存在"

Scenario: 删除他人项目被拒
  Given 用户 A 创建了项目 "Tools"
  And 用户 B 已登录（非 Admin）
  When 用户 B 尝试删除项目 "Tools"
  Then 系统返回 403 权限不足

Scenario: 在他人项目下上传 Skill
  Given 用户 A 创建了项目 "Tools"
  And 用户 B 已登录
  When 用户 B 在项目 "Tools" 下上传 Skill
  Then 系统创建成功，Skill 作者为用户 B

Scenario: 删除他人 Skill 被拒
  Given 用户 B 在项目 "Tools" 下上传了 Skill "my-skill"
  And 用户 A 已登录（非 Admin）
  When 用户 A 尝试删除 Skill "my-skill"
  Then 系统返回 403 权限不足

Scenario: 删除非空项目被拒
  Given 项目 "Tools" 下存在 3 个 Skill
  When 项目所有者尝试删除项目
  Then 系统返回错误 "项目下存在 Skill，无法删除"

Scenario: Admin 可删除任何项目和 Skill
  Given Admin 用户已登录
  When Admin 删除任意项目或 Skill
  Then 操作成功
```

### UI/Interaction Checkpoints
- [ ] 项目列表页展示所有项目卡片
- [ ] 点击项目卡片进入项目详情（Skill 列表）
- [ ] 创建项目对话框（名称 + 描述）
- [ ] 返回按钮回到项目列表
- [ ] 删除/修改按钮仅对作者/Admin 可见

### General Checklist
- [ ] GORM AutoMigrate 注册 SkillProject
- [ ] 现有 Skill 数据迁移（分配默认项目或要求用户选择）
- [ ] API 遵循 `{ success, message, data }` 格式
- [ ] 分页参数一致（page + page_size）
