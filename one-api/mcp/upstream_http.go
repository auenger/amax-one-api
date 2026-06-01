package mcp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/songquanpeng/one-api/model"
)

// sendStreamableHTTP sends a JSON-RPC request via Streamable HTTP transport.
// sessionID is included in the Mcp-Session-Id header when non-empty.
func sendStreamableHTTP(ctx context.Context, provider *model.MCPProvider, sessionID string, req *JSONRPCRequest) (*JSONRPCResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", provider.BaseURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json, text/event-stream")
	if provider.AuthToken != "" {
		httpReq.Header.Set("Authorization", "Bearer "+provider.AuthToken)
	}
	if sessionID != "" {
		httpReq.Header.Set("Mcp-Session-Id", sessionID)
	}

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("upstream request: %w", err)
	}
	defer resp.Body.Close()

	// Capture session ID from response header
	newSessionID := resp.Header.Get("Mcp-Session-Id")
	if newSessionID != "" {
		_ = newSessionID // caller should store this
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream returned status %d: %s", resp.StatusCode, string(respBody))
	}

	// Notification requests (no "id" field) may have empty body
	if req.ID == nil && len(respBody) == 0 {
		return nil, nil
	}

	// Parse response — may be plain JSON or SSE format
	jsonStr := extractJSONFromResponse(respBody)
	if jsonStr == "" {
		if req.ID == nil {
			return nil, nil
		}
		return nil, fmt.Errorf("empty response from upstream")
	}

	var rpcResp JSONRPCResponse
	if err := json.Unmarshal([]byte(jsonStr), &rpcResp); err != nil {
		return nil, fmt.Errorf("parse response: %w (body: %s)", err, string(respBody))
	}

	// Attach session ID to response for the caller to store
	if newSessionID != "" {
		rpcResp.SessionID = newSessionID
	}

	return &rpcResp, nil
}

// extractJSONFromResponse extracts JSON content from either plain JSON or SSE
// formatted response body.
func extractJSONFromResponse(body []byte) string {
	respStr := strings.TrimSpace(string(body))
	if respStr == "" {
		return ""
	}

	// SSE format: contains "data:" lines
	if strings.HasPrefix(respStr, "data:") || strings.Contains(respStr, "\ndata:") {
		return extractSSEData(body)
	}

	// Plain JSON
	return respStr
}

// extractSSEData extracts the JSON content from the first "data:" line.
func extractSSEData(body []byte) string {
	scanner := bufio.NewScanner(bytes.NewReader(body))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data:") {
			data := strings.TrimPrefix(line, "data:")
			if len(data) > 0 && data[0] == ' ' {
				data = data[1:]
			}
			return data
		}
	}
	return ""
}
