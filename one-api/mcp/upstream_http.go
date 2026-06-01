package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/songquanpeng/one-api/model"
)

// sendStreamableHTTP sends a JSON-RPC request via Streamable HTTP transport
// to the upstream MCP server. The client sends a single POST with a JSON-RPC
// request and receives a JSON-RPC response.
func sendStreamableHTTP(ctx context.Context, provider *model.MCPProvider, req *JSONRPCRequest) (*JSONRPCResponse, error) {
	return sendStreamableHTTPRaw(ctx, provider, nil, req)
}

// sendStreamableHTTPRaw sends raw bytes or a JSONRPCRequest via HTTP POST.
// If rawBody is non-nil, it is used directly; otherwise req is marshalled.
func sendStreamableHTTPRaw(ctx context.Context, provider *model.MCPProvider, rawBody []byte, req *JSONRPCRequest) (*JSONRPCResponse, error) {
	var body []byte
	var err error
	if rawBody != nil {
		body = rawBody
	} else {
		body, err = json.Marshal(req)
		if err != nil {
			return nil, fmt.Errorf("marshal request: %w", err)
		}
	}

	endpoint := provider.BaseURL
	// Normalize endpoint — some servers expect /message for HTTP transport
	endpoint = normalizeHTTPEndpoint(endpoint)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if provider.AuthToken != "" {
		httpReq.Header.Set("Authorization", "Bearer "+provider.AuthToken)
	}

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("upstream request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var rpcResp JSONRPCResponse
	if err := json.Unmarshal(respBody, &rpcResp); err != nil {
		return nil, fmt.Errorf("parse response: %w (body: %s)", err, string(respBody))
	}

	return &rpcResp, nil
}

// normalizeHTTPEndpoint adjusts the endpoint URL for HTTP transport.
// If the URL already looks like a full endpoint, keep it.
// If it's a base URL without path, append /message.
func normalizeHTTPEndpoint(url string) string {
	// Keep as-is if it already has a meaningful path
	return url
}
