package service

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/yzw/aihub/common/random"
	relaymodel "github.com/yzw/aihub/relay/model"
)

// ClaudeMessagesRequest represents the Claude Messages API request format.
// https://docs.anthropic.com/en/api/messages
type ClaudeMessagesRequest struct {
	Model         string          `json:"model"`
	Messages      []ClaudeMessage `json:"messages"`
	MaxTokens     int             `json:"max_tokens"`
	System        any             `json:"system,omitempty"` // string or []ClaudeSystemContent
	Temperature   *float64        `json:"temperature,omitempty"`
	TopP          *float64        `json:"top_p,omitempty"`
	TopK          *int            `json:"top_k,omitempty"`
	Stream        bool            `json:"stream,omitempty"`
	StopSequences []string        `json:"stop_sequences,omitempty"`
	Tools         []ClaudeTool    `json:"tools,omitempty"`
	ToolChoice    any             `json:"tool_choice,omitempty"`
	Metadata      *ClaudeMetadata `json:"metadata,omitempty"`
}

type ClaudeMetadata struct {
	UserId string `json:"user_id,omitempty"`
}

type ClaudeSystemContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type ClaudeMessage struct {
	Role    string `json:"role"`
	Content any    `json:"content"` // string or []ClaudeContentBlock
}

type ClaudeContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
	// for tool_use
	Id    string `json:"id,omitempty"`
	Name  string `json:"name,omitempty"`
	Input any    `json:"input,omitempty"`
	// for tool_result
	ToolUseId string `json:"tool_use_id,omitempty"`
	Content   any    `json:"content,omitempty"` // string or []ClaudeContentBlock
	// for image
	Source *ClaudeImageSource `json:"source,omitempty"`
	// for thinking
	Thinking string `json:"thinking,omitempty"`
}

type ClaudeImageSource struct {
	Type      string `json:"type"`
	MediaType string `json:"media_type"`
	Data      string `json:"data"`
}

type ClaudeTool struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	InputSchema any    `json:"input_schema"`
}

// ClaudeMessagesResponse represents the Claude Messages API response format.
type ClaudeMessagesResponse struct {
	Id           string               `json:"id"`
	Type         string               `json:"type"`
	Role         string               `json:"role"`
	Content      []ClaudeContentBlock `json:"content"`
	Model        string               `json:"model"`
	StopReason   *string              `json:"stop_reason"`
	StopSequence *string              `json:"stop_sequence,omitempty"`
	Usage        ClaudeUsage          `json:"usage"`
}

type ClaudeUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type ClaudeStreamEvent struct {
	Type         string                  `json:"type"`
	Message      *ClaudeMessagesResponse `json:"message,omitempty"`
	Index        int                     `json:"index,omitempty"`
	ContentBlock *ClaudeContentBlock     `json:"content_block,omitempty"`
	Delta        *ClaudeDelta            `json:"delta,omitempty"`
	Usage        *ClaudeUsage            `json:"usage,omitempty"`
}

type ClaudeDelta struct {
	Type         string  `json:"type,omitempty"`
	Text         string  `json:"text,omitempty"`
	PartialJson  string  `json:"partial_json,omitempty"`
	StopReason   *string `json:"stop_reason,omitempty"`
	StopSequence *string `json:"stop_sequence,omitempty"`
}

type ClaudeError struct {
	Type  string            `json:"type"`
	Error ClaudeErrorDetail `json:"error"`
}

type ClaudeErrorDetail struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// ClaudeToOpenAIRequest converts a Claude Messages API request to an OpenAI Chat Completions request.
func ClaudeToOpenAIRequest(claudeReq *ClaudeMessagesRequest) *relaymodel.GeneralOpenAIRequest {
	openaiReq := &relaymodel.GeneralOpenAIRequest{
		Model:       claudeReq.Model,
		MaxTokens:   claudeReq.MaxTokens,
		Temperature: claudeReq.Temperature,
		TopP:        claudeReq.TopP,
		Stream:      claudeReq.Stream,
		User:        "",
	}
	if claudeReq.TopK != nil {
		openaiReq.TopK = *claudeReq.TopK
	}
	if len(claudeReq.StopSequences) > 0 {
		openaiReq.Stop = claudeReq.StopSequences
	}

	// convert system prompt
	systemPrompt := extractSystemPrompt(claudeReq.System)
	if systemPrompt != "" {
		openaiReq.Messages = append(openaiReq.Messages, relaymodel.Message{
			Role:    "system",
			Content: systemPrompt,
		})
	}

	// convert messages
	for _, msg := range claudeReq.Messages {
		openaiMessages := convertClaudeMessage(msg)
		openaiReq.Messages = append(openaiReq.Messages, openaiMessages...)
	}

	// convert tools
	if len(claudeReq.Tools) > 0 {
		openaiTools := make([]relaymodel.Tool, 0, len(claudeReq.Tools))
		for _, t := range claudeReq.Tools {
			openaiTools = append(openaiTools, relaymodel.Tool{
				Type: "function",
				Function: relaymodel.Function{
					Name:        t.Name,
					Description: t.Description,
					Parameters:  t.InputSchema,
				},
			})
		}
		openaiReq.Tools = openaiTools
		// convert tool_choice
		if claudeReq.ToolChoice != nil {
			openaiReq.ToolChoice = convertClaudeToolChoice(claudeReq.ToolChoice)
		}
	}

	return openaiReq
}

