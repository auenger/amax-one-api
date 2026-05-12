# 需求拆解：企业级 AI 控制平台

## 一、需求全景图

```
+-----------------------------------------------------------------+
|                    企业用户 / 开发者 / 运营                        |
+---------------------+-------------------------------------------+
                      | SSO / OIDC / Virtual Key
                      v
+-----------------------------------------------------------------+
|                     统一 API 网关层                               |
|  +----------+ +----------+ +----------+ +----------+           |
|  |协议转换   | |动态路由   | |负载均衡   | |故障降级   |           |
|  +----------+ +----------+ +----------+ +----------+           |
+---------------------+-------------------------------------------+
                      |
          +-----------+-----------+
          v           v           v
+--------------+ +----------+ +--------------+
|  模型提供商   | | 资产库   | |  执行引擎     |
| OpenAI/Azure | | Skill    | |  沙箱容器     |
| Anthropic    | | Agent    | |  Firecracker |
| 本地Llama    | | Tool     | |  gVisor      |
+--------------+ +----------+ +--------------+
                      |
          +-----------+-----------+
          v           v           v
+--------------+ +----------+ +--------------+
|  经济治理     | | 审计日志  | |  IAM/RBAC    |
| Token计量    | | 不可篡改  | |  多维权限     |
| 预算控制     | | 全链路    | |  最小权限     |
| 成本分摊     | | Guardrail| |  AccessReview|
+--------------+ +----------+ +--------------+
```

## 二、用户角色与场景

### 角色 1: 平台管理员 (Platform Admin)
| 场景 | 操作 | 期望结果 |
|------|------|----------|
| 接入新模型 | 在模型目录添加供应商配置 | 网关自动支持该供应商路由 |
| 创建 Virtual Key | 为团队生成带策略的密钥 | 团队可调用但受配额约束 |
| 设置预算 | 设定部门月度上限 $10,000 | 超限时自动阻断并告警 |
| 审查权限 | 执行季度 Access Review | 识别并回收冗余权限 |

### 角色 2: AI 应用开发者 (Developer)
| 场景 | 操作 | 期望结果 |
|------|------|----------|
| 调用模型 | 使用 Virtual Key 发送请求 | 透明路由至最优模型 |
| 发布 Skill | 上传 SKILL.md + 代码包 | 进入注册表供团队复用 |
| 编排 Agent | 在画布拖拽组装工作流 | 可视化定义多步推理流程 |
| 调试追踪 | 查看单次请求完整链路 | 从输入到输出的每一步可见 |

### 角色 3: 合规审计员 (Auditor)
| 场景 | 操作 | 期望结果 |
|------|------|----------|
| 成本分析 | 查看各部门 Token 消耗趋势 | 识别异常增长点 |
| 合规检查 | 检索涉及 PII 的所有响应 | 定位潜在数据泄露风险 |
| 权限审计 | 导出某用户的完整操作记录 | 满足监管要求 |

## 三、核心实体模型

```mermaid
erDiagram
    Tenant ||--o{ Department : contains
    Department ||--o{ Project : owns
    Project ||--o{ VirtualKey : issues
    VirtualKey }o--|| Model : restricted_to
    
    User }o--o{ Role : assigned
    Role }o--o{ Permission : grants
    
    Asset ||--|| Skill : is_a
    Asset ||--|| Agent : is_a
    Asset ||--|| Tool : is_a
    Skill }o--o{ Version : has
    Agent }o--{ Tool : uses
    Agent }o--{ Skill : equipped_with
    
    RequestLog }o--|| User : initiated_by
    RequestLog }o--|| Model : targets
    RequestLog }o--|| Agent : executed_by
    Budget }o--|| Department : belongs_to
    Budget }o--|| Model : tracks_for
```

## 四、关键 API 设计草案

### 4.1 统一模型接口 (OpenAI Compatible)
```
POST /v1/chat/completions
Headers: Authorization: Bearer {virtual-key}

Request:
{
  "model": "gpt-4o",           // 虚拟模型名，网关解析为实际路由
  "messages": [...],
  "metadata": {
    "agent_id": "agent_01",    // 可选：关联执行的 Agent
    "skill_ids": ["skill_42"]  // 可选：关联使用的 Skills
  }
}

Response:
{
  "id": "chatcmpl-ulid...",
  "model": "gpt-4o",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 80,
    "total_tokens": 230,
    "cost_usd": 0.0023         // 网关附加：本次调用成本
  },
  "request_id": "req_ulid...", // 用于审计追踪
  ...
}
```

### 4.2 Virtual Key 管理
```
POST /v1/keys
{
  "name": "marketing-team-key",
  "budget_monthly_usd": 5000,
  "models_allowed": ["gpt-4o-mini", "claude-3-haiku"],
  "rpm_limit": 100,
  "tpm_limit": 50000,
  "expires_at": "2026-12-31T23:59:59Z"
}
```

### 4.3 Skill 注册
```
POST /v1/skills
Content-Type: multipart/form-data

// 包含:
// - skill.json (元数据 + 输入输出 Schema)
// - SKILL.md (结构化指令文档)
// - code/ (可选脚本包)
// - docs/ (可选参考文档)

Response:
{
  "skill_id": "skill_ulid...",
  "version": "1.0.0",
  "status": "published",
  "registry_url": "/skills/finance-report-parser"
}
```

### 4.4 预算查询
```
GET /v1/budgets?scope=department&period=2026-01

Response:
{
  "allocated_usd": 50000,
  "consumed_usd": 32450.67,
  "remaining_usd": 17549.33,
  "utilization_pct": 64.9,
  "forecast_exhaustion": "2026-01-22",
  "top_consumers": [
    { "project": "customer-support-bot", "cost": 12800 },
    { "project": "report-generator", "cost": 9500 }
  ]
}
```

## 五、非功能性需求明细

| 类别 | 指标 | 目标值 | 说明 |
|------|------|--------|------|
| 性能 | 网关 P50 延迟 | < 20ms | 不含模型推理时间 |
| 性能 | 网关 P99 延迟 | < 100ms | 不含模型推理时间 |
| 吞吐 | 并发连接数 | 10,000+ | 单实例 |
| 可用性 | SLA | 99.9% | 月度 |
| 安全 | 密钥泄露检测 | < 1min | 异常使用模式识别 |
| 数据 | 审计日志保留 | 7年 | 不可删除 |
| 合规 | GDPR 删除响应 | < 24h | 用户数据清除 |
| 扩展 | 新供应商接入 | < 30min | 配置化非编码 |

## 六、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 单点故障 (网关) | 全局不可用 | 多 AZ 部署 + 自动故障转移 |
| Token 计费偏差 | 成本失控 | 双重校验: 网关计数 + 供应商账单对账 |
| Agent 逃逸沙箱 | 系统入侵 | Firecracker 硬件隔离 + 网络默认拒绝 |
| PII 泄露 | 合规处罚 | 输入/输出双通道 Guardrails |
| 供应商锁定 | 迁移成本高 | 统一抽象层 + 模型可替换策略 |
