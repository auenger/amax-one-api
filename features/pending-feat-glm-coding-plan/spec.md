# Feature: feat-glm-coding-plan 智谱 GLM Coding Plan 渠道支持

## Basic Information
- **ID**: feat-glm-coding-plan
- **Name**: 智谱 GLM Coding Plan 渠道支持
- **Priority**: 70
- **Size**: M
- **Dependencies**: none
- **Parent**: null
- **Children**: []
- **Created**: 2026-05-26

## Description

为智谱 GLM Coding Plan 套餐添加两个新渠道类型，分别支持 OpenAI 协议和 Anthropic 协议访问 Coding Plan 专用端点，不影响现有渠道类型。

### 背景
智谱 GLM 的 Coding Plan 套餐使用专用 API 端点，不走通用 API：
- **Coding API 端点**: `https://open.bigmodel.cn/api/coding/paas/v4`（OpenAI 兼容协议）
- **Anthropic 兼容端点**: `https://open.bigmodel.cn/api/anthropic`（Anthropic 协议）

### 需求
1. 新增渠道类型「智谱 GLM Coding Plan」— 走 Coding API 端点，使用 OpenAI 协议
2. 新增渠道类型「智谱 GLM Coding Plan (Anthropic)」— 走 Anthropic 兼容端点，使用 Anthropic 协议
3. 两个类型在 UI 上标注为智谱 GLM 的 Coding Plan，不影响其他已有渠道类型

## User Value Points

### VP1: Coding Plan OpenAI 协议渠道
用户可以创建「智谱 GLM Coding Plan」渠道，使用 Coding Plan 专用端点（OpenAI 兼容格式）转发请求。

### VP2: Coding Plan Anthropic 协议渠道
用户可以创建「智谱 GLM Coding Plan (Anthropic)」渠道，通过 Anthropic 兼容端点转发请求。

## Context Analysis

### Reference Code
- `one-api/relay/channeltype/define.go` — 渠道类型常量（当前 Dummy=52，新增在它之前）
- `one-api/relay/channeltype/url.go` — 默认 Base URL 数组（长度必须等于 Dummy）
- `one-api/relay/channeltype/helper.go` — ChannelType → APIType 映射
- `one-api/relay/adaptor.go` — Adaptor 工厂（APIType → Adaptor 实例）
- `one-api/relay/adaptor/zhipu/adaptor.go` — 现有智谱 adaptor（URL 构造 + JWT 鉴权）
- `one-api/relay/adaptor/zhipu/main.go` — JWT token 生成（`id.secret` 格式）
- `one-api/relay/adaptor/anthropic/adaptor.go` — Anthropic adaptor（URL: `{BaseURL}/v1/messages`，鉴权: `x-api-key`）
- `one-api/relay/apitype/define.go` — API 类型常量
- `one-api/web/berry/src/constants/ChannelConstants.js` — 前端渠道类型显示名

### Technical Analysis

**URL 构造差异：**
| 类型 | Base URL | Adaptor 构造 | 完整 URL |
|------|----------|-------------|----------|
| 现有 Zhipu | `https://open.bigmodel.cn` | `{base}/api/paas/v4/chat/completions` | 正确 |
| Coding Plan (OpenAI) | `https://open.bigmodel.cn/api/coding/paas/v4` | 需要 `{base}/chat/completions` | 无 `/v1/` 前缀 |
| Coding Plan (Anthropic) | `https://open.bigmodel.cn/api/anthropic` | `{base}/v1/messages` | 标准 Anthropic 路径 |

**关键问题：** OpenAI adaptor 构造 `{base}/v1/chat/completions`，Coding Plan 不需要 `/v1/` 前缀。
→ Coding Plan (OpenAI) 需要**轻量 adaptor** 覆盖 URL 构造，其余复用 OpenAI 逻辑。
→ Coding Plan (Anthropic) 可**直接复用** Anthropic adaptor，路径匹配。

**鉴权差异：**
| 类型 | 鉴权方式 |
|------|---------|
| 现有 Zhipu | JWT token（`id.secret` → HS256 签名） |
| Coding Plan (OpenAI) | 待确认：可能是 Bearer token 或 JWT（同现有 Zhipu） |
| Coding Plan (Anthropic) | `x-api-key` header（Anthropic 标准鉴权） |

### Related Documents
- GLM Coding Plan API 文档（需确认鉴权方式和请求格式细节）

### Related Features
- 现有渠道类型体系（define.go + helper.go + adaptor factory 模式）

## Technical Solution

### 后端变更

#### 1. 新增渠道类型常量 (`relay/channeltype/define.go`)
```go
// 在 Dummy 之前插入
ZhipuCoding              // 52 — Coding Plan (OpenAI 协议)
ZhipuCodingAnthropic     // 53 — Coding Plan (Anthropic 协议)
Dummy                    // 54 — 移到最后
```

