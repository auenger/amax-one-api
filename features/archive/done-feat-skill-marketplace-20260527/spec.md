# Feature: feat-skill-marketplace Skill Marketplace

## Basic Information
- **ID**: feat-skill-marketplace
- **Name**: Skill Marketplace
- **Priority**: 50
- **Size**: M
- **Dependencies**: none
- **Parent**: null
- **Children**: empty
- **Created**: 2026-05-27

## Description
在中转站（AIHub）中新增 Skill Marketplace 模块，用户可以创建 Skill 项目、上传 Claude Code Skill 配置文件（YAML/MD），其他用户可以浏览和下载。管理员可以删除任意 Skill。

Skill 是 Claude Code 的 skill 配置文件，类似 `.claude/skills/` 下的 YAML/MD 文件，包含 prompt 触发规则和指令模板。

## User Value Points
1. **Skill 项目管理** — 用户创建/编辑/管理自己的 skill 项目（上传 YAML/MD 文件）
2. **Skill 市场浏览** — 所有用户浏览、搜索、下载 skill
3. **一键安装** — curl 一键命令将 skill 安装到本地 `.claude/skills/` 目录
4. **管理员审核删除** — 管理员可删除任意 skill，维护市场秩序

## Context Analysis

### Reference Code
- **Model**: `one-api/model/token.go` — 标准 GORM CRUD 模式，分页/搜索/删除
- **Controller**: `one-api/controller/token.go` — 标准 JSON 响应 `{ success, message, data }`
- **Router**: `one-api/router/api.go:111-120` — Token 路由注册模式（UserAuth 分组）
- **Frontend**: `one-api/web/berry/src/views/ModelMarket/` — 现有市场页面，MUI 5 Card 布局
- **DB 初始化**: `one-api/model/main.go` — `createTable` 函数注册新模型

### Related Documents
- project-context.md — 项目架构、技术栈、规范

### Related Features
- feat-model-marketplace（归档）— 现有模型市场，UI 可参考
- feat-marketplace-card-enhance（归档）— 市场卡片增强
- feat-marketplace-flat-layout（归档）— 市场扁平布局

## Technical Solution

### Data Model
```go
type Skill struct {
    Id          int     `json:"id"`
    UserId      int     `json:"user_id" gorm:"index"`
    UserName    string  `json:"user_name" gorm:"-"` // join from User
    Name        string  `json:"name" gorm:"index"`
    Description string  `json:"description" gorm:"type:text"`
    Category    string  `json:"category" gorm:"size:64;index"`
    Content     string  `json:"content" gorm:"type:longtext"`  // skill 文件内容
    FileName    string  `json:"file_name" gorm:"size:256"`
    FileType    string  `json:"file_type" gorm:"size:16"`      // yaml / md
    Version     string  `json:"version" gorm:"size:32"`
    Downloads   int     `json:"downloads" gorm:"default:0"`
    Status      int     `json:"status" gorm:"default:1"`       // 1=enabled, 2=disabled
    CreatedTime int64   `json:"created_time" gorm:"bigint"`
    UpdatedTime int64   `json:"updated_time" gorm:"bigint"`
}
```

### API Design
```
GET    /api/skill/              — 浏览所有 skill（UserAuth，分页+搜索+分类筛选）
GET    /api/skill/search        — 搜索 skill（UserAuth）
GET    /api/skill/self          — 我的 skill 列表（UserAuth）
GET    /api/skill/:id           — 获取 skill 详情（UserAuth）
POST   /api/skill/              — 创建/上传 skill（UserAuth）
PUT    /api/skill/              — 更新自己的 skill（UserAuth）
DELETE /api/skill/:id           — 删除 skill（UserAuth 本人 或 AdminAuth）
GET    /api/skill/:id/download  — 下载 skill 文件（UserAuth，计数+1）
GET    /api/skill/:id/install   — 获取安装命令（UserAuth，返回 curl 一键命令）
```

### 一键安装设计

**安装命令格式：**
```bash
mkdir -p .claude/skills && curl -sS -H "Authorization: Bearer sk-xxx" \
  -o .claude/skills/{file_name} {base_url}/api/skill/{id}/download
```

**实现逻辑：**
1. 前端从详情页/卡片上的「一键安装」按钮获取安装命令
2. 命令中嵌入用户的当前 API Token（从前端 session 获取）
3. 命令中嵌入 AIHub 的 base_url（从系统配置获取）
4. 用户复制命令到终端执行，skill 文件直接下载到 `.claude/skills/` 目录
5. 下载同时计数 +1

