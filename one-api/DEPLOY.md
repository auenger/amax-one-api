# AIHub 部署文档

## 前提条件

* 服务器：Linux x86_64，已安装 Docker 和 Docker Compose

* 外部 PostgreSQL 16+（已有或新建）

* 外部 Redis 7+（已有或新建）

## 交付产物

| 文件                        | 说明                   |
| ------------------------- | -------------------- |
| `aihub-image.tar.gz`      | Docker 镜像压缩包（约 40MB） |
| `docker-compose.prod.yml` | 生产环境编排文件             |

## 1. 上传文件到服务器

```bash
scp aihub-image.tar.gz docker-compose.prod.yml user@your-server:~/aihub/
```

## 2. 导入镜像

```bash
ssh user@your-server
cd ~/aihub
docker load < aihub-image.tar.gz
# 确认镜像: docker images aihub:latest
```

## 3. 准备数据库

### PostgreSQL

在已有的 PostgreSQL 实例上创建数据库和用户：

```sql
CREATE USER oneapi WITH PASSWORD 'your_password';
CREATE DATABASE oneapi OWNER oneapi;
```

服务首次启动时会自动建表，无需手动导入 schema。

### Redis

确认 Redis 实例可达，如有密码需记下。

## 4. 修改配置

编辑 `docker-compose.prod.yml`，修改以下环境变量：

```yaml
environment:
  # PostgreSQL 连接串
  # 格式: postgres://用户名:密码@主机:端口/数据库名?sslmode=disable
  - SQL_DSN=postgres://oneapi:your_password@your-pg-host:5432/oneapi?sslmode=disable

  # Redis 连接串
  # 无密码: redis://主机:端口
  # 有密码: redis://:密码@主机:端口
  - REDIS_CONN_STRING=redis://your-redis-host:6379

  # session 加密密钥，务必改成长随机字符串
  - SESSION_SECRET=change_me_to_random_string
```

## 5. 启动服务

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 6. 验证

```bash
# 查看容器状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 健康检查
curl http://localhost:3000/api/status
```

浏览器访问 `http://your-server:3000`，默认 root 账号：

* 用户名：`root`

* 密码：`123456`

**首次登录后请立即修改 root 密码。**

## 常用操作

```bash
# 停止服务
docker compose -f docker-compose.prod.yml down

# 重启服务
docker compose -f docker-compose.prod.yml restart

# 查看实时日志
docker compose -f docker-compose.prod.yml logs -f --tail 100

# 更新版本：重新上传镜像包，导入后重启
docker load < aihub-image.tar.gz
docker compose -f docker-compose.prod.yml up -d
```

## 环境变量参考

| 变量                  | 必填 | 说明                    |
| ------------------- | -- | --------------------- |
| `SQL_DSN`           | 是  | PostgreSQL 连接串        |
| `REDIS_CONN_STRING` | 是  | Redis 连接串             |
| `SESSION_SECRET`    | 是  | Session 加密密钥          |
| `THEME`             | 否  | 前端主题，默认 `berry`       |
| `TZ`                | 否  | 时区，默认 `Asia/Shanghai` |
| `MINIMAX_API_KEY`   | 否  | Minimax API Key，设置后自动启动 Minimax MCP 服务 |
| `MINIMAX_API_HOST`  | 否  | Minimax API 区域，默认 `https://api.minimaxi.com` |
| `MINIMAX_MCP_PORT`  | 否  | Minimax MCP 端口，默认 `8765` |
| `Z_AI_API_KEY`      | 否  | 智谱 API Key，设置后自动启动智谱 MCP 服务 |
| `Z_AI_MODE`         | 否  | 智谱模式，默认 `ZHIPU` |
| `Z_AI_MCP_PORT`     | 否  | 智谱 MCP 端口，默认 `8766` |

## 注意事项

* 数据库 schema 由服务自动管理，首次启动自动建表

* 配额数据通过批量更新器每 5 秒写入数据库，异常停机可能丢失最近 5 秒的配额变更

* Redis 用于并发追踪和配额缓存，Redis 不可用会导致并发监控功能降级，不影响核心代理转发

## 内置 MCP 服务

Docker 镜像内置了 Minimax MCP 和智谱 MCP 服务，通过环境变量控制启停：设置了对应的 API Key 就自动启动，不设置则不启动。

### 启用 MCP

在 `docker-compose.prod.yml` 中添加环境变量：

```yaml
environment:
  # Minimax MCP（提供 web_search、understand_image 工具）
  - MINIMAX_API_KEY=sk-cp-xxx
  # 智谱 MCP（提供 web_search、image_analyze 等工具）
  - Z_AI_API_KEY=xxx.xxx
```

### 在 MCP 供应商页面配置

MCP 服务启动后，在管理后台「MCP 设置」页面添加供应商：

| 供应商   | Base URL              | 传输方式 |
| -------- | --------------------- | -------- |
| Minimax  | `http://localhost:8765/sse` | SSE      |
| 智谱     | `http://localhost:8766/sse` | SSE      |

添加后点击「同步」即可注册对应的工具。