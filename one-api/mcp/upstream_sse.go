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
// SSE transport: Connect to the SSE endpoint, receive the message POST URL,
// POST the request, then read the response from the SSE event stream.
func sendSSE(ctx context.Context, provider *model.MCPProvider, req *JSONRPCRequest) (*JSONRPCResponse, error) {
	// Step 1: Establish SSE connection to the upstream server
	sseURL := strings.TrimSuffix(provider.BaseURL, "/")
	if !strings.HasSuffix(sseURL, "/sse") {
		sseURL += "/sse"
	}

	httpReq, err := http.NewRequestWithContext(ctx, "GET", sseURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create SSE request: %w", err)
	}
	if provider.AuthToken != "" {
		httpReq.Header.Set("Authorization", "Bearer "+provider.AuthToken)
	}
	httpReq.Header.Set("Accept", "text/event-stream")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("SSE connect: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("SSE connect failed (%d): %s", resp.StatusCode, string(body))
	}

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
		// Relative URL — resolve against base
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
	if provider.AuthToken != "" {
		postReq.Header.Set("Authorization", "Bearer "+provider.AuthToken)
	}
	postReq.Header.Set("Content-Type", "application/json")

	postResp, err := client.Do(postReq)
	if err != nil {
		return nil, fmt.Errorf("POST to upstream: %w", err)
	}
	defer postResp.Body.Close()

	// Step 4: Read the response from the SSE stream
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "event: message") {
			// Next line(s) will contain the data
			for scanner.Scan() {
				dataLine := scanner.Text()
				if strings.HasPrefix(dataLine, "data: ") {
					data := strings.TrimPrefix(dataLine, "data: ")
					var rpcResp JSONRPCResponse
					if err := json.Unmarshal([]byte(data), &rpcResp); err != nil {
						return nil, fmt.Errorf("parse SSE response: %w", err)
					}
					return &rpcResp, nil
				}
			}
		}
	}

	return nil, fmt.Errorf("SSE: no response received from upstream")
}
