# Feature: feat-skill-version-upgrade Skill 版本升级与归档

## Basic Information
- **ID**: feat-skill-version-upgrade
- **Name**: Skill 版本升级与归档
- **Priority**: 70
- **Size**: M
- **Dependencies**: feat-skill-marketplace, feat-skill-multi-format
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-28

## Description
Skill 市场支持版本升级流程：用户在 Skill Card 上点击"升级"按钮，选择已有 Skill 进行版本升级上传。上传完成后，新版本成为当前活跃版本，老版本自动归档为版本历史记录，在 Card 内以折叠/列表形式展示。

## User Value Points

### VP1: Skill 版本升级
用户可以基于已有 Skill 发布新版本。通过 Skill Card 上的"升级"按钮触发升级流程，选择文件后系统自动关联为该 Skill 的升级版本，版本号自动递增（或用户自定义）。

### VP2: 版本归档展示
升级后老版本不丢失，自动变为归档记录。在 Skill Card 中以版本历史列表形式展示，用户可查看历史版本、下载历史版本。

## Context Analysis

### Reference Code
- `one-api/model/skill.go` — Skill 模型，已有 `Version` 字段（max 32 chars）
- `one-api/controller/skill.go` — Skill CRUD + 上传逻辑，支持 multipart（md/zip）
- `one-api/web/berry/src/views/SkillMarket/index.js` — 前端 SkillCard + UploadDialog 组件
- `one-api/model/skill_project.go` — SkillProject 模型

### Related Documents
- Skill 已有 Version 字段但无版本关联逻辑
- 上传支持 md/zip 两种格式（feat-skill-multi-format）

### Related Features
- feat-skill-marketplace（Skill Marketplace 基础）
- feat-skill-multi-format（多格式上传）
- feat-skill-project-org（项目组织）

## Technical Solution
<!-- To be filled during implementation -->

## Acceptance Criteria (Gherkin)

### User Story
作为一个 Skill 作者，我希望能够对我已发布的 Skill 进行版本升级，这样用户始终能获取最新版本，同时保留历史版本记录。

### Scenarios (Given/When/Then)

#### Scenario 1: 升级 Skill 版本
```gherkin
Given 用户已登录且拥有至少一个已发布的 Skill
When 用户在 Skill Card 上点击"升级"按钮
Then 系统打开上传对话框，预填当前 Skill 信息（名称、项目、分类）
And 版本号自动递增（如 1.0 → 1.1）
And 用户选择新文件上传后系统创建新版本记录
And 新版本成为当前展示版本
```

#### Scenario 2: 老版本自动归档
```gherkin
Given 用户上传了一个 Skill 的新版本
When 升级操作完成
Then 老版本的 Skill 自动标记为 archived 状态
And Skill Card 展示最新版本信息
And Card 内可展开版本历史列表查看所有历史版本
```

#### Scenario 3: 查看历史版本
```gherkin
Given 一个 Skill 存在多个版本（当前版本 + 归档版本）
When 用户展开版本历史面板
Then 系统按版本号降序展示所有版本
And 每个版本显示版本号、上传时间、上传者
And 归档版本可单独下载
```

#### Scenario 4: 版本升级权限控制
```gherkin
Given 用户 A 是 Skill X 的作者
When 用户 B（非作者非管理员）查看 Skill X 的 Card
Then 用户 B 看不到"升级"按钮
And 用户 B 只能看到最新版本和版本历史
```

#### Scenario 5: 升级时保留项目关联
```gherkin
Given 用户升级一个属于项目 P 的 Skill
When 升级操作完成
Then 新版本仍然关联到项目 P
And Skill 在项目内的索引不变
```

### UI/Interaction Checkpoints
- Skill Card 新增"升级"图标按钮（仅作者/管理员可见）
- 点击升级按钮打开 UploadDialog，预填信息，版本号自动递增
- Skill Card 底部新增版本历史折叠区域（Accordion）
- 归档版本以灰色/禁用样式区分
- 版本历史中每个条目显示版本号 + 时间 + 下载按钮

### General Checklist
- [ ] 版本号格式校验（semver 风格或简单递增）
- [ ] 升级操作原子性（新版本创建 + 老版本归档在同一事务）
- [ ] 版本历史 API 分页支持
- [ ] 前端版本列表懒加载
