# Feature: feat-glm-time-downgrade GLM 渠道定时降级

## Basic Information
- **ID**: feat-glm-time-downgrade
- **Name**: GLM 渠道定时降级
- **Priority**: 80
- **Size**: S
- **Dependencies**: 无
- **Parent**: null
- **Children**: 无
- **Created**: 2026-06-11

## Description
所有 GLM（智谱）渠道在每天北京时间 13:00-18:00 自动将请求模型降级到 glm-4.7。降级规则通过系统选项配置，在「降级监控」页面以表单形式管理。

核心要求：
- 所有 GLM 渠道（type=16 Zhipu）在指定时间窗口内，所有模型请求统一替换为 glm-4.7
- 时间判断基于北京时间（Asia/Shanghai, UTC+8）
- 时间窗口外自动恢复正常路由
- 配置通过 4 个独立 Option key 管理（非 JSON），前端以页面元素控制

## User Value Points
1. **时间窗口自动降级** — 在指定时间段自动将 GLM 渠道的请求模型降级到目标模型，无需手动干预

## Context Analysis

### Reference Code
- `aihub/middleware/distributor.go` — 渠道分发，现有降级逻辑在第 78-84 行
- `aihub/model/downgrade.go` — Redis 降级标记管理（配额驱动）
- `aihub/model/option.go` — 系统选项 CRUD + OptionMap 缓存
- `aihub/common/config/config.go` — OptionMap 全局变量 + updateOptionMap
- `aihub/controller/option.go` — 选项 API（GetOptions/UpdateOption）
- `aihub/monitor/quota-refresh.go` — 配额驱动的降级检查（参考模式）
- `aihub/relay/channeltype/define.go` — Zhipu = 16 渠道类型常量
- `aihub/web/web/src/views/DowngradeRules/index.js` — 降级监控页面（添加 UI 的位置）
- `aihub/web/web/src/constants/ChannelConstants.js` — 渠道类型下拉选项

### Related Documents
- `aihub/CLAUDE.md` — 项目架构说明

### Related Features
- `feat-model-downgrade-strategy` — 配额百分比驱动的降级策略（已完成）
- `feat-downgrade-limit-window` — 5h 限速窗口降级（已完成）
- `feat-fallback-model` — 全局兜底降级路由（已完成）

## Technical Solution

### 配置方式：4 个独立 Option key（避免 JSON）

| Key | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| `TimeDowngradeEnabled` | bool | false | 是否启用时间降级 |
| `TimeDowngradeChannelType` | int | 16 | 目标渠道类型（16=智谱） |
| `TimeDowngradeTimeWindow` | string | "13-18" | 时间窗口，格式 "startHour-endHour"（北京时间） |
| `TimeDowngradeTargetModel` | string | "glm-4.7" | 降级目标模型 |

和现有 FallbackEnabled/FallbackChannelId/FallbackModel 模式一致。

### 修改文件清单

#### 1. `common/config/config.go` — 添加全局变量
```go
var TimeDowngradeEnabled = false
var TimeDowngradeChannelType = 16 // Zhipu
var TimeDowngradeTimeWindow = "13-18"
var TimeDowngradeTargetModel = "glm-4.7"
```

#### 2. `model/option.go` — 注册选项 + 解析
- `InitOptionMap()` 中注册 4 个 key
- `updateOptionMap()` 中：`TimeDowngradeEnabled` 按 bool 解析，`TimeDowngradeChannelType` 按 int 解析，其余直接赋值

#### 3. `monitor/time_downgrade.go`（新建）— 核心逻辑
- `CheckTimeDowngrade(channelType int) string` — 检查当前北京时间是否在窗口内

#### 4. `middleware/distributor.go` — 集成降级检查
- 在 fallback 逻辑之后、配额降级之前插入时间降级检查

#### 5. `views/DowngradeRules/index.js` — 前端 UI
- 新增「定时降级」Card，包含 Switch、渠道类型 Select、时间输入、模型输入、保存按钮

### 降级优先级（从高到低）
1. **回退路由** (Fallback Routing) — 兜底模型
2. **时间降级** (Time Downgrade) — 新增
3. **配额降级** (Quota Downgrade) — 渠道级

## Acceptance Criteria (Gherkin)

### Scenarios
1. 时间窗口内 GLM 请求被降级到 glm-4.7
2. 时间窗口外 GLM 请求不受影响
3. 非 GLM 渠道不受影响
4. 动态配置即时生效
5. 禁用开关后不触发降级

### General Checklist
- [ ] 时间判断使用北京时间（UTC+8）
- [ ] 降级规则为空时不影响性能
- [ ] 时间降级优先级高于配额降级
- [ ] 配置变更即时生效，无需重启
- [ ] 前端 UI 与现有兜底模型 Card 风格一致
