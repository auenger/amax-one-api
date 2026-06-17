# Tasks: feat-glm-time-downgrade

## Task Breakdown

### 1. 配置层 — config.go 添加全局变量
- [x] 添加 TimeDowngradeEnabled / TimeDowngradeChannelType / TimeDowngradeTimeWindow / TimeDowngradeTargetModel

### 2. 选项注册 — option.go
- [x] InitOptionMap() 注册 4 个 key
- [x] updateOptionMap() 添加解析逻辑

### 3. 核心逻辑 — monitor/time_downgrade.go（新建）
- [x] 实现 CheckTimeDowngrade(channelType int) string
- [x] 北京时间窗口判断

### 4. Distributor 集成
- [x] middleware/distributor.go 在 fallback 和配额降级之间插入时间降级

### 5. 前端 UI — DowngradeRules/index.js
- [x] 新增「定时降级」Card（Switch + 渠道类型 Select + 时间输入 + 模型输入 + 保存按钮）
- [x] 加载/保存配置逻辑

### 6. 编译验证
- [x] Go 编译通过
- [x] 前端构建通过
- [x] rebuild.sh 全流程通过

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-06-11 | Feature created | 需求确认，方案更新为 UI 配置 |
| 2026-06-11 | 全部实现完成 | 后端 4 文件修改 + 前端 1 文件修改，rebuild 通过 |
