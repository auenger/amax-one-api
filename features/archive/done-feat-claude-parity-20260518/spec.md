# Feature: feat-claude-parity Anthropic 协议与 OpenAI 协议逻辑对齐

## Basic Information
- **ID**: feat-claude-parity
- **Name**: Anthropic 协议与 OpenAI 协议逻辑对齐
- **Priority**: 80
- **Size**: M
- **Dependencies**: none
- **Parent**: null
- **Children**: empty
- **Created**: 2026-05-18

## Merge Record
- **Completed**: 2026-05-18
- **Merged Branch**: feature/claude-parity
- **Merge Commit**: 4643ac0
- **Archive Tag**: feat-claude-parity-20260518
- **Conflicts**: none
- **Verification**: PASSED (10/10 Gherkin scenarios)
- **Evidence**: evidence/verification-report.md
- **Stats**: 6 files changed, +423 -506 lines, 1 commit

## Description

one-api fork 需要同时对外暴露两种 API 协议，通过 **URL 路径前缀** 直接区分：

| 协议 | 路径前缀 | 端点示例 |
|------|----------|----------|
| **OpenAI** | `/openai/` | `/openai/v1/chat/completions`, `/openai/v1/embeddings`, `/openai/v1/models` |
| **Anthropic** | `/anthropic/` | `/anthropic/v1/messages` |

原有的 `/v1/...` 路径保持兼容（默认走 OpenAI 协议）。

当前 `/v1/messages` 的实现（`controller/claude_relay.go`）绕过了标准 relay 管线，流式请求不记录用量、不扣额度、不写日志。

需要：
1. **新增协议前缀路由**：`/openai/v1/...` 和 `/anthropic/v1/...`，一眼区分协议
2. **保持 `/v1/...` 兼容**：旧路径不破坏
3. **统一 relay 管线**：两种协议走完全相同的计费/日志/重试/额度逻辑
4. **格式转换透明处理**：Anthropic 协议的 Claude 格式 ↔ OpenAI 格式在入口/出口自动转换

## 路由设计

```
localhost:3000/
│
├── openai/                          ← OpenAI 协议（明确前缀）
│   └── v1/
│       ├── chat/completions  POST   对话补全
│       ├── completions       POST   文本补全
│       ├── embeddings        POST   向量嵌入
│       ├── images/generations POST  图片生成
│       ├── audio/speech      POST   语音合成
│       ├── audio/transcriptions POST 语音识别
│       ├── moderations       POST   内容审核
│       ├── models            GET    模型列表
│       └── models/:model     GET    模型详情
│
├── anthropic/                       ← Anthropic 协议（明确前缀）
│   └── v1/
│       └── messages          POST   Claude Messages API
│
└── v1/                              ← 兼容旧路径（默认 OpenAI）
    ├── chat/completions      POST
    ├── messages              POST   兼容：走 Anthropic 协议
    ├── embeddings            POST
    └── models                GET
```

客户端使用示例：

```bash
# OpenAI 协议 — 明确路径
curl http://localhost:3000/openai/v1/chat/completions \
  -H "Authorization: Bearer sk-xxx" \
  -d '{"model":"gpt-4o","messages":[...]}'

# Anthropic 协议 — 明确路径
curl http://localhost:3000/anthropic/v1/messages \
  -H "Authorization: Bearer sk-xxx" \
  -d '{"model":"claude-sonnet-4-20250514","messages":[...],"max_tokens":1024}'

# 兼容旧路径
curl http://localhost:3000/v1/chat/completions ...   # 仍然可用
curl http://localhost:3000/v1/messages ...            # 仍然可用
```

## 协议对比

### OpenAI 协议（已完善）

