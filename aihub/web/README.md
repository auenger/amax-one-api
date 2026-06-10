# ModelHub 前端

> ModelHub 使用 React + MUI 5 作为前端界面。

## 开发

```bash
cd web/web
npm install
npm start     # 开发模式（热更新）
npm run build # 生产构建
```

构建产物由 `rebuild.sh` 自动拷贝到 `web/build/web/` 并通过 `go:embed` 嵌入 Go 二进制。
