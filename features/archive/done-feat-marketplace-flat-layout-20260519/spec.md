# Feature: feat-marketplace-flat-layout 模型广场平铺布局

## Basic Information
- **ID**: feat-marketplace-flat-layout
- **Name**: 模型广场平铺布局
- **Priority**: 80
- **Size**: M
- **Dependencies**: feat-concurrency-tracker, feat-provider-quota-refresh
- **Parent**: null
- **Children**: none
- **Created**: 2026-05-19

## Description

重构模型广场页面，将当前的「卡片点击 → 弹窗详情」模式改为**平铺展开**布局。所有信息（模型信息、渠道列表、并发状态、配额信息）直接展示在可展开的卡片上，快捷操作（复制令牌、渠道选择）也可直接执行，消除冗余的弹窗交互。

### 核心变更

1. **去掉弹窗** — 移除 `ModelDetailDialog`，所有信息平铺展示
2. **可展开卡片** — 卡片默认折叠显示摘要，点击展开显示完整信息
3. **渠道列表内联** — 渠道信息、状态、并发数、配额进度条直接在卡片内展示
4. **快捷操作直出** — 复制令牌按钮直接在渠道行上，无需额外点击

### 布局方案

#### 折叠态（默认）

```
┌─────────────────────────────────────┐
│ ▸ gpt-4o                    [OpenAI] │
│   3 渠道 · 并发 2/10 · 配额 █░ 23%  │
└─────────────────────────────────────┘
```

#### 展开态

```
┌─────────────────────────────────────────┐
│ ▾ gpt-4o                        [OpenAI]│
│   3 渠道                                │
├─────────────────────────────────────────┤
│  ┌─ OpenAI Main ──────────── 📋 复制 ─┐ │
│  │ [ID:5] [OpenAI] [正常]              │ │
│  │ 并发: 2/10 ●低负载                  │ │
│  │ 配额: ████████░░ 47% · 5h 剩余 1h17m│ │
│  │       ██░░░░░░░ 31% · 7d 剩余 5d23h│ │
│  └─────────────────────────────────────┘ │
│  ┌─ OpenAI Backup ────────── 📋 复制 ─┐ │
│  │ [ID:8] [OpenAI] [正常]              │ │
│  │ 并发: 0/10 ●空闲                    │ │
│  │ 配额: █░░░░░░░░ 12% · 5h            │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  复制格式: sk-{令牌}-{渠道ID}            │
└──────────────────────────────────────────┘
```

### 数据依赖

- **并发数据**: 来自 `feat-concurrency-tracker` 提供的 `/api/user/model_concurrency`
- **配额数据**: 来自 `feat-provider-quota-refresh` 扩展的 `model_channels` API `quota` 字段
- **基础数据**: 现有 `/api/user/available_models` + `/api/user/model_channels` + `/api/token/`

## User Value Points

1. **零层级信息获取** — 所有模型/渠道/并发/配额信息一眼可见，无需弹窗跳转
2. **即时操作** — 复制令牌、选择渠道等操作直接在卡片上完成
3. **状态全景** — 并发负载 + 配额消耗同时展示，快速决策使用哪个渠道

## Context Analysis

### Reference Code
- `one-api/web/berry/src/views/ModelMarket/index.js` — 模型广场主页面 (~637 行，含内联 Dialog)
- `/api/user/available_models` — 用户可用模型列表
- `/api/user/model_channels` — 模型渠道信息（含 quota 扩展字段）
- `/api/user/model_concurrency` — 并发数据 API（由 feat-concurrency-tracker 提供）

### Related Documents
- `feat-concurrency-tracker` spec — 并发追踪后端 API 定义
- `feat-provider-quota-refresh` spec — 配额缓存数据结构

### Related Features
- [[feat-concurrency-tracker]] — 并发追踪后端（依赖，提供数据 API）
- [[feat-provider-quota-refresh]] — 配额缓存（依赖，提供 quota 字段）
- [[feat-model-marketplace]] — 模型广场基础（已归档，本次在其基础上重构）
- [[feat-marketplace-card-enhance]] — 模型卡片增强（已归档，本次吸收其设计）
- [[feat-user-channel-select]] — 用户渠道选择（已归档，本次保留 sk-key-channelId 格式）

## Technical Solution

