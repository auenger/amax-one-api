# Feature: feat-affinity-auto-bind Claude Code 会话亲和增强

## Basic Information
- **ID**: feat-affinity-auto-bind
- **Name**: Claude Code 会话亲和增强（自动绑定）
- **Priority**: 80
- **Size**: M
- **Dependencies**: []
- **Parent**: null
- **Children**: [feat-affinity-debug-probe, feat-affinity-fallback]
- **Created**: 2026-05-26
- **Split**: true

## Description

线上日志显示 Claude Code 客户端请求在多个渠道间跳动，根因是客户端不发送 conversation_id 导致亲和失效。需分两步解决：先用探针抓取请求数据确认可用标识符，再实现 fallback 亲和。

## Sub-Features

### 1. feat-affinity-debug-probe (优先级 80, S)
请求调试探针 — 在 relay 入口增强 debug 日志，捕获 Claude Code 的 headers 和 body 字段。

### 2. feat-affinity-fallback (优先级 75, S, 依赖 probe)
Fallback 自动亲和 — 基于探针结果实现 Token+Model fallback 渠道绑定。

## Progress
| Date | Progress | Notes |
|------|----------|-------|
| 2026-05-26 | Split into 2 sub-features | 探针先行，fallback 待探针结果确认 |
