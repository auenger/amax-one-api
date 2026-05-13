# Tasks: feat-rebuild-frontend

## Task Breakdown

### 1. 品牌定制
- [x] 替换 logo.png (created logo.svg, updated utils.js default logo path)
- [x] 配置系统名称 (updated default to 'AIHub' in utils.js)
- [x] 自定义 CSS 主题色 (added CSS variables and AIHub brand overrides in index.css)
- [x] 修改页脚（保留 one-api 署名）(updated Footer.js with AIHub branding + one-api attribution)

### 2. 审批流页面
- [x] 新增 TokenRequestsTable.js 组件
- [x] 新增 TokenRequest/index.js (Admin 审批列表)
- [x] 新增 TokenRequest/MyRequests.js (用户申请页)
- [x] 更新 Header.js 添加菜单项 (approvals + my requests)
- [x] API 对接后端审批接口 (token_request API endpoints)

### 3. Channel 预算展示
- [x] 修改 ChannelsTable.js 添加预算列
- [x] 添加预算进度条组件 (CSS + renderBudget function)
- [x] 修改 Channel 编辑对话框 (budget_total field)

### 4. Dashboard 增强（可选）
- [ ] 预算消耗趋势
- [ ] 模型调用分布

### 5. 验证
- [x] npm run build 成功
- [ ] 前端嵌入后端运行正常
- [ ] 所有页面功能正常

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-13 | Tasks 1-3 completed | Brand customization, approval pages, budget display implemented |
| 2026-05-13 | Build verified | npm run build succeeds, only pre-existing warnings |
