package mcp

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/logger"
)

// HandleSSEConnection handles GET /mcp/v1/sse — establishes a long-lived SSE connection.
func HandleSSEConnection(c *gin.Context) {
	// Extract auth info set by TokenAuth middleware
	tokenID := c.GetInt(ctxkey.TokenId)
	userID := c.GetInt(ctxkey.Id)

	// Create a new session for this SSE connection
	session := NewSession(tokenID, userID)
	GlobalSessions.Put(session)

	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Header("Mcp-Session-Id", session.ID)

	// Send the endpoint event so the client knows where to POST messages
	endpointEvt := fmt.Sprintf("event: endpoint\ndata: /mcp/v1/sse?sessionId=%s\n\n", session.ID)
	if _, err := fmt.Fprint(c.Writer, endpointEvt); err != nil {
		logger.Error(c.Request.Context(), "SSE write endpoint event failed: "+err.Error())
		return
	}
	c.Writer.(http.Flusher).Flush()

	// Store the writer in the session for later use
	session.sseMu.Lock()
	session.sseWriter = c.Writer
	session.sseFlush = c.Writer.(http.Flusher)
	session.sseMu.Unlock()

	// Keep the connection alive with periodic ping events
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Wait for client disconnect or context cancellation
	done := c.Request.Context().Done()
	for {
		select {
		case <-ticker.C:
			session.sseMu.Lock()
			if session.sseWriter != nil {
				fmt.Fprint(session.sseWriter, "event: ping\ndata: {}\n\n")
				session.sseFlush.Flush()
			}
			session.sseMu.Unlock()
		case <-done:
			GlobalSessions.Delete(session.ID)
			close(session.sseDone)
			return
		}
	}
}

// HandleSSEMessage handles POST /mcp/v1/sse — receives a JSON-RPC message via SSE transport.
func HandleSSEMessage(c *gin.Context) {
	// Extract auth info set by TokenAuth middleware
	tokenID := c.GetInt(ctxkey.TokenId)
	userID := c.GetInt(ctxkey.Id)

	// Look up the session
	sessionID := c.Query("sessionId")
	if sessionID == "" {
		// Also check header
		sessionID = c.GetHeader("Mcp-Session-Id")
	}
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"jsonrpc": "2.0",
			"error":   ErrInvalidRequest,
		})
		return
	}

	session := GlobalSessions.Get(sessionID)
	if session == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"jsonrpc": "2.0",
			"error": &JSONRPCError{
				Code:    -32000,
				Message: "session not found",
			},
		})
		return
	}

	// Verify the session belongs to the same user
	if session.TokenID != tokenID || session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"jsonrpc": "2.0",
			"error": &JSONRPCError{
				Code:    -32000,
				Message: "session ownership mismatch",
			},
		})
		return
	}

	// Parse the JSON-RPC request
	req, err := ParseRequest(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusOK, &JSONRPCResponse{
			JSONRPC: "2.0",
			Error:   ErrParseError,
		})
		return
	}

	// Handle the message
	resp := HandleMessage(c.Request.Context(), req, session)

	// For notifications, return 202 with no body
	if IsNotification(req) {
		c.Status(http.StatusAccepted)
		return
	}

	// Send response back via SSE event stream
	if session.sseWriter != nil {
		data, err := json.Marshal(resp)
		if err != nil {
			logger.Error(c.Request.Context(), "failed to marshal MCP SSE response: "+err.Error())
			c.Status(http.StatusInternalServerError)
			return
		}
		session.sseMu.Lock()
		fmt.Fprintf(session.sseWriter, "event: message\ndata: %s\n\n", string(data))
		session.sseFlush.Flush()
		session.sseMu.Unlock()
	}

	// Also return 202 Accepted to the POST
	c.Status(http.StatusAccepted)
}

// readAll is a helper to read the full request body.
func readAll(r io.Reader) ([]byte, error) {
	return io.ReadAll(r)
}
