# Feature: feat-minimax-limit-display MiniMax Limit 显示逻辑

## Basic Information
- **ID**: feat-minimax-limit-display
- **Name**: MiniMax Limit 显示逻辑
- **Priority**: 60
- **Size**: S
- **Dependencies**: feat-provider-quota-api, feat-provider-quota-refresh, feat-provider-quota-ui
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-25

## Description
参考 GLM 的 limit 显示逻辑，为 MiniMax 添加基于 API URL 的智能识别和 limit 展示功能。当渠道的 Base URL 包含 "minimaxi" 时，自动识别为 MiniMax 套餐，查询其配额限制并在前端以与 GLM 一致的方式展示（进度条、剩余时间、用量百分比）。

## User Value Points
1. **URL 智能识别** — 无需手动配置 channel type，通过 API 地址自动识别 MiniMax 渠道
2. **统一的 Limit 展示体验** — MiniMax 渠道在渠道管理页和模型广场展示与 GLM 一致的用量限制信息

## Context Analysis

### Reference Code
- `one-api/controller/channel-quota.go` — 配额查询主逻辑，GLM 的 URL 识别在第 316-318 行 (`strings.Contains(baseURL, "bigmodel")`)
- `one-api/controller/channel-quota.go:123-178` — 已有的 `queryMinimaxQuota()` 函数
- `one-api/controller/channel-quota.go:306-342` — `queryProviderQuota()` 分派逻辑
- `one-api/model/quota.go` — ChannelQuota / QuotaWindow 数据模型
- `one-api/web/berry/src/views/Channel/component/QuotaProgressBar.js` — 通用进度条组件
- `one-api/web/berry/src/views/Channel/component/ChannelQuotaCard.js` — 配额详情卡片
- `one-api/web/berry/src/views/ModelMarket/index.js` — 模型广场配额展示

### Related Documents
- MiniMax coding plan API: `GET https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`
- GLM quota limit API: `GET https://api.z.ai/api/monitor/usage/quota/limit`

### Related Features
- feat-provider-quota-api (已完成) — 提供商配额查询 API 基础设施
- feat-provider-quota-refresh (已完成) — 定时刷新与缓存
- feat-provider-quota-ui (已完成) — Channel 管理页配额面板

## Technical Solution

### 后端改动

**文件: `one-api/controller/channel-quota.go`**

在 `queryProviderQuota()` 函数（约第 306 行）中，参照 GLM 的 "bigmodel" URL 检测逻辑，添加 MiniMax URL 检测：

```go
// 现有 GLM 检测 (约第 316-318 行):
if strings.Contains(baseURL, "bigmodel") {
    providerType = channeltype.Zhipu
}

// 新增 MiniMax 检测:
if strings.Contains(baseURL, "minimaxi") {
    providerType = channeltype.Minimax
}
```

位置说明：此检测应在 `switch providerType` 之前、获取 baseURL 之后添加，确保任何 Base URL 包含 "minimaxi" 的渠道（无论其 channel type 是否为 Minimax=27）都能正确查询配额。

### 无需额外改动的部分
- **数据模型**: `ChannelQuota` / `QuotaWindow` 已足够通用，`queryMinimaxQuota()` 已正确填充
- **前端组件**: `QuotaProgressBar`、`ChannelQuotaCard`、`ChannelQuotaCell` 都是通用的，无需修改
- **模型广场**: 已通过 `/api/user/channel_quotas` 加载所有渠道配额，MiniMax 的 windows 数据会自动展示
- **定时刷新**: `monitor/quota-refresh.go` 已调用 `queryProviderQuota()`，URL 检测逻辑对所有入口生效

## Acceptance Criteria (Gherkin)

### User Story
作为管理员/用户，我希望 MiniMax 渠道能自动识别并展示用量限制信息，这样我无需手动确认渠道类型就能看到配额使用情况。

### Scenarios (Given/When/Then)

**Scenario 1: URL 包含 minimaxi 自动识别**
```gherkin
Given 一个渠道的 Base URL 包含 "minimaxi"
When 系统查询该渠道的配额信息
Then 该渠道被视为 MiniMax 提供商
And 调用 MiniMax coding plan API 查询配额
And 返回包含 model_remains 数据的 ChannelQuota
```

**Scenario 2: 渠道管理页展示 MiniMax limit**
```gherkin
Given 管理员访问渠道管理页面
And 存在 Base URL 包含 "minimaxi" 的渠道
Then 该渠道的配额列显示用量进度条
And 进度条展示 "5h" 和 "weekly" 窗口的用量百分比
And 用量颜色符合阈值规则 (0-60% 绿, 60-85% 黄, 85-100% 红)
```

**Scenario 3: 模型广场展示 MiniMax limit**
```gherkin
Given 用户访问模型广场页面
And 存在 Base URL 包含 "minimaxi" 的渠道且该渠道有可用模型
Then 模型卡片的渠道行显示 MiniMax 配额进度条
And 进度条展示用量百分比和剩余时间
```

**Scenario 4: 非 minimaxi URL 的 MiniMax 渠道不受影响**
```gherkin
Given 一个渠道的 channel type 为 Minimax(27)
And 其 Base URL 不包含 "minimaxi"
When 系统查询该渠道的配额信息
Then 该渠道仍通过 channel type 识别为 MiniMax
And 配额查询正常工作
```

### UI/Interaction Checkpoints
- 渠道管理页表格：配额列显示进度条（紧凑模式）
- 渠道编辑弹窗：配额卡片显示完整信息
- 模型广场：模型卡片内显示 MiniMax 配额

### General Checklist
- [ ] 不影响现有 GLM 的 limit 显示逻辑
- [ ] 不影响其他提供商（DeepSeek、SiliconFlow 等）的配额查询
- [ ] URL 检测是 case-insensitive 或保持与现有 GLM 检测一致
- [ ] 定时刷新中 URL 检测同样生效

## Merge Record

- **Completed**: 2026-05-25
- **Merged Branch**: feature/feat-minimax-limit-display
- **Merge Commit**: dc46999
- **Feature Commit**: f209e53
- **Archive Tag**: feat-minimax-limit-display-20260525
- **Conflicts**: none
- **Verification**: passed (4/4 Gherkin scenarios verified by code review)
- **Evidence**: evidence/verification-report.md
- **Stats**: 1 commit, 1 file changed, 3 lines added, started 2026-05-25
