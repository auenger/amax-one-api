# Tasks: feat-error-passthrough

## Task Breakdown

### 1. ErrorWithStatusCode 增加 RawBody 字段
- [x] `relay/model/misc.go`: 在 `ErrorWithStatusCode` 添加 `RawBody string` 字段

### 2. RelayErrorHandler 始终记录原始响应
- [x] `relay/controller/error.go`: 移除 `config.DebugEnabled` 条件，改为始终记录上游错误响应
- [x] `relay/controller/error.go`: 将 `responseBody` 赋值到 `ErrorWithStatusCode.RawBody`

### 3. Claude 格式错误透传
- [x] `controller/anthropic_relay.go`: 修改最终错误返回，保留上游 error type/code 而非统一 "api_error"

### 4. OpenAI 格式 429 错误增强
- [x] `controller/relay.go`: 429 错误保留原始上游信息，追加中文提示

### 5. 构建验证
- [x] `cd one-api && go build -o bin/one-api .` 确认编译通过
- [ ] 手动测试：发送请求到已知会报错的模型，验证错误透传

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-19 | Feature created | 待开发 |
| 2026-05-19 | Implementation complete | 4 files modified, build passes |
