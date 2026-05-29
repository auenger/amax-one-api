# Tasks: feat-skill-multi-format
## Task Breakdown

### 1. 后端模型扩展
- [x] 修改 `one-api/model/skill.go`：增加 SkillType, Archive, ArchiveSize 字段
- [x] 更新 Skill.Insert/Update 以处理新字段

### 2. 后端控制器改造
- [x] 修改 `one-api/controller/skill.go` CreateSkill：
  - 支持 multipart/form-data 文件上传
  - .md 文件 → SkillType=simple，读取文本内容
  - .zip 文件 → SkillType=complex，校验大小(≤20MB)，提取 skill.md，存储 ZIP
  - ZIP 解压安全（禁止路径穿越）
- [x] 修改 DownloadSkill：
  - simple → 返回 text/markdown
  - complex → 返回 application/zip
- [x] 修改 UpdateSkill 支持文件更新

### 3. 前端依赖
- [x] 安装 jszip：`cd one-api/web/berry && npm install jszip`

### 4. 前端上传重构
- [x] 改造 UploadDialog 支持两种上传模式：
  - 文件选择（.md, .zip）
  - 文件夹选择（webkitdirectory + JSZip 打包）
- [x] JSZip 打包逻辑：读取文件夹内容 → 打包 → 检测 skill.md
- [x] skill.md 检测与描述提取
- [x] 无 skill.md 时的描述补充表单
- [x] 打包进度指示
- [x] 文件大小前端预校验（20MB）

### 5. 前端 Skill 卡片增强
- [x] 区分 simple/complex 类型标识（不同图标/chip）
- [x] 下载按钮适配（ZIP 图标 for complex）

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-28 | Implementation complete | All 5 task groups done, Go vet passes |
| 2026-05-27 | Feature created | 子特性 2：多格式 Skill |
