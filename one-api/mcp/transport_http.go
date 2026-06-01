package mcp

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/logger"
)

// HandleStreamableHTTP handles MCP requests via Streamable HTTP transport.
// The client sends a single POST with a JSON-RPC request and receives a JSON-RPC response.
func HandleStreamableHTTP(c *gin.Context) {
	// Extract auth info set by TokenAuth middleware
	tokenID := c.GetInt(ctxkey.TokenId)
	userID := c.GetInt(ctxkey.Id)

	// Get or create session from header
	sessionID := c.GetHeader("Mcp-Session-Id")
	var session *MCPSession
	if sessionID != "" {
		session = GlobalSessions.Get(sessionID)
	}
	if session == nil {
		session = NewSession(tokenID, userID)
		GlobalSessions.Put(session)
	}

	// Parse the JSON-RPC request
	req, err := ParseRequest(c.Request.Body)
	if err != nil {
		resp := &JSONRPCResponse{
			JSONRPC: "2.0",
			Error:   ErrParseError,
		}
		c.JSON(http.StatusOK, resp)
		return
	}

	// Handle the message
	resp := HandleMessage(c.Request.Context(), req, session)

	// For notifications (no ID), return 202 Accepted with no body
	if IsNotification(req) {
		c.Status(http.StatusAccepted)
		return
	}

	// Set session ID header
	c.Header("Mcp-Session-Id", session.ID)
	c.Header("Content-Type", "application/json")

	// Write response
	data, err := json.Marshal(resp)
	if err != nil {
		logger.Error(c.Request.Context(), "failed to marshal MCP response: "+err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"jsonrpc": "2.0",
			"id":      req.ID,
			"error":   ErrInternal,
		})
		return
	}
	c.Data(http.StatusOK, "application/json", data)
}
