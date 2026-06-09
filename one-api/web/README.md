# ModelHub 前端

> ModelHub 使用 Berry 主题 (React + MUI 5) 作为唯一前端界面。

## 主题：Berry

Berry 主题由 [MartialBE](https://github.com/MartialBE) 开发，ModelHub 在此基础上进行了深度定制。

## 开发

```bash
cd web/berry
npm install
npm start     # 开发模式（热更新）
npm run build # 生产构建
```

构建产物由 `rebuild.sh` 自动拷贝到 `web/build/berry/` 并通过 `go:embed` 嵌入 Go 二进制。
