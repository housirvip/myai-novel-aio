package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseCORSOrigins(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want []string
	}{
		{"empty", "", nil},
		{"single", "http://localhost:3000", []string{"http://localhost:3000"}},
		{"comma_separated", "http://a.com,http://b.com", []string{"http://a.com", "http://b.com"}},
		{"whitespace_trimmed", " http://a.com , http://b.com ", []string{"http://a.com", "http://b.com"}},
		{"empty_entries_skipped", "http://a.com,,http://b.com", []string{"http://a.com", "http://b.com"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseCORSOrigins(tt.in)
			if tt.want == nil {
				require.Nil(t, got)
			} else {
				require.Equal(t, tt.want, got)
			}
		})
	}
}