```
路由: router/relay.go
  relayV1Router := router.Group("/v1")
  relayV1Router.Use(RelayPanicRecover, TokenAuth, Distribute)
  relayV1Router.POST("/chat/completions", controller.Relay)

入口: controller/relay.go → Relay()
  1. relaymode.GetByPath() — 根据 URL 确定模式
  2. relayHelper() → RelayTextHelper()
  3. 失败重试（config.RetryTimes 次数）
  4. 错误返回 OpenAI 格式 {"error": {...}}

管线: relay/controller/text.go → RelayTextHelper()
  1. 解析 + 校验请求
  2. 模型名映射
  3. preConsumeQuota() — 预扣额度
  4. adaptor.DoRequest() — 发送上游请求
  5. adaptor.DoResponse() — 处理响应（含流式）
  6. postConsumeQuota() — 结算额度 + RecordConsumeLog + 更新用量
```

### Anthropic 协议（当前有缺陷）

```
路由: router/relay.go
  claudeRouter := router.Group("/v1")
  claudeRouter.Use(RelayPanicRecover, TokenAuth)    ← 缺少 Distribute 中间件
  claudeRouter.POST("/messages", controller.RelayClaudeMessages)

入口: controller/claude_relay.go → RelayClaudeMessages()
  流式路径: 绕过 RelayTextHelper ❌
    - 无 preConsumeQuota ❌    额度不预扣
    - 无 postConsumeQuota ❌   用量不记录
    - 无 RecordConsumeLog ❌   日志不写入
    - 重试逻辑简陋 ❌
  非流式路径: 走 RelayTextHelper ✅ 但重试逻辑不一致
```

## User Value Points

### VP1: Anthropic 协议用量监控与计费
通过 `/anthropic/v1/messages` 发送的请求（流式+非流式），在日志页面可以看到完整的请求记录、Token 消耗、耗时，与 OpenAI 协议请求完全一致。

### VP2: 协议路由清晰可辨
URL 路径直接体现协议类型，开发者无需记住哪些端点属于哪个协议。`/openai/` 和 `/anthropic/` 前缀让 API 文档、调试工具、网关配置都更直观。

## Context Analysis

### Reference Code

| 文件 | 说明 | 行数 |
|------|------|------|
| `router/relay.go` | 路由定义 | 80 |
| `controller/relay.go` | 标准 Relay 入口 + 重试逻辑 | 157 |
| `controller/claude_relay.go` | **当前 Claude relay 实现（需重构）** | 441 |
| `relay/controller/text.go` | `RelayTextHelper` 标准管线 | 89 |
| `relay/controller/helper.go` | `preConsumeQuota` / `postConsumeQuota` | 146 |
| `service/claude_convert.go` | Claude ↔ OpenAI 格式转换 | 469 |
| `relay/adaptor/anthropic/` | Anthropic upstream adaptor | 380 |
| `relay/relaymode/` | relay 模式定义 | 31 |

### 数据流（目标）

```
/anthropic/v1/messages 请求:
  Client → TokenAuth → Distribute → RelayAnthropic()
    → 解析 Claude 格式 → ClaudeToOpenAIRequest() → 替换 body
    → protocol=anthropic 标记到 context
    → RelayTextHelper()                    ← 走标准管线
      → preConsumeQuota()                  ✅ 预扣额度
      → adaptor.ConvertRequest()           (OpenAI → 上游格式)
      → adaptor.DoRequest()                (发送上游)
      → adaptor.DoResponse()               (上游响应 → OpenAI格式)
      → postConsumeQuota()                 ✅ 记录日志/扣额度
    ← 重试逻辑 (与 OpenAI 完全一致)        ✅
  ← OpenAI 响应 → OpenAIResponseToClaude() → 写回 Claude 格式
```

### Related Features
- `feat-rebuild-oneapi` — Claude relay 的初始实现
- `feat-phase1-openai-proxy` — OpenAI 标准管线参考

## Technical Solution

### 路由层（`router/relay.go`）

