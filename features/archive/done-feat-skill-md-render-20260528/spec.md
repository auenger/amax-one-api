# Feature: feat-skill-md-render Skill Markdown 渲染

## Basic Information
- **ID**: feat-skill-md-render
- **Name**: Skill Markdown 渲染
- **Priority**: 70
- **Size**: S
- **Dependencies**: feat-skill-version-upgrade
- **Parent**: feat-skill-market-ux
- **Children**: []
- **Created**: 2026-05-28

## Description
在 Skill 市场的所有 MD 内容展示区域（详情弹窗、上传预览）引入 react-markdown 渲染，替代当前的纯文本 TextareaAutosize 显示。

## User Value Points
- 用户在查看 Skill 详情时看到渲染后的 Markdown（标题、列表、代码块、链接），而非原始文本
- 上传预览中也显示渲染后的 skill.md 内容

## Context Analysis
### Reference Code
- `one-api/web/berry/src/views/SkillMarket/index.js:893-943` — DetailDialog 使用 TextareaAutosize 显示 skill.content
- `one-api/web/berry/src/views/SkillMarket/index.js:784-808` — UploadDialog 预览使用 TextareaAutosize
- `one-api/web/berry/src/views/SkillMarket/index.js:907-909` — 描述使用纯 Typography 显示

### Related Documents

### Related Features
- feat-skill-multi-format — 引入了 skill.md 预览机制
- feat-skill-marketplace — 初始 DetailDialog 实现

## Technical Solution
1. 安装 `react-markdown` 和 `remark-gfm`（GitHub Flavored Markdown 支持）
2. 创建 `MarkdownRenderer` 内联组件，统一 MD 渲染样式（适配深色/浅色主题）
3. 替换 DetailDialog 中的 TextareaAutosize 为 MarkdownRenderer
4. 替换 UploadDialog 预览中的 TextareaAutosize 为 MarkdownRenderer（只读模式）
5. 样式处理：代码块语法高亮可选（`rehype-highlight` 或纯样式），链接安全处理

## Acceptance Criteria (Gherkin)
### User Story
作为 Skill 市场浏览者，我希望 Skill 详情弹窗中的内容以格式化的方式展示，方便阅读。

### Scenarios (Given/When/Then)
#### Scenario 1: 详情弹窗 MD 渲染
```gherkin
Given 用户在 Skill 市场项目列表中
When 用户点击某个 Skill 卡片
Then 弹窗中的 skill.md 内容应渲染为格式化 Markdown
  And 一级标题显示为大号粗体
  And 代码块显示为等宽字体带背景色
  And 列表项正确缩进显示
  And 链接可点击
```

#### Scenario 2: 上传预览 MD 渲染
```gherkin
Given 用户在上传 Skill 弹窗中选择了包含 skill.md 的文件
When 预览区域显示内容
Then skill.md 内容应以格式化 Markdown 显示
  And 而非原始文本字符串
```

#### Scenario 3: 深色/浅色主题适配
```gherkin
Given 系统当前使用深色主题
When 用户查看 Skill 详情弹窗
Then Markdown 渲染的代码块背景色应适配深色主题
  And 文字颜色与主题一致
```

### UI/Interaction Checkpoints
- DetailDialog 不再使用 TextareaAutosize，改用渲染后的 MD 视图
- 代码块有等宽字体和浅色/深色背景
- 链接可点击，新标签页打开

### General Checklist
- [ ] react-markdown + remark-gfm 添加到 package.json
- [ ] 深色/浅色主题适配
- [ ] 替换所有 TextareaAutosize（只读的）为 MD 渲染
- [ ] 前端构建无错误
