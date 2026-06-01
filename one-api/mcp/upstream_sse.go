package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/songquanpeng/one-api/model"
)

// sendSSE sends a JSON-RPC request via SSE transport to the upstream MCP server.
func sendSSE(ctx context.Context, provider *model.MCPProvider, sessionID string, req *JSONRPCRequest) (*JSONRPCResponse, error) {
	// Step 1: Establish SSE connection
	sseURL := strings.TrimSuffix(provider.BaseURL, "/")
	if !strings.HasSuffix(sseURL, "/sse") {
		sseURL += "/sse"
	}

	httpReq, err := http.NewRequestWithContext(ctx, "GET", sseURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create SSE request: %w", err)
	}
	httpReq.Header.Set("Accept", "text/event-stream")
	if provider.AuthToken != "" {
		httpReq.Header.Set("Authorization", "Bearer "+provider.AuthToken)
	}
	if sessionID != "" {
		httpReq.Header.Set("Mcp-Session-Id", sessionID)
	}

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("SSE connect: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("SSE connect failed (%d): %s", resp.StatusCode, string(body))
	}

	// Capture session ID
	newSessionID := resp.Header.Get("Mcp-Session-Id")

	// Step 2: Read the endpoint event to get the message POST URL
	scanner := bufio.NewScanner(resp.Body)
	var messageEndpoint string
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")
			if strings.HasPrefix(data, "/") || strings.Contains(data, "://") {
				messageEndpoint = data
				break
			}
		}
	}

	if messageEndpoint == "" {
		return nil, fmt.Errorf("SSE: no message endpoint received from upstream")
	}

	// Step 3: POST the request to the message endpoint
	if !strings.Contains(messageEndpoint, "://") {
		base := strings.TrimSuffix(provider.BaseURL, "/")
		messageEndpoint = base + messageEndpoint
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	postReq, err := http.NewRequestWithContext(ctx, "POST", messageEndpoint, strings.NewReader(string(reqBody)))
	if err != nil {
		return nil, fmt.Errorf("create POST request: %w", err)
	}
	postReq.Header.Set("Content-Type", "application/json")
	if provider.AuthToken != "" {
		postReq.Header.Set("Authorization", "Bearer "+provider.AuthToken)
	}
	if sessionID != "" {
		postReq.Header.Set("Mcp-Session-Id", sessionID)
	}

	postResp, err := http.DefaultClient.Do(postReq)
	if err != nil {
		return nil, fmt.Errorf("POST to upstream: %w", err)
	}
	defer postResp.Body.Close()

	// Step 4: Read the response from the SSE stream
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "event: message") {
			for scanner.Scan() {
				dataLine := scanner.Text()
				if strings.HasPrefix(dataLine, "data: ") {
					data := strings.TrimPrefix(dataLine, "data: ")
					var rpcResp JSONRPCResponse
					if err := json.Unmarshal([]byte(data), &rpcResp); err != nil {
						return nil, fmt.Errorf("parse SSE response: %w", err)
					}
					if newSessionID != "" {
						rpcResp.SessionID = newSessionID
					}
					return &rpcResp, nil
				}
			}
		}
	}

	// Notification requests may have no response
	if req.ID == nil {
		return nil, nil
	}

	return nil, fmt.Errorf("SSE: no response received from upstream")
}