#### 2. 新增默认 Base URL (`relay/channeltype/url.go`)
```go
"https://open.bigmodel.cn/api/coding/paas/v4",  // 52 ZhipuCoding
"https://open.bigmodel.cn/api/anthropic",         // 53 ZhipuCodingAnthropic
```

#### 3. ChannelType → APIType 映射 (`relay/channeltype/helper.go`)
- `ZhipuCoding` → 需要新增 API type 或直接映射到 `apitype.ZhipuCoding`
- `ZhipuCodingAnthropic` → `apitype.Anthropic`（直接复用 Anthropic adaptor）

#### 4. 新增 API 类型 (`relay/apitype/define.go`)
- 新增 `ZhipuCoding` API type

#### 5. 新增轻量 Adaptor (`relay/adaptor/zhipucoding/`)
- 复用 OpenAI adaptor 的请求/响应转换逻辑
- 覆盖 `GetRequestURL`：`{BaseURL}/chat/completions`（无 `/v1/` 前缀）
- 覆盖 `SetupRequestHeader`：Bearer token 鉴权（或 JWT，待确认）
- 支持 streaming

#### 6. 注册 Adaptor (`relay/adaptor.go`)
```go
case apitype.ZhipuCoding:
    return &zhipucoding.Adaptor{}
```

#### 7. 前端显示名 (`web/berry/src/constants/ChannelConstants.js`)
```javascript
52: { key: 52, label: '智谱 GLM Coding Plan', color: 'primary' },
53: { key: 53, label: '智谱 GLM Coding Plan (Anthropic)', color: 'primary' },
```

### 实现注意事项
- `ChannelBaseURLs` 数组长度必须等于 `Dummy`（init() 会检查）
- 现有 Zhipu 渠道（type=16）不受影响
- 新增渠道类型使用独立的 adaptor，不修改现有 Zhipu adaptor
- Coding Plan (Anthropic) 可能有不同的 API 版本要求

## Acceptance Criteria (Gherkin)

### User Story
作为管理员，我希望在渠道管理中创建「智谱 GLM Coding Plan」类型的渠道，以便使用 GLM Coding Plan 套餐的专用 API 端点，分别通过 OpenAI 协议和 Anthropic 协议转发请求。

### Scenarios

#### VP1: Coding Plan (OpenAI 协议)

```gherkin
Scenario: 创建 Coding Plan 渠道并成功请求
  Given 管理员已登录
  And 存在有效的 GLM Coding Plan API Key
  When 创建渠道，类型选择「智谱 GLM Coding Plan」
  And 填入 API Key 和模型配置
  And 通过该渠道发送 chat completions 请求
  Then 请求应路由到 https://open.bigmodel.cn/api/coding/paas/v4/chat/completions
  And 响应格式符合 OpenAI chat completions 标准
```

```gherkin
Scenario: Coding Plan 渠道支持自定义 Base URL
  Given 管理员已登录
  When 创建「智谱 GLM Coding Plan」渠道
  And 设置自定义 Base URL 为 "https://custom.proxy.example.com"
  And 发送请求
  Then 请求应路由到 https://custom.proxy.example.com/chat/completions
```

```gherkin
Scenario: Coding Plan 渠道支持 Streaming
  Given 存在已配置的「智谱 GLM Coding Plan」渠道
  When 发送 streaming=true 的请求
  Then 应以 SSE 格式返回流式响应
  And 响应格式符合 OpenAI streaming 标准
```

#### VP2: Coding Plan (Anthropic 协议)

```gherkin
Scenario: 创建 Coding Plan Anthropic 渠道并成功请求
  Given 管理员已登录
  And 存在有效的 GLM API Key
  When 创建渠道，类型选择「智谱 GLM Coding Plan (Anthropic)」
  And 填入 API Key 和模型配置
  And 通过该渠道发送 messages 请求
  Then 请求应路由到 https://open.bigmodel.cn/api/anthropic/v1/messages
  And 使用 x-api-key header 鉴权
  And 响应格式符合 Anthropic messages API 标准
```

```gherkin
Scenario: Coding Plan Anthropic 渠道支持 Streaming
  Given 存在已配置的「智谱 GLM Coding Plan (Anthropic)」渠道
  When 发送 stream=true 的请求
  Then 应以 SSE 格式返回流式响应
  And 响应格式符合 Anthropic streaming 标准
```

### General Checklist
- [ ] 现有 Zhipu 渠道（type=16）功能不受影响
- [ ] 新渠道类型在渠道创建/编辑下拉框中可选
- [ ] 默认 Base URL 正确预填
- [ ] 支持自定义 Base URL 覆盖
- [ ] Streaming 正常工作
- [ ] 请求日志正确记录渠道类型
