#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> 1/3 构建 web 前端..."
cd web/web
rm -rf build
npm run build

echo "==> 2/3 拷贝产物到 web 根层..."
cd ../..
rm -rf web/build/web
mkdir -p web/build/web
cp -r web/web/build/* web/build/web/
rm -rf web/web/build
cp -n web/web/public/*.html web/build/web/ 2>/dev/null || true

echo "==> 3/3 构建 Go 二进制..."
go clean -cache
go build -o bin/aihub .

echo "==> 完成! 启动: ./bin/aihub"
