package llm

import (
	"testing"

	"github.com/stretchr/testify/require"

	"myai-novel-go/internal/config"
)

func TestResolveModel(t *testing.T) {
	cfg := &config.Config{
		LLMLowModel:  "low-model",
		LLMMidModel:  "mid-model",
		LLMHighModel: "high-model",
	}

	tests := []struct {
		name     string
		explicit string
		tier     ModelTier
		want     string
	}{
		{"explicit_wins", "explicit-model", TierLow, "explicit-model"},
		{"tier_low", "", TierLow, "low-model"},
		{"tier_mid", "", TierMid, "mid-model"},
		{"tier_high", "", TierHigh, "high-model"},
		{"unknown_tier", "", "unknown", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, ResolveModel(cfg, tt.explicit, tt.tier))
		})
	}
}

func TestResolveModelFromConfig(t *testing.T) {
	rc := &ResolvedLLMConfig{
		LowModel:  "rc-low",
		MidModel:  "rc-mid",
		HighModel: "rc-high",
	}

	tests := []struct {
		name     string
		rc       *ResolvedLLMConfig
		explicit string
		tier     ModelTier
		want     string
	}{
		{"explicit_wins", rc, "exp", TierLow, "exp"},
		{"nil_config", nil, "", TierLow, ""},
		{"low", rc, "", TierLow, "rc-low"},
		{"mid", rc, "", TierMid, "rc-mid"},
		{"high", rc, "", TierHigh, "rc-high"},
		{"unknown_tier", rc, "", "x", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, ResolveModelFromConfig(tt.rc, tt.explicit, tt.tier))
		})
	}
}

func TestSanitized(t *testing.T) {
	t.Run("nil_returns_nil", func(t *testing.T) {
		var rc *ResolvedLLMConfig
		require.Nil(t, rc.Sanitized())
	})

	t.Run("strips_api_keys", func(t *testing.T) {
		rc := &ResolvedLLMConfig{
			Provider:        "openai",
			Model:           "gpt-4",
			OpenAIAPIKey:    "secret-key",
			AnthropicAPIKey: "secret-ant",
			CustomLLMAPIKey: "secret-cust",
		}
		s := rc.Sanitized()
		require.Equal(t, "openai", s.Provider)
		require.Equal(t, "gpt-4", s.Model)
		require.Empty(t, s.OpenAIAPIKey)
		require.Empty(t, s.AnthropicAPIKey)
		require.Empty(t, s.CustomLLMAPIKey)
	})
}
