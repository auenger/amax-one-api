package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
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

func TestAffinityMiddleware_NoConversationId(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"gpt-4o"}`))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	called := false
	handler := Affinity()
	handler(c)
	// Without Next() being called (no other handlers), we check the flow separately
	// In a real middleware chain, c.Next() would be called inside Affinity()
	// Here we just verify the middleware didn't set any context values
	_, exists := c.Get("conversation_id")
	assert.False(t, exists, "conversation_id should not be set when not provided")
	_ = called
}

func TestGetAffinityTTL(t *testing.T) {
	ttl := getAffinityTTL()
	assert.Equal(t, 3600, int(ttl.Seconds()), "default TTL should be 1 hour (3600 seconds)")
}

func TestAffinityRedisKeyFormat(t *testing.T) {
	assert.Equal(t, "affinity:", AffinityRedisKeyPrefix)
	assert.Equal(t, "X-Conversation-Id", AffinityHeader)
	assert.Equal(t, "conversation_id", AffinityQueryParam)
}
