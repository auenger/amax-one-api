# Feature: feat-ccswitch-import 一键导入 cc-switch

## Basic Information
- **ID**: feat-ccswitch-import
- **Name**: 一键导入 cc-switch
- **Priority**: 60
- **Size**: S
- **Dependencies**: none
- **Parent**: null
- **Children**: none
- **Created**: 2026-05-20

## Description

在令牌（Token）页面为每个 token 行添加"导入 cc-switch"按钮。点击后通过 `ccswitch://` 自定义协议链接，将 API Key 和服务器地址一键导入到 cc-switch 应用，使用户可以在 Claude Code / Codex 里快速切换配置。

### cc-switch 协议格式

```
ccswitch://v1/import?resource=provider&app=claude&name={providerName}&apiKey={apiKey}&endpoint={endpoint}&homepage={homepage}
```

参数说明：
- `resource=provider` — 固定值
- `app=claude` — 固定值，指定应用为 Claude
- `name` — provider 名称，格式为 `{系统名} · {用户名}`（如 "1024X · Ryan"）
- `apiKey` — token key（不带 sk- 前缀）
- `endpoint` — API 端点地址（URL 编码）
- `homepage` — 首页地址（URL 编码，可选）

## User Value Points

1. **一键导入** — 用户在令牌页面直接点击按钮，cc-switch 自动接收配置，无需手动复制粘贴 key 和地址

## Context Analysis

### Reference Code
- `one-api/web/berry/src/views/Token/component/TableRow.js` — Token 表格行组件，已有复制/聊天按钮
- `one-api/web/berry/src/views/Token/index.js` — Token 页面，展示 Alert 提示和 Token 列表
- `one-api/web/berry/src/utils/common.js` — `copy()` 工具函数
- `one-api/model/token.go` — Token 模型，key 字段存储 API key

### Related Documents
- cc-switch 是外部 Tauri 桌面应用，注册了 `ccswitch://` 自定义协议

### Related Features
- feat-user-channel-select — 令牌页已有复制 key + 选择渠道功能

## Technical Solution

### 前端改动

**文件：`one-api/web/berry/src/views/Token/component/TableRow.js`**

在每行 token 的操作区域（复制/聊天按钮旁边）新增一个"导入 cc-switch"按钮：

1. 从 `siteInfo` 获取 `server_address`（endpoint）
2. 从 `siteInfo` 获取系统名称作为 provider name 的一部分
3. 构建 `ccswitch://` 协议链接
4. 使用 `window.open(url)` 或 `window.location.href = url` 触发协议

协议链接构建逻辑：
```js
const ccswitchUrl = `ccswitch://v1/import?resource=provider&app=claude`
  + `&name=${encodeURIComponent(providerName)}`
  + `&apiKey=${encodeURIComponent(item.key)}`
  + `&endpoint=${encodeURIComponent(serverAddress)}`
  + `&homepage=${encodeURIComponent(homepage)}`;
window.open(ccswitchUrl);
```

其中：
- `providerName` = `siteInfo.system_name` + " · " + `userDisplayName`（或直接用系统名）
- `apiKey` = `item.key`（不带 sk- 前缀）
- `endpoint` = `siteInfo.server_address`
- `homepage` = `siteInfo.server_address`（或首页地址）

### UI 设计

按钮样式：使用 MUI Button，搭配 sparkles/download 图标，视觉上区别于现有的"复制"和"聊天"按钮。

## Acceptance Criteria (Gherkin)

### User Story
作为用户，我希望在令牌页面一键将 API Key 导入到 cc-switch，这样我在 Claude Code 中可以快速切换使用该 key。

### Scenarios (Given/When/Then)

**Scenario 1: 成功导入**
```gherkin
Given 用户已登录且在令牌页面
And 至少存在一个启用的令牌
When 用户点击某个令牌行的"导入 cc-switch"按钮
Then 系统构建 ccswitch:// 协议链接
And 链接包含正确的 name、apiKey、endpoint 参数
And 浏览器尝试打开该协议链接
```

**Scenario 2: cc-switch 未安装**
```gherkin
Given 用户已登录且在令牌页面
And 用户设备未安装 cc-switch 应用
When 用户点击"导入 cc-switch"按钮
Then 浏览器打开协议链接
And 浏览器显示"无法打开此链接"或类似提示（由浏览器原生处理）
```

**Scenario 3: 令牌已禁用/过期**
```gherkin
Given 用户已登录且在令牌页面
And 存在一个已禁用或已过期的令牌
Then "导入 cc-switch"按钮仍然可用（用户可能需要导入历史配置）
```

### UI/Interaction Checkpoints
- 按钮在每个令牌行的操作列中显示
- 按钮有明确的图标和文字标识
- 点击后无页面刷新，通过协议链接直接唤起 cc-switch

### General Checklist
- [ ] 不影响现有的复制、聊天、编辑、删除功能
- [ ] 协议链接参数正确 URL 编码
- [ ] 无需后端改动（纯前端功能）
