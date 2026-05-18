# Feature: feat-rebuild-frontend one-api 内置前端二开

## Basic Information
- **ID**: feat-rebuild-frontend
- **Name**: one-api 内置前端二开（品牌定制 + 审批页面）
- **Priority**: 90
- **Size**: M
- **Dependencies**: feat-rebuild-oneapi
- **Parent**: null
- **Created**: 2026-05-13

## Description

在 one-api 内置的 React 前端（`web/default/`）上进行二开定制：

1. **品牌定制** — Logo、系统名称、颜色主题、页脚
2. **审批管理页面** — Admin 审批列表页 + 用户申请页
3. **Channel 预算展示** — Channel 列表显示预算使用进度条
4. **Dashboard 增强** — 展示预算消耗趋势、模型分布

one-api 前端已包含：Channel 管理、Token 管理、用户管理、日志、兑换码、系统设置等完整管理页面。本次二开仅新增审批流和预算相关 UI。

## User Value Points

1. **品牌化** — 将 one-api 默认界面定制为 AIHub 品牌风格
2. **审批流 UI** — Admin 可视化审批 Token 申请，用户可查看申请状态
3. **预算可视化** — Channel 预算使用情况一目了然

## Technical Solution

### one-api 前端结构
```
web/default/
├── src/
│   ├── components/     # UI 组件
│   │   ├── ChannelsTable.js
│   │   ├── TokensTable.js
│   │   ├── LogsTable.js
│   │   ├── UsersTable.js
│   │   └── ...
│   ├── pages/          # 页面
│   │   ├── Channel/
│   │   ├── Token/
│   │   ├── Log/
│   │   ├── Setting/
│   │   └── ...
│   ├── helpers/        # API 请求、工具函数
│   └── constants/      # 常量
└── public/
    └── logo.png        # 替换为 AIHub logo
```

### 实施步骤

#### 1. 品牌定制
- 替换 `public/logo.png` 为 AIHub logo
- 系统设置中配置系统名称（one-api 支持 `SystemName` 设置）
- 自定义 CSS 主题色
- 修改页脚信息（保留 one-api 署名，MIT 要求）

#### 2. 审批管理页面（新增）
- 新增 `src/pages/TokenRequest/index.js` — Admin 审批列表
- 新增 `src/pages/TokenRequest/MyRequests.js` — 用户申请页面
- 新增 `src/components/TokenRequestsTable.js` — 审批列表组件
- 更新 `src/components/SiderBar.js` — 添加菜单项
- API 调用对应后端 `feat-rebuild-oneapi` 新增的审批接口

#### 3. Channel 预算展示
- 修改 `src/components/ChannelsTable.js` — 添加预算列（进度条）
- 修改 Channel 编辑对话框 — 添加预算设置字段

#### 4. Dashboard 增强（可选）
- 添加预算消耗趋势图
- 添加模型调用分布图

## Acceptance Criteria (Gherkin)

```gherkin
Scenario: 品牌定制生效
  Given one-api 启动
  When 访问管理界面
  Then 看到 AIHub Logo 和品牌名称
  And 页脚保留 one-api 原项目署名
```

```gherkin
Scenario: Admin 审批页面正常
  Given Admin 登录
  When 访问 Token 审批页面
  Then 看到所有待审批的 Token 申请
  When 点击审批通过
  Then 申请状态变为已通过
  And 系统自动创建 Token
```

```gherkin
Scenario: 用户申请页面正常
  Given 普通用户登录
  When 访问我的申请页面
  Then 可以提交新的 Token 申请
  And 可以查看历史申请状态
```

```gherkin
Scenario: Channel 预算展示
  Given Admin 查看 Channel 列表
  Then 预算列显示进度条（已用/总额）
  When 预算超限
  Then Channel 状态显示为"已禁用（预算超限）"
```

## Merge Record

- **Completed**: 2026-05-13
- **Branch**: feature/rebuild-frontend
- **Merge Commit**: fa05d48
- **Archive Tag**: feat-rebuild-frontend-20260513
- **Conflicts**: None
- **Verification**: Passed (code analysis, build succeeds)
- **Stats**: 15 files changed, 883 insertions(+), 20 deletions(-)
