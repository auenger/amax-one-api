package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yzw/aihub/common/logger"
)

// JSON-RPC 2.0 types

type JSONRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type JSONRPCResponse struct {
	JSONRPC   string        `json:"jsonrpc"`
	ID        json.RawMessage `json:"id"`
	Result    interface{}   `json:"result,omitempty"`
	Error     *JSONRPCError `json:"error,omitempty"`
	SessionID string        `json:"-"` // set by transport, not serialized
}

type JSONRPCError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Standard JSON-RPC error codes
var (
	ErrParseError     = &JSONRPCError{Code: -32700, Message: "Parse error"}
	ErrInvalidRequest = &JSONRPCError{Code: -32600, Message: "Invalid Request"}
	ErrMethodNotFound = &JSONRPCError{Code: -32601, Message: "Method not found"}
	ErrInvalidParams  = &JSONRPCError{Code: -32602, Message: "Invalid params"}
	ErrInternal       = &JSONRPCError{Code: -32603, Message: "Internal error"}
)

// MCPSession represents an active MCP session.
type MCPSession struct {
	ID        string
	TokenID   int
	UserID    int
	sseWriter http.ResponseWriter
	sseFlush  http.Flusher
	sseMu     sync.Mutex
	sseDone   chan struct{}
}

// SessionStore holds active MCP sessions.
type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*MCPSession
}

var GlobalSessions = &SessionStore{
	sessions: make(map[string]*MCPSession),
}

func (s *SessionStore) Put(session *MCPSession) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[session.ID] = session
}

func (s *SessionStore) Get(id string) *MCPSession {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.sessions[id]
}

func (s *SessionStore) Delete(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, id)
}

// NewSession creates a new MCP session.
func NewSession(tokenID, userID int) *MCPSession {
	return &MCPSession{
		ID:      uuid.New().String(),
		TokenID: tokenID,
		UserID:  userID,
		sseDone: make(chan struct{}),
	}
}

// HandleMessage processes a JSON-RPC message and returns a response.
func HandleMessage(ctx context.Context, req *JSONRPCRequest, session *MCPSession) *JSONRPCResponse {
	// Validate jsonrpc version
	if req.JSONRPC != "2.0" {
		return &JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Error:   ErrInvalidRequest,
		}
	}

	switch req.Method {
	case "initialize":
		return handleInitialize(ctx, req, session)
	case "ping":
		return handlePing(ctx, req, session)
	case "notifications/initialized":
		// Client notification, no response needed but we ack
		return &JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result:  gin.H{},
		}
	case "tools/list":
		return handleToolsList(ctx, req, session)
	case "tools/call":
		return handleToolsCall(ctx, req, session)
	default:
		return &JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Error:   ErrMethodNotFound,
		}
	}
}

// ParseRequest reads and parses a JSON-RPC request from the request body.
func ParseRequest(body io.Reader) (*JSONRPCRequest, error) {
	var req JSONRPCRequest
	decoder := json.NewDecoder(body)
	if err := decoder.Decode(&req); err != nil {
		return nil, fmt.Errorf("parse error: %w", err)
	}
	return &req, nil
}

// WriteResponse writes a JSON-RPC response.
func WriteResponse(w http.ResponseWriter, resp *JSONRPCResponse) error {
	w.Header().Set("Content-Type", "application/json")
	data, err := json.Marshal(resp)
	if err != nil {
		logger.SysError("failed to marshal MCP response: " + err.Error())
		return err
	}
	_, err = w.Write(data)
	return err
}

// ParseNotificationOrBatch checks if the body contains a notification (no ID)
// or a batch request. Returns true if the message should be handled.
func ParseNotificationOrBatch(body io.Reader) ([]*JSONRPCRequest, error) {
	// Try parsing as array first (batch)
	var raw json.RawMessage
	bodyBytes, err := io.ReadAll(body)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(bodyBytes, &raw); err != nil {
		return nil, err
	}

	raw = bytes.TrimSpace(raw)
	if len(raw) == 0 {
		return nil, fmt.Errorf("empty request body")
	}

	if raw[0] == '[' {
		// Batch request
		var batch []*JSONRPCRequest
		if err := json.Unmarshal(raw, &batch); err != nil {
			return nil, err
		}
		return batch, nil
	}

	// Single request
	var req JSONRPCRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		return nil, err
	}
	return []*JSONRPCRequest{&req}, nil
}

// IsNotification returns true if the request is a notification (no ID).
func IsNotification(req *JSONRPCRequest) bool {
	return len(req.ID) == 0 || string(req.ID) == "null"
}
