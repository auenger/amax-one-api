#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> 1/3 构建 berry 前端..."
cd web/berry
rm -rf build
npm run build

echo "==> 2/3 拷贝产物到 berry 根层..."
cd ../..
rm -rf web/build/berry
mkdir -p web/build/berry
cp -r web/berry/build/* web/build/berry/
rm -rf web/berry/build
cp -n web/berry/public/*.html web/build/berry/ 2>/dev/null || true

echo "==> 3/3 构建 Go 二进制..."
go clean -cache
go build -o bin/one-api .

echo "==> 完成! 启动: ./bin/one-api"
