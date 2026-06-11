package workflows

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestStripFence(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"no_fence", `{"key":"val"}`, `{"key":"val"}`},
		{"json_fence", "```json\n{\"key\":\"val\"}\n```", "\n{\"key\":\"val\"}\n"},
		{"plain_fence", "```\ncontent\n```", "\ncontent\n"},
		{"only_leading", "```json\ncontent", "\ncontent"},
		{"only_trailing", "content\n```", "content\n"},
		{"empty", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, stripFence(tt.in))
		})
	}
}
