package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/yzw/aihub/common/ctxkey"
	"github.com/stretchr/testify/assert"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestExtractConversationId(t *testing.T) {
	tests := []struct {
		name     string
		setupReq func() *http.Request
		expected string
	}{
		{
			name: "from X-Conversation-Id header",
			setupReq: func() *http.Request {
				req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
				req.Header.Set("X-Conversation-Id", "conv-123")
				return req
			},
			expected: "conv-123",
		},
		{
			name: "from conversation_id query param",
			setupReq: func() *http.Request {
				req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions?conversation_id=conv-456", nil)
				return req
			},
			expected: "conv-456",
		},
		{
			name: "header takes priority over query param",
			setupReq: func() *http.Request {
				req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions?conversation_id=conv-query", nil)
				req.Header.Set("X-Conversation-Id", "conv-header")
				return req
			},
			expected: "conv-header",
		},
		{
			name: "from request body JSON",
			setupReq: func() *http.Request {
				body := `{"model":"gpt-4o","conversation_id":"conv-body-789"}`
				req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(body))
				req.Header.Set("Content-Type", "application/json")
				return req
			},
			expected: "conv-body-789",
		},
		{
			name: "header takes priority over body",
			setupReq: func() *http.Request {
				body := `{"model":"gpt-4o","conversation_id":"conv-body"}`
				req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(body))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("X-Conversation-Id", "conv-header")
				return req
			},
			expected: "conv-header",
		},
		{
			name: "no conversation_id returns empty",
			setupReq: func() *http.Request {
				body := `{"model":"gpt-4o","messages":[{"role":"user","content":"hello"}]}`
				req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(body))
				req.Header.Set("Content-Type", "application/json")
				return req
			},
			expected: "",
		},
		{
			name: "empty header and query returns empty",
			setupReq: func() *http.Request {
				req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
				return req
			},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = tt.setupReq()

			result := ExtractConversationId(c)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestExtractConversationId_EmptyBody(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(""))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	result := ExtractConversationId(c)
	assert.Equal(t, "", result)
}

func TestExtractConversationId_InvalidJSON(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	result := ExtractConversationId(c)
	assert.Equal(t, "", result)
}

// --- Session Fallback Tests ---

func TestExtractSessionFallbackId(t *testing.T) {
	tests := []struct {
		name     string
		setupReq func() *http.Request
		expected string
	}{
		{
			name: "from X-Claude-Code-Session-Id header",
			setupReq: func() *http.Request {
				req := httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
				req.Header.Set("X-Claude-Code-Session-Id", "f8fad9d3-07ea-4a0c-9a38-cf51743ff63c")
				return req
			},
			expected: "f8fad9d3-07ea-4a0c-9a38-cf51743ff63c",
		},
		{
			name: "no header returns empty",
			setupReq: func() *http.Request {
				req := httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
				return req
			},
			expected: "",
		},
		{
			name: "empty header returns empty",
			setupReq: func() *http.Request {
				req := httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
				req.Header.Set("X-Claude-Code-Session-Id", "")
				return req
			},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = tt.setupReq()

			result := extractSessionFallbackId(c)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestAffinityFallback_PriorityConversationOverSession(t *testing.T) {
	// When both X-Conversation-Id and X-Claude-Code-Session-Id are present,
	// conversation_id extraction should take priority.
	req := httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
	req.Header.Set("X-Conversation-Id", "conv-explicit")
	req.Header.Set("X-Claude-Code-Session-Id", "session-123")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	convId := ExtractConversationId(c)
	sessionId := extractSessionFallbackId(c)

	assert.Equal(t, "conv-explicit", convId, "conversation_id should be extracted from header")
	assert.Equal(t, "session-123", sessionId, "session_id should also be extractable")
}

func TestAffinityFallback_OnlySessionId(t *testing.T) {
	// When only X-Claude-Code-Session-Id is present and no conversation_id,
	// fallback should be used.
	req := httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
	req.Header.Set("X-Claude-Code-Session-Id", "f8fad9d3-07ea-4a0c-9a38-cf51743ff63c")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	convId := ExtractConversationId(c)
	sessionId := extractSessionFallbackId(c)

	assert.Equal(t, "", convId, "conversation_id should be empty")
	assert.Equal(t, "f8fad9d3-07ea-4a0c-9a38-cf51743ff63c", sessionId, "session_id should be extracted")
}

func TestGetAffinityTTL(t *testing.T) {
	ttl := getAffinityTTL()
	assert.Equal(t, 3600, int(ttl.Seconds()), "default TTL should be 1 hour (3600 seconds)")
}

func TestGetAffinityFallbackTTL(t *testing.T) {
	ttl := getAffinityFallbackTTL()
	assert.Equal(t, 1800, int(ttl.Seconds()), "default fallback TTL should be 30 min (1800 seconds)")
}

func TestAffinityRedisKeyFormat(t *testing.T) {
	assert.Equal(t, "affinity:", AffinityRedisKeyPrefix)
	assert.Equal(t, "affinity:session:", AffinitySessionKeyPrefix)
	assert.Equal(t, "X-Conversation-Id", AffinityHeader)
	assert.Equal(t, "X-Claude-Code-Session-Id", SessionFallbackHeader)
	assert.Equal(t, "conversation_id", AffinityQueryParam)
}

func TestSessionFallbackCtxKey(t *testing.T) {
	assert.Equal(t, "session_fallback_id", ctxkey.SessionFallbackId)
}
