# Tasks: feat-skill-batch-upload
## Task Breakdown
### 1. 拖拽上传区域
- [x] 在 UploadDialog 中添加拖拽区域组件 (dropZoneRef, IconDragDrop)
- [x] 处理 onDragOver/onDragLeave/onDrop 事件 (handleDragOver, handleDragLeave, handleDrop)
- [x] 拖拽时视觉反馈（边框高亮 via dragActive state）

### 2. 多文件选择
- [x] 文件上传模式添加 multiple 属性 (input multiple accept=".md,.zip")
- [x] 文件夹上传模式支持多目录选择 (dirMap grouping in handleFolderSelect)
- [x] 文件列表展示（可删除单个文件 via removeFile + IconX）

### 3. 批量上传逻辑
- [x] 逐文件调用 CreateSkill API (uploadSingle helper)
- [x] 批量进度条组件（已完成/总数 via batchProgress + LinearProgress）
- [x] 单个文件失败错误显示，不影响其他文件 (独立 try/catch per file)
- [x] 全部完成后关闭弹窗并刷新列表 (onCreated callback)

### 4. 多目录处理
- [x] 检测每个目录独立打包为 ZIP (dirMap + JSZip per directory)
- [x] 目录名作为 Skill 名称 (entry.name = dirName)

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-28 | Created | 等待 feat-skill-md-render 完成 |
| 2026-05-28 | Implemented | UploadDialog 重构: 拖拽 + 多文件 + 批量上传 + 多目录 |
| 2026-05-28 | Verified | Frontend build pass, all Gherkin scenarios validated |