```go
func SetRelayRouter(router *gin.Engine) {
    router.Use(middleware.CORS())
    router.Use(middleware.GzipDecodeMiddleware())

    commonMiddleware := func() []gin.HandlerFunc {
        return []gin.HandlerFunc{
            middleware.RelayPanicRecover(),
            middleware.TokenAuth(),
            middleware.Distribute(),
        }
    }

    // ─── OpenAI 协议（明确前缀）───
    openaiRouter := router.Group("/openai", commonMiddleware()...)
    {
        openaiV1 := openaiRouter.Group("/v1")
        openaiV1.POST("/chat/completions", controller.Relay)
        openaiV1.POST("/completions", controller.Relay)
        openaiV1.POST("/embeddings", controller.Relay)
        openaiV1.POST("/images/generations", controller.Relay)
        openaiV1.POST("/audio/speech", controller.Relay)
        openaiV1.POST("/audio/transcriptions", controller.Relay)
        openaiV1.POST("/audio/translations", controller.Relay)
        openaiV1.POST("/moderations", controller.Relay)
        openaiV1.GET("/models", controller.ListModels)
        openaiV1.GET("/models/:model", controller.RetrieveModel)
    }

    // ─── Anthropic 协议（明确前缀）───
    anthropicRouter := router.Group("/anthropic", commonMiddleware()...)
    {
        anthropicV1 := anthropicRouter.Group("/v1")
        anthropicV1.POST("/messages", controller.RelayAnthropic)
    }

    // ─── 兼容旧路径 /v1/... ───
    legacyV1 := router.Group("/v1", commonMiddleware()...)
    {
        // OpenAI 兼容
        legacyV1.POST("/chat/completions", controller.Relay)
        legacyV1.POST("/completions", controller.Relay)
        legacyV1.POST("/embeddings", controller.Relay)
        legacyV1.POST("/images/generations", controller.Relay)
        legacyV1.POST("/audio/speech", controller.Relay)
        legacyV1.POST("/audio/transcriptions", controller.Relay)
        legacyV1.POST("/audio/translations", controller.Relay)
        legacyV1.POST("/moderations", controller.Relay)
        legacyV1.GET("/models", controller.ListModels)
        legacyV1.GET("/models/:model", controller.RetrieveModel)
        // Anthropic 兼容
        legacyV1.POST("/messages", controller.RelayAnthropic)
    }
}
```

### 入口层

**`controller/relay.go` — 不改动**：`Relay()` 保持原样处理 OpenAI 协议。

**新增 `controller/anthropic_relay.go`**：

`RelayAnthropic(c *gin.Context)` 流程：
1. 解析 Claude 格式请求
2. `service.ClaudeToOpenAIRequest()` → 转换为 OpenAI 格式
3. 替换 `c.Request.Body` 为 OpenAI 格式 body
4. 设置 `protocol=anthropic` 到 context
5. 用 `claudeResponseWriter` 包装 `c.Writer` 捕获 OpenAI 响应
6. 调用 `relayHelper(c, relaymode.ChatCompletions)` → `RelayTextHelper()`
7. 成功时：捕获的 OpenAI 响应 → `service.OpenAIResponseToClaude()` → 写回 Claude 格式
8. 失败时：OpenAI 错误 → Claude 格式错误
9. 重试：复用 `Relay()` 中的重试机制，body 用 Claude 原始请求重新转换

**删除 `controller/claude_relay.go`**。

### `relaymode/helper.go` — 添加路径识别

```go
func GetByPath(path string) int {
    // 去掉协议前缀后识别
    path = strings.TrimPrefix(path, "/openai")
    path = strings.TrimPrefix(path, "/anthropic")

    // 原有逻辑...
    if strings.HasPrefix(path, "/v1/chat/completions") {
        return ChatCompletions
    }
    // ...
}
```

### 不改动的部分

| 模块 | 原因 |
|------|------|
| `middleware/distributor.go` | 已正确支持所有 Channel 类型 |
| `relay/adaptor/anthropic/` | upstream adaptor 不需要改动 |
| `relay/controller/text.go` | 标准管线不需要改动 |
| `relay/controller/helper.go` | 计费逻辑不需要改动 |
| `service/claude_convert.go` | 格式转换逻辑不需要改动 |

### 改动范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `router/relay.go` | 修改 | 新增 `/openai/` 和 `/anthropic/` 前缀路由，保留 `/v1/` 兼容 |
| `controller/anthropic_relay.go` | 新增 | Anthropic 协议入口（~200 行） |
| `controller/claude_relay.go` | 删除 | 被 `anthropic_relay.go` 替代 |
| `relay/relaymode/helper.go` | 修改 | 路径识别去掉协议前缀 |

