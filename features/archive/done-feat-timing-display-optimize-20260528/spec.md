# Feature: feat-timing-display-optimize 计时日志展示优化

## Basic Information
- **ID**: feat-timing-display-optimize
- **Name**: 计时日志展示优化
- **Priority**: 85
- **Size**: M
- **Dependencies**: none
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-28

## Description

当前计时日志的列头（中间件/上游TTFB/流式/响应）过于技术化，内部用户看到总耗时后仍然觉得"中转慢了"。
实际上平台中转开销仅 11-23ms（占比 0.1%-0.4%），但现有展示无法直观传达这一点。

需要：
1. **普通日志页面 (Log)** 增加耗时列（总耗时 + 中转开销），让用户不用切换页面就能看到基本耗时信息
2. **计时日志页面 (TimingLog)** 全面优化展示：列头语义化、中转占比高亮、可视化增强，用业务语言替代技术术语

## User Value Points

### VP1: Log 列表增加耗时展示
普通日志页面新增"总耗时"和"中转开销"两列，所有用户（包括非技术用户）一眼可见平台开销极低。

### VP2: TimingLog 页面展示语义化
列头重命名 + 中转占比标注 + TimingBar 可视化增强，将技术术语转化为业务语言，消除"中转慢"的误解。

## Context Analysis

### Reference Code
- `one-api/model/log.go` — Log 模型（已有 ElapsedTime 字段）
- `one-api/model/timing.go` — RequestTiming 模型（5 阶段计时）
- `one-api/controller/relay.go` — recordTiming() 计时记录
- `one-api/controller/log.go` — Log API
- `one-api/controller/timing.go` — Timing API
- `one-api/web/berry/src/views/Log/component/TableHead.js` — Log 表头
- `one-api/web/berry/src/views/Log/component/TableRow.js` — Log 行
- `one-api/web/berry/src/views/TimingLog/component/TableHead.js` — TimingLog 表头
- `one-api/web/berry/src/views/TimingLog/component/TableRow.js` — TimingLog 行（含 TimingBar）

### Related Documents
- 归档 Feature: feat-request-timing-log（请求计时日志，已完成）

### Related Features
- feat-request-timing-log (archived 2026-05-25) — 本 Feature 在其基础上做展示优化

## Technical Solution

### VP1: Log 页面增加耗时列

**后端：**
- Log 模型新增 `ProxyMs int64` 字段（中转开销 = middleware_ms）
- `controller/relay.go` 的 `recordTiming()` 中同步更新 Log 的 ProxyMs
- Log API 返回时包含 ElapsedTime 和 ProxyMs

**前端：**
- `Log/TableHead.js` 新增"总耗时"和"中转开销"两列
- `Log/TableRow.js` 渲染耗时数据，中转开销用颜色标签（<50ms 绿色，<200ms 黄色，>=200ms 红色）

### VP2: TimingLog 页面展示优化

**列头语义化重命名：**
| 原列头 | 新列头 | 说明 |
|--------|--------|------|
| 中间件(ms) | 中转处理(ms) | 我们平台处理耗时 |
| 上游(TTFB)(ms) | 上游首字节(ms) | 等待供应商返回第一个字节 |
| 流式(ms) | 数据传输(ms) | 流式数据回传时间 |
| 响应(ms) | 响应回传(ms) | 发送最终响应 |
| 总耗时(ms) | 总耗时(ms) | 不变 |

**新增列：中转占比**
- 显示 middleware_ms / total_ms 的百分比
- 颜色规则：<1% 绿色优秀，<5% 蓝色良好，>=5% 橙色注意

**TimingBar 优化：**
- 每段显示百分比标签（如 "0.4%"）
- 中转段用醒目的蓝色 + "中转" 标签
- 上游等待段用橙色 + "上游等待" 标签
- 数据传输段用紫色 + "传输" 标签

**Tooltip 说明：**
- 鼠标悬浮列头时显示该阶段的含义解释

## Acceptance Criteria (Gherkin)

### User Story
作为平台管理员，我希望在日志页面直观看到中转开销占比，以便向团队成员证明平台中转速度极快，消除"中转慢"的误解。

### Scenarios (Given/When/Then)

#### Scenario 1: Log 列表显示耗时列
```gherkin
Given 用户打开日志页面
When 列表加载完成
Then 每行显示"总耗时"和"中转开销"两列
And 中转开销 < 50ms 时显示绿色标签
And 中转开销 >= 200ms 时显示红色标签
```

#### Scenario 2: TimingLog 列头语义化
```gherkin
Given 用户打开计时日志页面
When 表格加载完成
Then 列头显示"中转处理"、"上游首字节"、"数据传输"、"响应回传"、"总耗时"
And 鼠标悬浮列头显示该阶段的含义说明
```

#### Scenario 3: 中转占比标注
```gherkin
Given 用户打开计时日志页面
When 查看某条记录
Then 显示"中转占比"列
And 中转占比 < 1% 时显示绿色"优秀"标签
And 中转占比 < 5% 时显示蓝色"良好"标签
And 中转占比 >= 5% 时显示橙色"注意"标签
```

#### Scenario 4: TimingBar 百分比标签
```gherkin
Given 用户展开某条计时记录的详情
When TimingBar 可视化渲染完成
Then 每段时间上显示百分比标签
And 中转段标注"中转"文字
And 上游段标注"上游等待"文字
And 传输段标注"传输"文字
```

### UI/Interaction Checkpoints
- [ ] Log 页面新增列不影响现有列的显示
- [ ] TimingLog 列头重命名后筛选功能仍正常
- [ ] TimingBar 在极端值（某段为 0ms）时仍能正常显示
- [ ] 颜色标签在深色/浅色主题下均可读

### General Checklist
- [ ] 后端新增字段使用数据库迁移（GORM AutoMigrate）
- [ ] 新增字段向后兼容（默认值 0）
- [ ] API 响应格式不变（仅新增字段）

## Merge Record
- **Completed:** 2026-05-28
- **Branch:** feature/feat-timing-display-optimize
- **Merge commit:** ea181e8
- **Archive tag:** feat-timing-display-optimize-20260528
- **Conflicts:** none
- **Verification:** 5/5 tasks, 4/4 Gherkin scenarios PASS
- **Files changed:** 6