func extractSystemPrompt(system any) string {
	if system == nil {
		return ""
	}
	switch v := system.(type) {
	case string:
		return v
	case []any:
		var parts []string
		for _, item := range v {
			if block, ok := item.(map[string]any); ok {
				if t, ok := block["type"].(string); ok && t == "text" {
					if text, ok := block["text"].(string); ok {
						parts = append(parts, text)
					}
				}
			}
		}
		return strings.Join(parts, "\n")
	}
	return ""
}

func convertClaudeMessage(msg ClaudeMessage) []relaymodel.Message {
	var messages []relaymodel.Message

	// check if content is a simple string
	if str, ok := msg.Content.(string); ok {
		if msg.Role == "tool" {
			// tool result message
			return []relaymodel.Message{{
				Role:       "tool",
				Content:    str,
				ToolCallId: "", // Claude doesn't have tool_call_id in the same way
			}}
		}
		return []relaymodel.Message{{
			Role:    msg.Role,
			Content: str,
		}}
	}

	// content is array of blocks
	blocks, ok := msg.Content.([]any)
	if !ok {
		return messages
	}

	var textParts []string
	var toolCalls []relaymodel.Tool
	var toolResults []relaymodel.Message

	for _, block := range blocks {
		blockMap, ok := block.(map[string]any)
		if !ok {
			continue
		}
		blockType, _ := blockMap["type"].(string)

		switch blockType {
		case "text":
			if text, ok := blockMap["text"].(string); ok {
				textParts = append(textParts, text)
			}
		case "tool_use":
			id, _ := blockMap["id"].(string)
			name, _ := blockMap["name"].(string)
			inputJSON, _ := json.Marshal(blockMap["input"])
			toolCalls = append(toolCalls, relaymodel.Tool{
				Id:   id,
				Type: "function",
				Function: relaymodel.Function{
					Name:      name,
					Arguments: string(inputJSON),
				},
			})
		case "tool_result":
			toolUseId, _ := blockMap["tool_use_id"].(string)
			var content string
			if c, ok := blockMap["content"].(string); ok {
				content = c
			} else if cArr, ok := blockMap["content"].([]any); ok {
				for _, item := range cArr {
					if itemMap, ok := item.(map[string]any); ok {
						if itemMap["type"] == "text" {
							if t, ok := itemMap["text"].(string); ok {
								content += t
							}
						}
					}
				}
			}
			toolResults = append(toolResults, relaymodel.Message{
				Role:       "tool",
				Content:    content,
				ToolCallId: toolUseId,
			})
		case "thinking":
			// thinking blocks are ignored in OpenAI format conversion
			if text, ok := blockMap["thinking"].(string); ok {
				textParts = append(textParts, text)
			}
		}
	}

	// construct message
	if len(toolResults) > 0 {
		return toolResults
	}

	msgContent := strings.Join(textParts, "")
	role := msg.Role
	if role == "tool" {
		role = "tool"
	}

	message := relaymodel.Message{
		Role:    role,
		Content: msgContent,
	}
	if len(toolCalls) > 0 {
		message.ToolCalls = toolCalls
		// if there are tool_calls, the content should be nil or empty
		// OpenAI expects assistant messages with tool_calls
		message.Role = "assistant"
	}
	messages = append(messages, message)

	return messages
}

func convertClaudeToolChoice(toolChoice any) any {
	// Claude tool_choice can be:
	// {"type": "auto"}, {"type": "any"}, {"type": "tool", "name": "..."}
	// OpenAI tool_choice can be:
	// "auto", "none", "required", {"type": "function", "function": {"name": "..."}}
	switch v := toolChoice.(type) {
	case string:
		return v
	case map[string]any:
		t, _ := v["type"].(string)
		switch t {
		case "auto":
			return "auto"
		case "any":
			return "required"
		case "tool":
			name, _ := v["name"].(string)
			return map[string]any{
				"type": "function",
				"function": map[string]any{
					"name": name,
				},
			}
		}
	}
	return "auto"
}

