# AIHub 主页重构计划

## 目标
创建一个独立的 `index.html` 落地页，替换当前 Berry SPA 的空壳首页。

## 设计参考
- **背景**: 深蓝渐变色（保留现有品牌色系）
- **参考效果**: agentszone.ai 的 `pointer-events-none absolute -top-10 -right-20` 网络节点 SVG 动画
- **核心主题**: 多模型 All-in-One，支持 OpenAI + Anthropic 双协议

## 页面结构

### 1. Hero Section
- 全屏深蓝渐变背景（`#0a0e27` → `#1a1a4e` → `#0d1b3e`）
- 右上角放置 agentszone 风格的网络节点 SVG（pointer-events-none, absolute 定位）
  - 中心节点 = "AIHub"，代表聚合中心
  - 外围节点 = 各 AI 供应商（OpenAI, Anthropic, Google, AWS, etc.）
  - 带脉冲动画的连接线和流动粒子
- 左侧文字内容：
  - 标语 badge："多模型 All-in-One AI 管理平台"
  - 主标题："统一 API，聚合一切 AI 能力"
  - 副标题：支持 OpenAI 和 Anthropic 双协议兼容
  - CTA 按钮

### 2. 双协议展示 Section
- 左右对称布局
- 左：OpenAI 协议（绿色系标识）
  - `/v1/chat/completions` 兼容
  - GPT-4o, GPT-4, o1, o3 等模型
- 右：Anthropic 协议（橙色系标识）
  - `/v1/messages` 兼容
  - Claude Opus, Sonnet, Haiku 等模型
- 中间连接线/图标表示"统一入口"

### 3. 供应商网格 Section
- 展示 38 个供应商 logo/名称
- 网格布局，hover 效果

### 4. 功能特性 Section
- 4-6 个功能卡片（智能路由、并发追踪、配额监控、用量报表等）

### 5. 统计数据 Section
- 关键数字展示（38 供应商、4 级角色、双协议等）

### 6. Footer
- 简洁 footer

## 技术方案

### 文件位置
`one-api/web/berry/public/index.html` — 直接替换 Berry 主题的 index.html 模板

### 实现方式
- 纯 HTML + 内联 CSS + 内联 JS（零外部依赖）
- Tailwind-style 的自定义 CSS（不引入 Tailwind CDN）
- SVG 内联绘制网络动画效果
- CSS 动画实现脉冲和粒子效果
- 响应式设计

### 构建集成
- 替换 `one-api/web/berry/public/index.html`
- `npm run build` 时 CRA 会自动复制 public 目录下的文件
- `rebuild.sh` 会自动编译嵌入到 Go 二进制

## SVG 网络动画设计
模仿 agentszone.ai 的效果但适配 AIHub 主题：
- 中心核心节点（AIHub）— 蓝色光晕
- 6 个主要节点：OpenAI（绿色）、Anthropic（橙色）、Google（蓝色）、AWS（黄色）、百度（红色）、阿里（紫色）
- 轨道椭圆（虚线）
- 连接线（贝塞尔曲线，低透明度）
- 流动粒子（沿连接线移动的小圆点）
- 脉冲环（节点呼吸动画）
- 全部 `pointer-events: none` + `absolute` 定位在右上角
