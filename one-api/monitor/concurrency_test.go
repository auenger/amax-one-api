package monitor

import (
	"testing"
)

func TestParseConcurrencyKey(t *testing.T) {
	tests := []struct {
		name      string
		key       string
		wantId    int
		wantModel string
		wantNil   bool
	}{
		{
			name:      "valid key",
			key:       "channel:concurrency:1:gpt-4o",
			wantId:    1,
			wantModel: "gpt-4o",
		},
		{
			name:      "valid key with complex model name",
			key:       "channel:concurrency:42:claude-3-5-sonnet-20241022",
			wantId:    42,
			wantModel: "claude-3-5-sonnet-20241022",
		},
		{
			name:    "prefix only",
			key:     "channel:concurrency:",
			wantNil: true,
		},
		{
			name:    "no model part",
			key:     "channel:concurrency:1",
			wantNil: true,
		},
		{
			name:    "invalid channel id",
			key:     "channel:concurrency:abc:gpt-4o",
			wantNil: true,
		},
		{
			name:    "empty key",
			key:     "",
			wantNil: true,
		},
		{
			name:    "unrelated key",
			key:     "channel:metrics:latency:1",
			wantNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseConcurrencyKey(tt.key)
			if tt.wantNil {
				if got != nil {
					t.Errorf("parseConcurrencyKey(%q) = %+v, want nil", tt.key, got)
				}
				return
			}
			if got == nil {
				t.Fatalf("parseConcurrencyKey(%q) = nil, want non-nil", tt.key)
			}
			if got.ChannelID != tt.wantId {
				t.Errorf("ChannelID = %d, want %d", got.ChannelID, tt.wantId)
			}
			if got.Model != tt.wantModel {
				t.Errorf("Model = %q, want %q", got.Model, tt.wantModel)
			}
		})
	}
}

func TestIncrDecrConcurrency_NoRedis(t *testing.T) {
	// These should be no-ops when Redis is disabled
	IncrConcurrency(1, "gpt-4o")
	DecrConcurrency(1, "gpt-4o")
	// Should not panic
}

func TestGetConcurrency_NoRedis(t *testing.T) {
	val := GetConcurrency(1, "gpt-4o")
	if val != 0 {
		t.Errorf("GetConcurrency without Redis = %d, want 0", val)
	}
}

func TestGetAllConcurrency_NoRedis(t *testing.T) {
	entries := GetAllConcurrency()
	if entries != nil {
		t.Errorf("GetAllConcurrency without Redis = %+v, want nil", entries)
	}
}
