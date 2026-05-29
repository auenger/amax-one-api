# Tasks: feat-skill-version-upgrade

## Task Breakdown

### 1. 数据模型 — 版本关联与归档字段
- [x] Skill 模型新增 `ParentVersionId` 字段（指向该 Skill 的前一版本 ID）
- [x] Skill 模型新增 `IsArchived` 字段（标记是否为归档版本）
- [x] 数据库迁移脚本（GORM AutoMigrate）
- [x] 新增 `GetSkillVersionHistory()` 方法（按 ParentVersionId 链查询版本链）

### 2. 后端 API — 版本升级接口
- [x] 新增 `POST /api/skill/upgrade` 接口（接收 skill_id + multipart 文件）
- [x] 升级逻辑：创建新 Skill 记录 + 老记录标记 IsArchived + 更新 ParentVersionId
- [x] 新增 `GET /api/skill/:id/versions` 接口（返回版本历史列表）
- [x] 升级权限校验（仅作者/管理员可升级）

### 3. 前端 — Skill Card 升级按钮
- [x] SkillCard 组件新增"升级"图标按钮（权限判断：仅作者/管理员可见）
- [x] 点击升级按钮触发 UploadDialog，预填 Skill 信息
- [x] UploadDialog 新增 upgrade 模式：隐藏名称/项目字段（继承原 Skill）
- [x] 版本号自动递增逻辑

### 4. 前端 — 版本历史展示
- [x] SkillCard 底部新增版本历史折叠区
- [x] 版本列表按版本号降序排列
- [x] 归档版本样式区分（灰色标签、禁用操作）
- [x] 历史版本下载功能

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-28 | Feature created | 需求文档初始化 |
