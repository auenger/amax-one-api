# Tasks: feat-skill-marketplace

## Task Breakdown

### 1. Backend - Model
- [x] 创建 `one-api/model/skill.go`，定义 Skill struct（GORM 模型）
- [x] 实现 CRUD 方法：CreateSkill, GetSkill, GetAllSkills, SearchSkills, GetUserSkills, UpdateSkill, DeleteSkill
- [x] 在 `one-api/model/main.go` 的 createTable 中注册 Skill 表
- [x] 实现 DownloadSkill 方法（下载计数 +1，返回文件内容）

### 2. Backend - Controller
- [x] 创建 `one-api/controller/skill.go`，实现 HTTP 处理函数
- [x] GetAllSkills — 分页获取所有 enabled skill（支持搜索、分类筛选）
- [x] SearchSkills — 按名称模糊搜索
- [x] GetUserSkills — 获取当前用户的 skill 列表
- [x] GetSkill — 获取单个 skill 详情
- [x] CreateSkill — 创建/上传 skill（含文件类型校验：仅 YAML/MD）
- [x] UpdateSkill — 更新 skill（仅创建者可操作）
- [x] DeleteSkill — 删除 skill（创建者或管理员可操作）
- [x] DownloadSkill — 下载 skill 文件（下载计数 +1）
- [x] GetInstallCommand — 生成一键安装 curl 命令（拼接 base_url + token + file_name）

### 3. Backend - Router
- [x] 在 `one-api/router/api.go` 注册 skill 路由组
- [x] 浏览/搜索/详情/下载路由使用 UserAuth 中间件
- [x] 删除路由：UserAuth 中检查权限（创建者或管理员）

### 4. Frontend - 页面组件
- [x] 创建 `views/SkillMarket/index.js` — Skill 市场主页面
- [x] 搜索栏 + 分类标签筛选
- [x] Skill 卡片网格（名称、描述、作者、分类、下载次数）
- [x] 上传对话框（表单：名称、描述、分类、文件上传）
- [x] Skill 详情弹窗（内容预览 + 下载按钮 + 一键安装按钮）
- [x] 一键安装对话框：显示 curl 命令，一键复制，含使用说明
- [x] 管理员/创建者：显示删除按钮

### 5. Frontend - 路由与导航
- [x] 在路由配置中注册 SkillMarket 页面
- [x] 在侧边栏菜单中添加「Skill 市场」入口
- [x] 添加 API 调用函数（直接使用 utils/api.js 的 API 对象）

### 6. 集成与构建
- [ ] 前端构建并嵌入 Go 二进制（rebuild.sh）
- [ ] 手动测试所有场景
- [ ] 验证权限控制（普通用户 vs 管理员）
- [ ] 手动测试一键安装：复制 curl 命令在终端执行，验证文件下载到 .claude/skills/

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-27 | Feature created | 需求收集完成，文档生成 |
| 2026-05-27 | Implementation complete | 后端 Model + Controller + Router + 前端全部实现 |
