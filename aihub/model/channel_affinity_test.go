package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestChannelSupportsModel(t *testing.T) {
	channel := &Channel{
		Models: "gpt-4o,gpt-4o-mini,gpt-3.5-turbo",
	}

	tests := []struct {
		name      string
		modelName string
		expected  bool
	}{
		{
			name:      "supported model",
			modelName: "gpt-4o",
			expected:  true,
		},
		{
			name:      "another supported model",
			modelName: "gpt-4o-mini",
			expected:  true,
		},
		{
			name:      "unsupported model",
			modelName: "claude-3-opus",
			expected:  false,
		},
		{
			name:      "empty model name returns true",
			modelName: "",
			expected:  true,
		},
		{
			name:      "partial name should not match",
			modelName: "gpt-4",
			expected:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ChannelSupportsModel(channel, tt.modelName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestChannelSupportsModel_SingleModel(t *testing.T) {
	channel := &Channel{
		Models: "gpt-4o",
	}
	assert.True(t, ChannelSupportsModel(channel, "gpt-4o"))
	assert.False(t, ChannelSupportsModel(channel, "gpt-3.5-turbo"))
}
