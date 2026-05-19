# Feature: feat-user-channel-select 用户渠道选择

## Basic Information
- **ID**: feat-user-channel-select
- **Name**: 用户渠道选择
- **Priority**: 60
- **Size**: M
- **Dependencies**: none
- **Parent**: null
- **Children**: empty
- **Created**: 2026-05-19

## Description
开放普通用户的渠道指定能力。用户在使用令牌请求模型时，可通过 `sk-{key}-{channelId}` 格式自行选择渠道，方便在某个渠道压力大时手动切换调用渠道。同时在模型广场页面展示可用渠道信息，让用户能快速复制带渠道 ID 的令牌格式。

## User Value Points
1. **用户级渠道指定**: 移除管理员限制，普通用户可通过 `sk-{key}-{channelId}` 格式指定渠道进行请求
2. **渠道发现与快速复制**: 在模型广场页面展示模型对应的可用渠道，用户可一键复制带渠道 ID 的令牌格式

## Context Analysis
### Reference Code
- `one-api/middleware/auth.go:135-141` — 当前渠道指定逻辑，仅管理员可用 `sk-{key}-{channelId}`
- `one-api/middleware/distributor.go:31-42` — SpecificChannelId 的使用，验证渠道有效性
- `one-api/controller/relay.go:122-135` — shouldRetry 中 SpecificChannelId 的处理逻辑
- `one-api/web/berry/src/views/Marketplace/` — 模型广场前端页面
- `one-api/model/channel.go` — Channel 数据模型
- `one-api/model/cache.go` — 渠道缓存与模型映射

### Related Documents
- [[feat-channel-routing]] — 多渠道智能路由（已完成）
- [[feat-channel-affinity]] — 会话亲和（已完成）
- [[feat-model-marketplace]] — 模型广场（已完成）
- [[feat-marketplace-card-enhance]] — 模型卡片丰富化（已完成）

### Related Features
- feat-channel-routing (已完成) — 智能路由基础设施
- feat-channel-affinity (已完成) — 会话亲和
- feat-model-marketplace (已完成) — 模型广场
- feat-marketplace-card-enhance (已完成) — 模型卡片增强

## Technical Solution

### 1. 后端：开放用户渠道指定权限

**文件**: `one-api/middleware/auth.go`

修改 `TokenAuth()` 函数中第 135-141 行的逻辑：
- 移除 `model.IsAdmin(token.UserId)` 的管理员检查
- 添加用户组下的渠道可见性验证：确保指定的渠道属于该用户的分组
- 保持渠道状态检查（已禁用的渠道仍不可用）

```go
// 修改前:
if len(parts) > 1 {
    if model.IsAdmin(token.UserId) {
        c.Set(ctxkey.SpecificChannelId, parts[1])
    } else {
        abortWithMessage(c, http.StatusForbidden, "普通用户不支持指定渠道")
        return
    }
}

// 修改后:
if len(parts) > 1 {
    channelId := parts[1]
    // 验证渠道是否属于用户分组
    userGroup, _ := model.CacheGetUserGroup(token.UserId)
    if !model.IsChannelInGroup(channelId, userGroup) {
        abortWithMessage(c, http.StatusForbidden, "该渠道不在您的可用分组内")
        return
    }
    c.Set(ctxkey.SpecificChannelId, channelId)
}
```

**文件**: `one-api/model/channel.go` 或 `one-api/model/cache.go`

新增 `IsChannelInGroup()` 函数，验证渠道是否属于指定分组。

### 2. 前端：模型广场渠道信息展示与快速复制

**文件**: `one-api/web/berry/src/views/Marketplace/` 相关组件

在模型卡片的渠道列表中：
- 展示每个渠道的 ID、名称、状态（健康/降级/不可用）
- 添加"复制令牌"按钮，生成 `sk-{userTokenKey}-{channelId}` 格式的令牌
- 复制成功后显示 toast 提示

### 3. 后端 API：渠道发现接口（如需要）

如模型广场页面尚未有获取渠道列表的 API，需新增：
- `GET /api/channel/available?model={modelName}` — 获取某模型可用渠道列表
- 返回渠道 ID、名称、类型、状态等基本信息

## Acceptance Criteria (Gherkin)
### User Story
作为一个普通用户，我希望在使用令牌请求模型时能指定渠道，并在模型广场看到可用渠道信息，以便在某个渠道压力大时手动切换到其他渠道。

### Scenarios (Given/When/Then)

#### Scenario 1: 普通用户通过 Token 格式指定渠道
```gherkin
Given 用户拥有有效的令牌 sk-abc123
And 存在渠道 ID 为 5 的渠道，该渠道属于用户所在分组
When 用户使用 sk-abc123-5 作为 Bearer Token 发送请求
Then 系统使用渠道 5 处理请求
And 请求正常返回结果
```

#### Scenario 2: 普通用户指定不存在的渠道
```gherkin
Given 用户拥有有效的令牌 sk-abc123
When 用户使用 sk-abc123-999 作为 Bearer Token 发送请求
Then 系统返回 400 错误 "无效的渠道 Id"
```

#### Scenario 3: 普通用户指定不在分组内的渠道
```gherkin
Given 用户拥有有效的令牌 sk-abc123，所在分组为 "default"
And 渠道 ID 为 10 的渠道不属于 "default" 分组
When 用户使用 sk-abc123-10 作为 Bearer Token 发送请求
Then 系统返回 403 错误 "该渠道不在您的可用分组内"
```

#### Scenario 4: 模型广场展示渠道信息
```gherkin
Given 模型广场页面已加载
And 模型 "gpt-4o" 在渠道 3 和渠道 7 上可用
When 用户查看 gpt-4o 模型卡片详情
Then 用户可以看到渠道 3 和渠道 7 的名称、状态信息
And 用户可以看到每个渠道的"复制令牌"按钮
```

#### Scenario 5: 快速复制带渠道的令牌
```gherkin
Given 用户已登录且拥有令牌
And 用户在模型广场查看某模型的渠道列表
When 用户点击渠道 3 的"复制令牌"按钮
Then 系统将 sk-{tokenKey}-3 格式的令牌复制到剪贴板
And 显示复制成功的 toast 提示
```

#### Scenario 6: 指定渠道的请求失败不自动重试
```gherkin
Given 用户使用 sk-abc123-5 指定了渠道 5
And 该请求属于显式渠道选择（非亲和路由）
When 渠道 5 返回错误
Then 系统不进行自动重试（保持现有逻辑，shouldRetry 返回 false）
```

### General Checklist
- [x] 普通用户可通过 `sk-{key}-{channelId}` 指定渠道
- [x] 指定渠道时验证渠道属于用户分组
- [x] 指定渠道时验证渠道状态（已禁用渠道不可用）
- [x] 模型广场展示可用渠道信息
- [x] 模型广场提供快速复制带渠道令牌功能
- [x] 现有管理员渠道指定功能不受影响
- [x] 现有自动路由功能不受影响

## Merge Record

- **Completed:** 2026-05-19
- **Merged Branch:** feature/user-channel-select
- **Merge Commit:** 8a5c8af
- **Archive Tag:** feat-user-channel-select-20260519
- **Conflicts:** none
- **Verification:** passed (6/6 Gherkin scenarios)
- **Stats:** 5 files changed, 238 insertions, 79 deletions, 1 commit
