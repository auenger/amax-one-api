# Phase 1 范围定义：接入层 (MVP)

## 目标
构建可运行的 **统一 API 网关 + 鉴权池化** 最小可行产品。

## In Scope (本阶段包含)

### 必须有 (Must Have)
- [ ] **统一 API 代理**
  - [ ] OpenAI Chat Completions 格式兼容
  - [ ] 至少支持 2 个供应商 (OpenAI + Anthropic)
  - [ ] 协议转换与错误归一化
  - [ ] 请求/响应日志记录
  
- [ ] **Virtual Key 体系**
  - [ ] Key 生成与管理 API
  - [ ] 模型访问白名单
  - [ ] RPM / TPM 速率限制 (Redis 计数器)
  - [ ] Key 启用/禁用/撤销
  
- [ ] **基础 Token 计量**
  - [ ] 每次 request 的 prompt/completion token 记录
  - [ ] 基于静态定价表的成本估算
  - [ ] 按 Key 维度的消耗汇总

- [ ] **管理后台 (前端雏形)**
  - [ ] 模型目录展示
  - [ ] Virtual Key CRUD
  - [ ] 基础用量仪表盘

### 应该有 (Should Have)
- [ ] **简单预算控制**
  - [ ] 月度预算上限设定
  - [ ] 超限返回 429 + 错误码 `ExceededTokenBudget`
  
- [ ] **基础认证**
  - [ ] 管理员账号 (本地数据库)
  - [ ] JWT Token 签发与校验

- [ ] **健康检查与监控**
  - [ ] `/health` 端点
  - [ ] Prometheus metrics 导出

## Out of Scope (本阶段不包含)
- ~~Skill/Agent 资产注册表~~ -> Phase 2
- ~~沙箱执行环境~~ -> Phase 4
- ~~OIDC/SSO 集成~~ -> Phase 3
- ~~复杂 RBAC 体系~~ -> Phase 3
- ~~Guardrails 内容护栏~~ -> Phase 4
- ~~多级预算与预测告警~~ -> Phase 3
- ~~供应商故障自动切换~~ -> Phase 1.5

## 技术选型 (Phase 1)

```
+---------------------------------------------+
|              Frontend (Admin)                |
|         Next.js 14 + shadcn/ui              |
+---------------------+-----------------------+
                      | REST API
+---------------------v-------------------------+
|            API Gateway Service               |
|         Node.js + Fastify + TypeScript       |
|                                             |
|  +-------------+  +---------------------+   |
|  | Auth Middleware| | Rate Limiter(Redis) |   |
|  +---------------+  +---------------------+   |
|  +-------------+  +---------------------+   |
|  | Route Handler| | Token Counter        |   |
|  +-------------+  +---------------------+   |
|  +-------------+  +---------------------+   |
|  | Provider Adapters                       |   |
|  | (OpenAI / Anthropic / Generic)          |   |
|  +-------------+  +---------------------+   |
+---------------------+-----------------------+
                      |
+---------------------v-----------------------+
|              Data Layer                      |
|  PostgreSQL (users, keys, models, logs)      |
|  Redis (rate limits, caching)               |
+---------------------------------------------+
```

## 目录结构建议 (Phase 1)

```
enterprise-ai-control-plane/
+-- apps/
|   +-- gateway/                 # API 网关主服务
|   |   +-- src/
|   |   |   +-- core/            # 核心逻辑
|   |   |   |   +-- gateway.ts   # 主网关逻辑
|   |   |   |   +-- auth.ts      # Virtual Key 校验
|   |   |   |   +-- limiter.ts   # 速率限制
|   |   |   +-- providers/       # 供应商适配器
|   |   |   |   +-- openai.ts
|   |   |   |   +-- anthropic.ts
|   |   |   |   +-- base.ts      # 抽象基类
|   |   |   +-- billing/         # Token 计量
|   |   |   |   +-- counter.ts
|   |   |   |   +-- pricing.ts
|   |   |   +-- routes/          # API 路由
|   |   |   |   +-- v1/
|   |   |   |   |   +-- chat.ts
|   |   |   |   |   +-- keys.ts
|   |   |   |   |   +-- models.ts
|   |   |   |   +-- admin/
|   |   |   +-- middleware/      # 中间件
|   |   +-- package.json
|   |   +-- tsconfig.json
|   |
|   +-- admin/                   # 管理前端
|       +-- src/
|       |   +-- app/
|       |   |   +-- dashboard/
|       |   |   +-- keys/
|       |   |   +-- models/
|       |   |   +-- usage/
|       |   +-- components/
|       +-- package.json
|       +-- next.config.js
|
+-- packages/
|   +-- shared/                  # 共享类型与工具
|   |   +-- src/
|   |   |   +-- types/
|   |   |   +-- utils/
|   |   +-- package.json
|   |
|   +-- db/                      # 数据库 Schema 与迁移
|       +-- prisma/
|       |   +-- schema.prisma
|       +-- package.json
|
+-- docker-compose.yml           # 本地开发环境
+-- .env.example
+-- turbo.json                   # Turborepo 配置
```

## 验收标准 (DoD)

1. 使用 Virtual Key 成功调用 OpenAI GPT-4o 并获得标准格式响应
2. 超过 RPM/TPM 限制时返回 429 错误
3. 管理后台可创建/查看/撤销 Virtual Key
4. 每次调用的 Token 数量和估算成本正确记录到数据库
5. 单个网关实例能承载 1000 并发连接