**前端交互：**
- 卡片/详情页显示「一键安装」按钮（Terminal 图标）
- 点击弹出对话框，显示可复制的 curl 命令
- 对话框中包含说明文字：复制到项目根目录下的终端执行
- 文件名冲突提示：如果 `.claude/skills/{file_name}` 已存在，命令会覆盖

**安全考虑：**
- Token 通过 Authorization header 传递，不暴露在 URL 中
- download API 需要 UserAuth 认证

### Frontend
- 新增 `views/SkillMarket/` 页面（参考 ModelMarket 的 MUI 5 Card 布局）
- 菜单项：侧边栏新增「Skill 市场」入口
- 功能：搜索、分类筛选、上传对话框、详情查看、下载按钮、一键安装按钮
- 一键安装：点击弹出可复制的 curl 命令对话框，包含用户 Token 和服务器地址
- 管理员视图：额外的删除按钮

## Acceptance Criteria (Gherkin)

### User Story
作为一个 AIHub 用户，我想在 Skill Marketplace 中浏览和上传 Claude Code Skill，以便共享和复用 AI 工具配置。

### Scenarios (Given/When/Then)

#### 场景 1：用户上传 Skill
```gherkin
Given 用户已登录 AIHub
When 用户点击「上传 Skill」按钮并填写名称、描述、分类，上传 YAML/MD 文件
Then 系统保存 Skill 到数据库
And Skill 出现在市场列表中
And 响应返回 { success: true, message: "Skill 创建成功" }
```

#### 场景 2：用户浏览 Skill 市场
```gherkin
Given 用户已登录 AIHub
When 用户访问 Skill Marketplace 页面
Then 系统返回所有 enabled 状态的 Skill 列表（分页）
And 每个 Skill 卡片显示名称、描述、作者、分类、下载次数
```

#### 场景 3：用户搜索 Skill
```gherkin
Given 用户在 Skill Marketplace 页面
When 用户在搜索框输入关键词
Then 系统按名称模糊匹配返回结果
And 结果支持按分类筛选
```

#### 场景 4：用户下载 Skill
```gherkin
Given 用户已登录并浏览某个 Skill 详情
When 用户点击「下载」按钮
Then 系统返回 Skill 文件内容（原始 YAML/MD）
And 该 Skill 的下载计数 +1
```

#### 场景 5：用户删除自己的 Skill
```gherkin
Given 用户已登录且拥有某个 Skill
When 用户点击「删除」按钮并确认
Then 系统删除该 Skill
And 响应返回 { success: true, message: "Skill 已删除" }
```

#### 场景 6：管理员删除任意 Skill
```gherkin
Given 管理员已登录
When 管理员在 Skill 列表点击「删除」按钮
Then 系统删除该 Skill（无论创建者是谁）
And 响应返回 { success: true, message: "Skill 已删除" }
```

#### 场景 7：普通用户无法删除他人 Skill
```gherkin
Given 普通用户已登录且查看他人创建的 Skill
When 用户尝试删除该 Skill
Then 系统返回 403 错误
And 响应 { success: false, message: "无权限删除此 Skill" }
```

#### 场景 8：上传文件类型校验
```gherkin
Given 用户已登录
When 用户尝试上传非 YAML/MD 格式的文件
Then 系统返回错误 { success: false, message: "仅支持 YAML 和 Markdown 文件" }
```

#### 场景 9：一键安装 Skill
```gherkin
Given 用户已登录并浏览某个 Skill 详情
When 用户点击「一键安装」按钮
Then 系统显示包含 curl 命令的对话框
And 命令格式为 "mkdir -p .claude/skills && curl -sS -H 'Authorization: Bearer sk-xxx' -o .claude/skills/{file_name} {base_url}/api/skill/{id}/download"
And 用户可以一键复制该命令
```

#### 场景 10：curl 命令执行安装
```gherkin
Given 用户已获取一键安装命令
When 用户在项目根目录的终端执行该命令
Then skill 文件被下载到 .claude/skills/ 目录
And 文件内容与 marketplace 中的原始内容一致
And 该 Skill 的下载计数 +1
```

### UI/Interaction Checkpoints
- Skill 市场页面：顶部搜索栏 + 分类筛选标签 + 卡片网格布局
- 上传对话框：表单包含名称、描述、分类选择、文件上传
- 详情页/弹窗：展示完整 Skill 内容（代码预览）+ 下载按钮
- 我的 Skill 页面：用户管理自己上传的 skill 列表

### General Checklist
- 遵循现有 CRUD 模式（参考 token/channel）
- API 响应格式 `{ success: bool, message: string, data: ... }`
- GORM 跨数据库兼容（PostgreSQL/MySQL/SQLite）
- 前端使用 MUI 5 组件 + Berry 主题
- 前端改动后需 rebuild（go:embed）
