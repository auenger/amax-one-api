# Tasks: feat-fallback-model

## Task Breakdown

### 1. 后端 — 系统配置
- [x] 在 `common/config/config.go` 声明 `FallbackEnabled`、`FallbackChannelId`、`FallbackModel`
- [x] 在 `model/option.go` 的 `InitOptionMap()` 注册默认值
- [x] 在 `model/option.go` 的 `updateOptionMap()` 添加分发 case

### 2. 后端 — 兜底亲和查询 (affinity.go)
- [x] 新增 `lookupFallbackAffinity()` 查询 `fallback-affinity:{conversationId}` / `fallback-affinity:session:{sessionId}`
- [x] 在 Affinity 中间件中优先检查兜底亲和，命中时设置 `SpecificChannelId` + `FallbackModelOverride`
- [x] 验证兜底渠道可用性，不可用时清除映射

### 3. 后端 — 压力感知降级路由 (distributor.go)
- [x] 在 `smartSelectChannel()` 中计算目标模型渠道不可用比例
- [x] 部分不可用时按比例概率决定是否路由到兜底
- [x] 全部不可用时强制路由到兜底
- [x] 设置 `FallbackModelOverride` 标记到 context

### 4. 后端 — 模型名替换 + 粘性记录 (relay)
- [x] 在 relay 控制器中，若 `FallbackModelOverride` 存在，替换请求体中的 model（通过现有 contextModel 机制自动处理）
- [x] 请求成功后记录 `fallback-affinity` 粘性映射到 Redis

### 5. 前端 — 降级监控页 UI
- [x] 在 `DowngradeRules/index.js` 顶部新增兜底模型配置卡片（Card）
- [x] 卡片包含：启用开关（Switch）+ 渠道 ID（数字输入）+ 模型名（文本输入）
- [x] 启用关闭时灰化输入框
- [x] 保存校验：启用时渠道 ID 和模型名不能为空
- [x] 配置通过 `/api/option/` 读取和保存

### 6. 测试与验证
- [x] Go vet 通过（controller/ middleware/ model/ common/）
- [ ] 手动测试：配置兜底 → 部分渠道禁用 → 验证降级路由
- [ ] 手动测试：会话粘性验证
- [ ] 手动测试：兜底渠道不可用时不影响正常路由

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-27 | Feature created | 需求分析完成，文档生成 |
| 2026-05-27 | Implementation complete | 5/6 tasks done, remaining: manual testing |