### 关键设计决策

1. **协议前缀在路由层**：`/openai/` 和 `/anthropic/` 是路由 Group 前缀，不在业务逻辑中判断。
2. **兼容旧路径**：`/v1/...` 保持不变，客户端无需改动。新路径是更好的选择。
3. **protocol 标记**：通过 context 传递协议类型，出口层根据标记做格式转换。
4. **response writer 包装**：确保标准管线完整执行（包括 `postConsumeQuota`）。

## Acceptance Criteria (Gherkin)

### User Story
作为开发者，我通过 URL 路径前缀直接区分 API 协议。Anthropic 协议的请求在计费、日志、额度、重试上与 OpenAI 协议完全一致。

### Scenarios

#### Scenario 1: 协议前缀路由正常工作
```gherkin
Given 有效 Token 和对应 Channel
When POST /openai/v1/chat/completions 发送 OpenAI 格式请求
Then 返回 OpenAI 格式响应
When POST /anthropic/v1/messages 发送 Claude 格式请求
Then 返回 Claude 格式响应
```

#### Scenario 2: 旧路径兼容
```gherkin
Given 有效 Token 和对应 Channel
When POST /v1/chat/completions 发送请求
Then 返回正常（与 /openai/v1/chat/completions 行为一致）
When POST /v1/messages 发送请求
Then 返回正常（与 /anthropic/v1/messages 行为一致）
```

#### Scenario 3: 流式 Claude 请求记录用量
```gherkin
Given 有效 Token 和 Anthropic Channel
When POST /anthropic/v1/messages 流式请求 "stream": true
Then Log 表生成记录，包含正确的 prompt_tokens 和 completion_tokens
```

#### Scenario 4: 流式 Claude 请求扣减额度
```gherkin
Given Token 剩余额度 1000
When POST /anthropic/v1/messages 流式请求消耗 500 tokens
Then Token/用户/Channel 额度均正确更新
```

#### Scenario 5: 额度不足拒绝
```gherkin
Given Token 额度为 0
When POST /anthropic/v1/messages 发送请求
Then 返回 Claude 格式错误 {"type":"error","error":{...}}
And 不产生上游请求，不记录日志
```

#### Scenario 6: 两种协议计费一致
```gherkin
Given 相同模型和消息内容
When 分别 POST /openai/v1/chat/completions 和 /anthropic/v1/messages
Then 计费倍率和额度扣减逻辑完全一致
```

#### Scenario 7: 流式 SSE 格式正确
```gherkin
Given 有效流式请求
When POST /anthropic/v1/messages "stream": true
Then SSE 事件序列: message_start → content_block_start → content_block_delta(s) → content_block_stop → message_delta → message_stop
And usage 包含正确的 input_tokens/output_tokens
```

#### Scenario 8: Channel 预算超限自动切换
```gherkin
Given Channel A 预算已用完, Channel B 有相同模型
When POST /anthropic/v1/messages
Then 路由到 Channel B 成功，日志记录 Channel B 的 ID
```

#### Scenario 9: 错误格式对应协议
```gherkin
When POST /openai/v1/chat/completions 模型无效
Then 返回 OpenAI 格式错误 {"error":{"message":"...","type":"..."}}
When POST /anthropic/v1/messages 模型无效
Then 返回 Claude 格式错误 {"type":"error","error":{"type":"...","message":"..."}}
```

#### Scenario 10: 重试后成功
```gherkin
Given Channel A 返回 500, Channel B 正常
When POST /anthropic/v1/messages
Then 自动重试到 Channel B 成功，返回 Claude 格式响应，日志记录 Channel B
```

### General Checklist
- [ ] `/openai/v1/...` 和 `/anthropic/v1/...` 路由正常工作
- [ ] `/v1/...` 旧路径保持兼容
- [ ] 流式和非流式 Claude 请求均通过标准 relay 管线
- [ ] `postConsumeQuota` 在所有路径中正常执行
- [ ] 错误响应对应协议格式
- [ ] 重试逻辑与 OpenAI 协议一致
- [ ] `go build` && `go test ./...` 通过
