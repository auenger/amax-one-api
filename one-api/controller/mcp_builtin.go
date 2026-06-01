package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/ctxkey"
	mcpPkg "github.com/songquanpeng/one-api/mcp"
	"github.com/songquanpeng/one-api/middleware"
	"github.com/songquanpeng/one-api/model"
	relayController "github.com/songquanpeng/one-api/relay/controller"
)

func init() {
	mcpPkg.VisionRelayFunc = visionRelay
}

// visionRelay makes an internal relay call to process a vision request through
// a specific channel using a mock gin context.
func visionRelay(ctx context.Context, channelID int, modelName string, systemPrompt string, maxTokens int, image string, prompt string) (string, error) {
	channel, err := model.GetChannelById(channelID, true)
	if err != nil {
		return "", fmt.Errorf("channel %d not found: %w", channelID, err)
	}

	// Build the OpenAI-format multimodal request body
	messages := []map[string]interface{}{}
	if systemPrompt != "" {
		messages = append(messages, map[string]interface{}{
			"role":    "system",
			"content": systemPrompt,
		})
	}
	messages = append(messages, map[string]interface{}{
		"role": "user",
		"content": []map[string]interface{}{
			{
				"type":      "image_url",
				"image_url": map[string]interface{}{"url": image},
			},
			{
				"type": "text",
				"text": prompt,
			},
		},
	})

	requestBody := map[string]interface{}{
		"model":    modelName,
		"messages": messages,
		"stream":   false,
	}
	if maxTokens > 0 {
		requestBody["max_tokens"] = maxTokens
	}

	bodyJSON, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	// Create a mock gin context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/v1/chat/completions", bytes.NewReader(bodyJSON))
	c.Request.Header.Set("Content-Type", "application/json")

	// Set up channel context (mimics distributor middleware)
	middleware.SetupContextForSelectedChannel(c, channel, modelName)
	c.Set(ctxkey.RequestModel, modelName)

	// Set a system token context for billing
	c.Set(ctxkey.TokenId, 0)
	c.Set(ctxkey.TokenName, "mcp-builtin")
	c.Set(ctxkey.Id, 0)
	c.Set(ctxkey.Group, channel.Group)

	// Call the relay helper
	relayErr := relayController.RelayTextHelper(c)
	if relayErr != nil {
		return "", fmt.Errorf("relay error [%d]: %s", relayErr.StatusCode, relayErr.Error.Message)
	}

	// Parse the response from the recorder
	respBody := w.Body.Bytes()
	if len(respBody) == 0 {
		return "", fmt.Errorf("empty response from relay")
	}

	var chatResp struct {
		Choices []struct {
			Message struct {
				Content interface{} `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return "", fmt.Errorf("parse response: %w (%s)", err, string(respBody[:minLen(len(respBody), 200)]))
	}

	if chatResp.Error != nil {
		return "", fmt.Errorf("API error: %s", chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("empty response from model")
	}

	return extractContent(chatResp.Choices[0].Message.Content), nil
}

func extractContent(content interface{}) string {
	switch c := content.(type) {
	case string:
		return c
	case []interface{}:
		var text string
		for _, item := range c {
			if m, ok := item.(map[string]interface{}); ok {
				if t, ok := m["text"].(string); ok {
					text += t
				}
			}
		}
		return text
	default:
		return fmt.Sprintf("%v", c)
	}
}

func minLen(a, b int) int {
	if a < b {
		return a
	}
	return b
}
