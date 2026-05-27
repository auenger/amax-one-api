# Tasks: feat-downgrade-limit-window

## Task Breakdown

### 1. 后端：降级窗口过滤逻辑
- [x] 修改 `checkDowngradeRules()` — 窗口遍历增加 `w.Label == "5h"` 过滤
- [x] 修改 `cleanupDowngradeMarkers()` — 恢复判断同样只看 "5h" 窗口
- [x] 验证配额耗尽和低配额警告逻辑不受影响

## Progress Log
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-28 | 1/1 tasks done | go build + go vet 通过 |
