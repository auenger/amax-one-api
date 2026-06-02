#!/bin/sh
set -e

MCP_PIDS=""

cleanup() {
    if [ -n "$MCP_PIDS" ]; then
        echo "[entrypoint] Stopping MCP services..."
        for pid in $MCP_PIDS; do
            kill "$pid" 2>/dev/null || true
        done
        wait 2>/dev/null || true
    fi
    exit 0
}

trap cleanup EXIT INT TERM

# Start Minimax MCP (native SSE)
if [ -n "$MINIMAX_API_KEY" ]; then
    MINIMAX_MCP_PORT="${MINIMAX_MCP_PORT:-8765}"
    echo "[MCP] Starting Minimax MCP on :${MINIMAX_MCP_PORT}"
    MINIMAX_API_KEY="$MINIMAX_API_KEY" \
    MINIMAX_API_HOST="${MINIMAX_API_HOST:-https://api.minimaxi.com}" \
    uvx minimax-coding-plan-mcp --sse --port "$MINIMAX_MCP_PORT" &
    MCP_PIDS="$MCP_PIDS $!"
fi

# Start Z-AI MCP (stdio -> SSE via supergateway)
if [ -n "$Z_AI_API_KEY" ]; then
    Z_AI_MCP_PORT="${Z_AI_MCP_PORT:-8766}"
    echo "[MCP] Starting Z-AI MCP on :${Z_AI_MCP_PORT}"
    Z_AI_API_KEY="$Z_AI_API_KEY" \
    Z_AI_MODE="${Z_AI_MODE:-ZHIPU}" \
    npx supergateway \
        --stdio "npx -y @z_ai/mcp-server" \
        --port "$Z_AI_MCP_PORT" &
    MCP_PIDS="$MCP_PIDS $!"
fi

if [ -z "$MCP_PIDS" ]; then
    echo "[MCP] No MCP API keys set, skipping MCP services"
fi

# Start main service (foreground)
echo "[one-api] Starting on :3000"
exec /opt/aihub/one-api