// OpenAIResponseToClaude converts an OpenAI Chat Completions response to Claude Messages format.
func OpenAIResponseToClaude(openaiResp map[string]any, modelName string) *ClaudeMessagesResponse {
	content := make([]ClaudeContentBlock, 0)
	var stopReason string = "end_turn"

	if choices, ok := openaiResp["choices"].([]any); ok && len(choices) > 0 {
		if choice, ok := choices[0].(map[string]any); ok {
			if message, ok := choice["message"].(map[string]any); ok {
				// text content
				if contentStr, ok := message["content"].(string); ok && contentStr != "" {
					content = append(content, ClaudeContentBlock{
						Type: "text",
						Text: contentStr,
					})
				}
				// tool calls
				if toolCalls, ok := message["tool_calls"].([]any); ok {
					for _, tc := range toolCalls {
						if tcMap, ok := tc.(map[string]any); ok {
							input := make(map[string]any)
							if args, ok := tcMap["function"].(map[string]any); ok {
								if arguments, ok := args["arguments"].(string); ok {
									json.Unmarshal([]byte(arguments), &input)
								}
							}
							id, _ := tcMap["id"].(string)
							name := ""
							if fn, ok := tcMap["function"].(map[string]any); ok {
								name, _ = fn["name"].(string)
							}
							content = append(content, ClaudeContentBlock{
								Type:  "tool_use",
								Id:    id,
								Name:  name,
								Input: input,
							})
							stopReason = "tool_use"
						}
					}
				}
			}
			// finish reason
			if finishReason, ok := choice["finish_reason"].(string); ok {
				stopReason = openaiStopReasonToClaude(finishReason)
			}
		}
	}

	usage := ClaudeUsage{InputTokens: 0, OutputTokens: 0}
	if u, ok := openaiResp["usage"].(map[string]any); ok {
		if pt, ok := u["prompt_tokens"].(float64); ok {
			usage.InputTokens = int(pt)
		}
		if ct, ok := u["completion_tokens"].(float64); ok {
			usage.OutputTokens = int(ct)
		}
	}

	id, _ := openaiResp["id"].(string)
	if id == "" {
		id = fmt.Sprintf("msg_%s", random.GetUUID())
	}

	return &ClaudeMessagesResponse{
		Id:         id,
		Type:       "message",
		Role:       "assistant",
		Content:    content,
		Model:      modelName,
		StopReason: &stopReason,
		Usage:      usage,
	}
}

// OpenAIStreamChunkToClaudeEvents converts an OpenAI stream chunk to Claude stream events.
// Returns one or more ClaudeStreamEvent objects.
func OpenAIStreamChunkToClaudeEvents(chunk map[string]any, modelName string, msgId string) []ClaudeStreamEvent {
	events := make([]ClaudeStreamEvent, 0)

	if choices, ok := chunk["choices"].([]any); ok && len(choices) > 0 {
		if choice, ok := choices[0].(map[string]any); ok {
			// content delta
			if delta, ok := choice["delta"].(map[string]any); ok {
				if content, ok := delta["content"].(string); ok && content != "" {
					events = append(events, ClaudeStreamEvent{
						Type: "content_block_delta",
						Delta: &ClaudeDelta{
							Type: "text_delta",
							Text: content,
						},
					})
				}
				// tool calls
				if toolCalls, ok := delta["tool_calls"].([]any); ok {
					for _, tc := range toolCalls {
						if tcMap, ok := tc.(map[string]any); ok {
							if fn, ok := tcMap["function"].(map[string]any); ok {
								if arguments, ok := fn["arguments"].(string); ok && arguments != "" {
									events = append(events, ClaudeStreamEvent{
										Type: "content_block_delta",
										Delta: &ClaudeDelta{
											Type:        "input_json_delta",
											PartialJson: arguments,
										},
									})
								}
							}
						}
					}
				}
			}
			// finish reason
			if finishReason, ok := choice["finish_reason"].(string); ok && finishReason != "" {
				stopReason := openaiStopReasonToClaude(finishReason)
				events = append(events, ClaudeStreamEvent{
					Type: "message_delta",
					Delta: &ClaudeDelta{
						StopReason: &stopReason,
					},
				})
			}
		}
	}

	return events
}

func openaiStopReasonToClaude(reason string) string {
	switch reason {
	case "stop":
		return "end_turn"
	case "length":
		return "max_tokens"
	case "tool_calls":
		return "tool_use"
	case "content_filter":
		return "end_turn"
	default:
		return "end_turn"
	}
}
