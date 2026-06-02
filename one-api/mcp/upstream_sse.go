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

// sseConn holds a persistent SSE connection and its associated state.
type sseConn struct {
	closer          io.Closer
	scanner         *bufio.Scanner
	messageEndpoint string
	sessionID       string
}

// connectSSE establishes a persistent SSE connection and returns the connection state.
func connectSSE(ctx context.Context, provider *model.MCPProvider, sessionID string) (*sseConn, error) {
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

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("SSE connect failed (%d): %s", resp.StatusCode, string(body))
	}

	newSessionID := resp.Header.Get("Mcp-Session-Id")

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
		resp.Body.Close()
		return nil, fmt.Errorf("SSE: no message endpoint received from upstream")
	}

	if !strings.Contains(messageEndpoint, "://") {
		base := strings.TrimSuffix(provider.BaseURL, "/")
		base = strings.TrimSuffix(base, "/sse")
		messageEndpoint = base + messageEndpoint
	}

	return &sseConn{
		closer:          resp.Body,
		scanner:         scanner,
		messageEndpoint: messageEndpoint,
		sessionID:       newSessionID,
	}, nil
}

// close closes the SSE connection.
func (c *sseConn) close() {
	c.closer.Close()
}

// postAndRead sends a JSON-RPC request via POST and reads the response from the SSE stream.
func (c *sseConn) postAndRead(ctx context.Context, provider *model.MCPProvider, req *JSONRPCRequest) (*JSONRPCResponse, error) {
	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	postReq, err := http.NewRequestWithContext(ctx, "POST", c.messageEndpoint, strings.NewReader(string(reqBody)))
	if err != nil {
		return nil, fmt.Errorf("create POST request: %w", err)
	}
	postReq.Header.Set("Content-Type", "application/json")
	if provider.AuthToken != "" {
		postReq.Header.Set("Authorization", "Bearer "+provider.AuthToken)
	}
	if c.sessionID != "" {
		postReq.Header.Set("Mcp-Session-Id", c.sessionID)
	}

	postResp, err := http.DefaultClient.Do(postReq)
	if err != nil {
		return nil, fmt.Errorf("POST to upstream: %w", err)
	}
	defer postResp.Body.Close()

	// Notifications (no ID) don't get a response via SSE
	if req.ID == nil {
		return nil, nil
	}

	for c.scanner.Scan() {
		line := c.scanner.Text()
		if strings.HasPrefix(line, "event: message") {
			for c.scanner.Scan() {
				dataLine := c.scanner.Text()
				if strings.HasPrefix(dataLine, "data: ") {
					data := strings.TrimPrefix(dataLine, "data: ")
					// Skip server-initiated notifications (e.g. "SSE Connection established")
					if strings.Contains(data, `"method":`) && !strings.Contains(data, `"id":`) {
						break // back to outer loop for next event
					}
					var rpcResp JSONRPCResponse
					if err := json.Unmarshal([]byte(data), &rpcResp); err != nil {
						return nil, fmt.Errorf("parse SSE response: %w", err)
					}
					if c.sessionID != "" {
						rpcResp.SessionID = c.sessionID
					}
					return &rpcResp, nil
				}
			}
		}
	}

	return nil, fmt.Errorf("SSE: no response received from upstream")
}

// sendSSEPersistent sends a JSON-RPC request using a persistent SSE connection
// stored on the UpstreamClient. It connects if needed, and reuses the connection
// for subsequent requests (initialize → initialized → tools/list → tools/call).
func (c *UpstreamClient) sendSSEPersistent(ctx context.Context, req *JSONRPCRequest) (*JSONRPCResponse, error) {
	c.sseMu.Lock()
	defer c.sseMu.Unlock()

	if c.sseConn == nil {
		sid := ""
		conn, err := connectSSE(ctx, c.Provider, sid)
		if err != nil {
			return nil, err
		}
		c.sseConn = conn
	}

	resp, err := c.sseConn.postAndRead(ctx, c.Provider, req)
	if err != nil {
		// Connection broken, close and retry once
		c.sseConn.close()
		c.sseConn = nil

		conn, connErr := connectSSE(ctx, c.Provider, "")
		if connErr != nil {
			return nil, fmt.Errorf("reconnect failed: %w (original: %v)", connErr, err)
		}
		c.sseConn = conn

		resp, err = c.sseConn.postAndRead(ctx, c.Provider, req)
		if err != nil {
			c.sseConn.close()
			c.sseConn = nil
			return nil, err
		}
	}

	// Update session ID
	if resp != nil && resp.SessionID != "" {
		c.mu.Lock()
		c.sessionID = resp.SessionID
		c.mu.Unlock()
	}

	return resp, nil
}

// CloseSSE closes any persistent SSE connection.
func (c *UpstreamClient) CloseSSE() {
	c.sseMu.Lock()
	defer c.sseMu.Unlock()
	if c.sseConn != nil {
		c.sseConn.close()
		c.sseConn = nil
	}
}

// sendSSE sends a one-shot SSE request (used for non-persistent connections).
func sendSSE(ctx context.Context, provider *model.MCPProvider, sessionID string, req *JSONRPCRequest) (*JSONRPCResponse, error) {
	conn, err := connectSSE(ctx, provider, sessionID)
	if err != nil {
		return nil, err
	}
	defer conn.close()

	return conn.postAndRead(ctx, provider, req)
}
