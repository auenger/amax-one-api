package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
)

// UpstreamClient manages a connection to an upstream MCP server.
type UpstreamClient struct {
	Provider *model.MCPProvider

	mu        sync.RWMutex
	tools     []UpstreamTool
	lastSync  time.Time
	connected bool
}

// UpstreamTool represents a tool discovered from an upstream MCP server.
type UpstreamTool struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"inputSchema"`
}

// UpstreamClientStore holds active upstream clients by provider ID.
type UpstreamClientStore struct {
	mu       sync.RWMutex
	clients  map[uint]*UpstreamClient // keyed by provider ID
	prefixes map[string]uint          // tool prefix -> provider ID
}

var GlobalUpstreamClients = &UpstreamClientStore{
	clients:  make(map[uint]*UpstreamClient),
	prefixes: make(map[string]uint),
}

// NewUpstreamClient creates a new upstream client for a provider.
func NewUpstreamClient(provider *model.MCPProvider) *UpstreamClient {
	return &UpstreamClient{
		Provider: provider,
	}
}

// Register adds a client to the global store.
func (s *UpstreamClientStore) Register(client *UpstreamClient) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.clients[client.Provider.ID] = client
	if client.Provider.ToolPrefix != "" {
		s.prefixes[client.Provider.ToolPrefix] = client.Provider.ID
	}
}

// Unregister removes a client from the global store.
func (s *UpstreamClientStore) Unregister(providerID uint) {
	s.mu.Lock()
	defer s.mu.Unlock()
	client, ok := s.clients[providerID]
	if ok {
		delete(s.prefixes, client.Provider.ToolPrefix)
		delete(s.clients, providerID)
	}
}

// GetByPrefix returns the upstream client for a tool prefix.
func (s *UpstreamClientStore) GetByPrefix(prefix string) *UpstreamClient {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.prefixes[prefix]
	if !ok {
		return nil
	}
	return s.clients[id]
}

// GetByProviderID returns the upstream client for a provider ID.
func (s *UpstreamClientStore) GetByProviderID(id uint) *UpstreamClient {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.clients[id]
}

// GetAll returns all registered clients.
func (s *UpstreamClientStore) GetAll() []*UpstreamClient {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*UpstreamClient, 0, len(s.clients))
	for _, c := range s.clients {
		result = append(result, c)
	}
	return result
}

// ResolveProvider resolves a prefixed tool name to the upstream client and the
// original (un-prefixed) tool name.
// e.g. "glm_web_search" -> (glm_client, "web_search")
func (s *UpstreamClientStore) ResolveProvider(prefixedName string) (*UpstreamClient, string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for prefix, providerID := range s.prefixes {
		fullPrefix := prefix + "_"
		if len(prefixedName) > len(fullPrefix) && prefixedName[:len(fullPrefix)] == fullPrefix {
			return s.clients[providerID], prefixedName[len(fullPrefix):], true
		}
	}
	return nil, "", false
}

// Connect establishes a connection to the upstream MCP server and syncs tools.
func (c *UpstreamClient) Connect(ctx context.Context) error {
	if c.Provider.BaseURL == "" {
		return fmt.Errorf("upstream MCP provider %s: base URL is empty", c.Provider.Name)
	}

	// Send initialize request to upstream
	_, err := c.sendInitialize(ctx)
	if err != nil {
		return fmt.Errorf("upstream MCP provider %s: initialize failed: %w", c.Provider.Name, err)
	}

	logger.SysLog(fmt.Sprintf("MCP upstream connected: %s (%s)", c.Provider.Name, c.Provider.BaseURL))

	c.mu.Lock()
	c.connected = true
	c.mu.Unlock()

	// Sync tools immediately after connecting
	if c.Provider.AutoSync {
		if syncErr := c.SyncTools(ctx); syncErr != nil {
			logger.SysError(fmt.Sprintf("MCP upstream %s: initial tool sync failed: %v", c.Provider.Name, syncErr))
		}
	}

	return nil
}

// IsConnected returns whether the client is connected.
func (c *UpstreamClient) IsConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.connected
}

// GetTools returns the cached tool list.
func (c *UpstreamClient) GetTools() []UpstreamTool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	result := make([]UpstreamTool, len(c.tools))
	copy(result, c.tools)
	return result
}

// CallTool invokes a tool on the upstream MCP server.
func (c *UpstreamClient) CallTool(ctx context.Context, toolName string, arguments json.RawMessage) (*JSONRPCResponse, error) {
	params := map[string]interface{}{
		"name": toolName,
	}
	if arguments != nil {
		params["arguments"] = json.RawMessage(arguments)
	}

	paramsJSON, err := json.Marshal(params)
	if err != nil {
		return nil, fmt.Errorf("marshal call params: %w", err)
	}

	req := &JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "tools/call",
		Params:  paramsJSON,
	}

	resp, err := c.sendRequest(ctx, req)
	if err != nil {
		c.mu.Lock()
		c.connected = false
		c.mu.Unlock()
		return nil, fmt.Errorf("upstream call failed: %w", err)
	}

	return resp, nil
}

// sendInitialize sends an initialize request to the upstream server.
func (c *UpstreamClient) sendInitialize(ctx context.Context) (*JSONRPCResponse, error) {
	params := map[string]interface{}{
		"protocolVersion": ProtocolVersion,
		"capabilities":    map[string]interface{}{},
		"clientInfo": map[string]interface{}{
			"name":    "AIHub MCP Proxy",
			"version": "1.0.0",
		},
	}
	paramsJSON, _ := json.Marshal(params)

	req := &JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "initialize",
		Params:  paramsJSON,
	}

	return c.sendRequest(ctx, req)
}

// sendRequest sends a JSON-RPC request to the upstream server using the
// configured transport.
func (c *UpstreamClient) sendRequest(ctx context.Context, req *JSONRPCRequest) (*JSONRPCResponse, error) {
	timeout := 30 * time.Second
	if deadline, ok := ctx.Deadline(); ok {
		if d := time.Until(deadline); d < timeout {
			timeout = d
		}
	}

	sendCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	switch c.Provider.Transport {
	case "sse":
		return sendSSE(sendCtx, c.Provider, req)
	default:
		// Default to streamable-http
		return sendStreamableHTTP(sendCtx, c.Provider, req)
	}
}
