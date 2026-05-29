# Tasks: feat-skill-project-org
## Task Breakdown

### 1. 后端模型层
- [x] 创建 `one-api/model/skill_project.go`：SkillProject 模型 + CRUD 方法
- [x] 修改 `one-api/model/skill.go`：增加 ProjectId 字段，调整唯一约束为 (ProjectId, Name)
- [x] 注册 AutoMigrate：`one-api/model/main.go` 添加 SkillProject{}
- [x] 现有数据迁移方案：为已存在的 Skill 创建默认项目

### 2. 后端控制器
- [x] 创建 `one-api/controller/skill_project.go`：项目 CRUD handler（5 个）
- [x] 修改 `one-api/controller/skill.go`：CreateSkill 接受 project_id，权限检查调整
- [x] GetUserSkills 改为按项目过滤，GetAllSkills 支持 project_id 参数

### 3. 路由注册
- [x] `one-api/router/api.go`：注册 /api/skill-project/ 路由组（5 条）
- [x] 更新 /api/skill/ 路由以支持 project_id 参数

### 4. 前端页面
- [x] 改造 `SkillMarket/index.js` 为两级浏览结构
- [x] 项目列表视图（卡片网格 + 创建对话框）
- [x] 项目详情视图（Skill 列表 + 返回按钮）
- [x] 权限控制：删除/修改按钮仅作者/Admin 可见

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-28 | Implementation complete | All 4 task groups done, Go vet passes |
| 2026-05-27 | Feature created | 子特性 1：项目组织与权限 |
