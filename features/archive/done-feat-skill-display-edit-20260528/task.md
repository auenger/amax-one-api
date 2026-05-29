# Tasks: feat-skill-display-edit
## Task Breakdown
### 1. 后端：模型字段扩展
- [x] Skill 模型新增 display_mode 字段（string, default "content"）
- [x] GORM AutoMigrate 自动迁移
- [x] UpdateSkill Select 字段列表添加 display_mode
- [x] UpdateSkill JSON 模式支持 display_mode 更新

### 2. 前端：DetailDialog 展示模式切换
- [x] 添加 ToggleButtonGroup（skill.md / 描述）
- [x] 默认值读取 skill.display_mode
- [x] 切换显示对应内容（MarkdownRenderer 渲染）
- [x] 无内容时显示占位文本

### 3. 前端：编辑功能
- [x] SkillCard 添加编辑按钮（owner/admin 可见）
- [x] 创建 EditSkillDialog 组件
- [x] 描述多行编辑 + MD 预览
- [x] 展示模式下拉选择
- [x] 调用 PUT /api/skill/:id 保存

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-28 | Created | 等待 feat-skill-md-render 完成 |
| 2026-05-28 | Implemented | 全部任务完成，Go vet 通过，前端构建通过（预存在 ChannelConstants.js 警告） |
