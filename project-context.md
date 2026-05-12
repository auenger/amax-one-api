---
last_updated: '2026-05-07'
version: 1
features_completed: 0
---

# Project Context: Enterprise AI Control Plane

> 企业级 AI 控制平台 — AI 治理、资产编排与代理调度中枢。所有 AI 代理实现代码时须遵守此文件中的关键规则与约定。

---

## Technology Stack

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Language (Backend-TS) | TypeScript / Node.js | — | API Gateway, Auth, Asset Registry |
| Framework (TS) | Fastify | — | 高性能 HTTP 框架 |
| Language (Backend-Py) | Python | — | Billing, Audit Service |
| Framework (Py) | FastAPI + Celery | — | 异步计量与审计处理 |
| Frontend | Next.js (App Router) | 14 | shadcn/ui + Radix UI |
| Styling | TailwindCSS | 4 | — |
| State Management | TanStack Query + Zustand | — | — |
| Visualization | React Flow + ECharts | — | 编排画布 + 监控大盘 |
| Primary DB | PostgreSQL | 16 | ORM: Prisma (TS) / SQLAlchemy (Py) |
| Cache | Redis | 7 | 配额缓存、会话、实时计数 |
| Analytics | TimescaleDB / ClickHouse | — | 审计日志、用量时序 |
| Object Storage | MinIO / S3 | — | Skill 包、Agent 快照、审计归档 |
| Container | Kubernetes | — | 编排 |
| Sandbox | Firecracker / gVisor / Docker | — | 分级隔离 |
| Observability | OpenTelemetry + Jaeger + Prometheus + Grafana | — | — |
| CI/CD | GitHub Actions + ArgoCD | — | — |

## Directory Structure

```
enterprise-ai-control-plane/
├── .claude/                  # Claude Code 配置
├── .neuro/                   # Neuro 工作目录
├── docs/                     # 项目文档
├── feature-workflow/         # Feature Workflow 系统
│   └── templates/            # 模板文件
├── neuro-syntax.config.json  # 架构与配置定义
└── project-context.md        # 本文件
```

## Architecture

**Pattern**: Control Plane / Hub-and-Spoke (Microservices + API Gateway)

| Domain | Service | Responsibility |
|--------|---------|---------------|
| api-gateway | 统一 API 网关 | 协议转换、动态路由、负载均衡、故障降级 |
| auth-service | 鉴权与身份服务 | Virtual Key 管理、RBAC、OIDC/SSO |
| billing-service | 经济治理服务 | Token 计量、预算控制、成本分摊 |
| asset-registry | 资产注册中心 | Skill/Agent/Tool 版本化管理与发现 |
| execution-runtime | 沙箱执行环境 | 代码隔离、瞬时容器管理、网络策略 |
| audit-service | 审计与护栏服务 | 不可篡改日志、内容审查、全链路追踪 |

## Critical Rules

### Must Follow

- **外置安全**: 护栏/配额/隔离必须在 Agent 执行环境之外强制执行，不可依赖 Agent 自律
- **契约优先**: 所有 Skill/Tool 通过 JSON Schema / OpenAPI 定义接口契约
- **默认拒绝**: 网络、权限、执行默认关闭，按需开放
- **不可篡改**: 审计日志一旦写入不可修改/删除
- **最小权限**: 用户/Agent 仅拥有完成任务所需的最小权限集
- **API 兼容**: 所有模型接口统一为 OpenAI 兼容格式
- **ID 格式**: 使用 ULID 作为有序唯一标识
- **错误格式**: 遵循 RFC 7807 Problem Details
- **分页策略**: 使用 Cursor-based 分页
- **i18n**: 默认中文 (zh-CN)，支持国际化

### Must Avoid

- API Key 硬编码或明文存储 (影子 AI 遏制)
- 直接暴露供应商真实密钥给用户 (必须走 Virtual Key)
- 跳过审计日志记录
- 在 Agent 沙箱内允许不受限网络访问
- 忽略 PII 检测直接发送请求到模型

## Security

- **Auth**: OAuth 2.0 / OIDC / SAML
- **Key Management**: HashiCorp Vault / AWS KMS
- **Sandbox Tiers**: Docker (低风险) → gVisor (常规) → Firecracker (高风险)
- **Input Filters**: PII 检测、Prompt 注入检测、密钥扫描
- **Output Filters**: 幻觉检测、有害内容检测、数据泄露防护
- **Compliance**: SOC2 Type II, GDPR, ISO 27001, 等保三级

## Conventions

| Aspect | Convention |
|--------|-----------|
| API Style | RESTful + Async (Webhook/SSE) |
| API Versioning | URL Path (/v1/) |
| ID Format | ULID |
| Error Format | RFC 7807 Problem Details |
| Pagination | Cursor-based |
| Logging | Structured JSON → Loki/Elasticsearch |
| Alerting | PagerDuty / 钉钉 / 飞书 |
| Default Locale | zh-CN |

## References

| Category | Projects |
|----------|---------|
| Gateway | LiteLLM, One-API |
| Platform | Dify, Coze |
| Sandbox | gVisor, Firecracker |
| API Governance | Kong AI Gateway |
| Standards | OpenAPI 3.1, JSON Schema 2020-12, CloudEvents 1.0 |

## Roadmap

| Phase | Focus | Key Items |
|-------|-------|-----------|
| Phase 1 | 接入层 | 统一模型目录、鉴权池化、OpenAI 兼容代理 |
| Phase 2 | 资产层 | Skill 注册表、Agent 身份体系、内部资产市场 |
| Phase 3 | 治理层 | Token 计量账单、多级预算控制、RBAC 权限 |
| Phase 4 | 安全部 | 沙箱执行环境、Guardrails 护栏、全链路审计 |
| Phase 5 | 运维层 | 监控大盘、预测性告警、自动化运维 |

## Non-functional Requirements

- **SLA**: 99.9% (网关层)
- **Latency**: P99 < 500ms (不含模型推理)
- **Concurrency**: 10,000+ 连接

## Update Log

- 2026-05-07: 初始 project-context 创建，基于 neuro-syntax.config.json