### Frontend
- 完全重写 `ModelMarket/index.js`，移除 `ModelDetailDialog` 组件
- 新增 `ModelCard` 可折叠卡片组件（使用 MUI `Collapse`），默认折叠显示摘要，点击展开
- 新增 `ChannelRow` 渠道行组件，内联展示渠道信息、并发指示器、配额进度条、复制按钮
- 新增 `QuotaProgressBar` 配额进度条组件，支持多窗口展示
- 布局从 Grid 卡片网格改为 flex 列表，每行一个可展开卡片
- 并发和配额数据异步加载（不阻塞页面首次渲染），30秒自动刷新

### Backend
- 新增 `GetUserChannelQuotas` handler（`controller/channel-quota.go`）
  - GET `/api/user/channel_quotas` — 返回用户可见渠道的配额数据
  - 基于 `CacheGetModelChannelRefs` 获取用户 group 的渠道，从 Redis 缓存读取配额
- 注册路由到 user self 路由组（`router/api.go`）

### Data Flow
1. 页面加载 → 并行请求 `/api/user/available_models` + `/api/user/model_channels` + `/api/token/`
2. 主数据渲染后 → 异步请求 `/api/user/model_concurrency` + `/api/user/channel_quotas`
3. 每 30 秒 → 自动刷新并发和配额数据

## Acceptance Criteria (Gherkin)

### User Story
作为用户，我希望在模型广场直接看到所有模型的渠道、并发和配额信息，并能直接复制令牌，减少操作步骤。

### Scenarios (Given/When/Then)

```gherkin
Scenario: 卡片默认折叠显示摘要
  Given 模型广场页面已加载
  When 用户查看模型列表
  Then 每个模型卡片显示模型名称、渠道类型标签、渠道数量
  And 显示并发摘要（如"并发 2/10"）
  And 显示最紧张渠道的配额摘要（进度条 + 百分比）
  And 卡片以列表或紧凑网格形式排列

Scenario: 点击卡片展开详细信息
  Given 模型广场页面已加载
  When 用户点击某个模型卡片
  Then 卡片展开显示所有渠道的详细信息
  And 每个渠道显示名称、ID、类型、状态
  And 每个渠道显示并发数和负载等级
  And 每个渠道显示配额进度条和剩余时间
  And 再次点击可折叠回摘要态

Scenario: 直接复制渠道令牌
  Given 用户已展开某个模型卡片
  And 用户有可用的令牌
  When 用户点击某渠道行的复制按钮
  Then 系统将 sk-{tokenKey}-{channelId} 格式的令牌复制到剪贴板
  And 显示复制成功提示

Scenario: 无令牌时复制提示
  Given 用户没有可用令牌
  When 用户点击复制按钮
  Then 显示提示"请先创建令牌"

Scenario: 并发数据展示
  Given 并发数据 API 返回了模型并发信息
  When 卡片展开
  Then 每个渠道显示当前并发数
  And 根据负载等级显示颜色指示（绿/黄/红）

Scenario: 配额数据展示
  Given 配额数据已通过 model_channels API 返回
  When 卡片展开
  Then 每个渠道显示配额进度条
  And 进度条颜色随用量变化（绿→黄→红）
  And 显示窗口标签和剩余时间

Scenario: 并发数据异步加载
  Given 模型广场页面首次加载
  When 基础模型和渠道数据已加载
  Then 页面立即渲染卡片
  And 并发数据在后台异步加载，加载完成后更新显示

Scenario: 数据自动刷新
  Given 模型广场页面已打开
  When 每隔 30 秒
  Then 并发和配额数据自动刷新
```

### UI/Interaction Checkpoints
- 卡片组件: 新增折叠/展开状态切换（Accordion 或 Collapse）
- 渠道行: 内联展示并发指示器 + 配额进度条 + 复制按钮
- 折叠态: 紧凑摘要（一行模型名 + 关键指标）
- 展开态: 完整渠道列表，每渠道独立区域
- 并发颜色: 绿色(0-2) / 黄色(3-5) / 红色(6+)
- 配额颜色: 绿(0-60%) / 黄(60-85%) / 红(85-100%)
- 无弹窗: 移除 ModelDetailDialog，所有交互在卡片内完成

### General Checklist
- [ ] 页面首次加载速度不受并发/配额数据影响（异步加载）
- [ ] 折叠/展开动画流畅
- [ ] 大量渠道时展开态可读性良好
- [ ] 复制操作兼容移动端

## Merge Record
- **Completed**: 2026-05-19
- **Merged Branch**: feature/marketplace-flat-layout
- **Merge Commit**: 29312e2
- **Archive Tag**: feat-marketplace-flat-layout-20260519
- **Conflicts**: None
- **Verification**: 8/8 Gherkin scenarios passed (code analysis)
- **Stats**: 1 commit, 3 files changed, 462 insertions, 375 deletions
