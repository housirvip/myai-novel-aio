package user_settings

import (
	"testing"

	"myai-novel-go/internal/config"

	"github.com/stretchr/testify/require"
)

func sp(s string) *string { return &s }
func ip(n int) *int       { return &n }

func TestResolveFieldChain(t *testing.T) {
	tests := []struct {
		name          string
		override      string
		serverDefault string
		fallback      string
		want          string
	}{
		{"override_wins", "over", "server", "fall", "over"},
		{"server_default", "", "server", "fall", "server"},
		{"fallback", "", "", "fall", "fall"},
		{"all_empty", "", "", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, resolveFieldChain(tt.override, tt.serverDefault, tt.fallback))
		})
	}
}

func TestResolveProviderConn(t *testing.T) {
	tests := []struct {
		name                                             string
		overrideKey, overrideBase, envKey, envBase        string
		requireKeyPairing                                bool
		wantKey, wantBase                                string
	}{
		{"no_overrides", "", "", "ek", "eb", true, "ek", "eb"},
		{"override_both", "ok", "ob", "ek", "eb", true, "ok", "ob"},
		{"override_key_only_paired", "ok", "", "ek", "eb", true, "ok", "eb"},
		{"override_base_only_paired", "", "ob", "ek", "eb", true, "", "ob"},
		{"override_key_only_unpaired", "ok", "", "ek", "eb", false, "ok", "eb"},
		{"override_base_only_unpaired", "", "ob", "ek", "eb", false, "ek", "ob"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			k, b := resolveProviderConn(tt.overrideKey, tt.overrideBase, tt.envKey, tt.envBase, tt.requireKeyPairing)
			require.Equal(t, tt.wantKey, k)
			require.Equal(t, tt.wantBase, b)
		})
	}
}

func TestDefaultProviderModel(t *testing.T) {
	cfg := &config.Config{
		OpenAIModel:    "gpt-4",
		AnthropicModel: "claude-3",
		CustomLLMModel: "custom-v1",
		MockLLMModel:   "mock-v1",
	}
	tests := []struct {
		provider string
		want     string
	}{
		{"openai", "gpt-4"},
		{"anthropic", "claude-3"},
		{"custom", "custom-v1"},
		{"mock", "mock-v1"},
		{"unknown", "mock-v1"},
	}
	for _, tt := range tests {
		t.Run(tt.provider, func(t *testing.T) {
			require.Equal(t, tt.want, DefaultProviderModel(cfg, tt.provider))
		})
	}
}

func TestResolveForRequest(t *testing.T) {
	baseCfg := &config.Config{
		LLMProvider:         "openai",
		OpenAIModel:         "gpt-4",
		OpenAIAPIKey:        "env-key",
		OpenAIBaseURL:       "env-base",
		AnthropicAPIKey:     "env-ant-key",
		AnthropicBaseURL:    "env-ant-base",
		CustomLLMAPIKey:     "env-cust-key",
		CustomLLMBaseURL:    "env-cust-base",
		LLMLowModel:         "low-default",
		LLMMidModel:         "mid-default",
		LLMHighModel:        "high-default",
		LLMDefaultMaxTokens: 2048,
	}

	t.Run("all_defaults", func(t *testing.T) {
		rc := ResolveForRequest(baseCfg, nil, "", "", "", "")
		require.Equal(t, "openai", rc.Provider)
		require.Equal(t, "gpt-4", rc.Model)
		require.Equal(t, "low-default", rc.LowModel)
		require.Equal(t, "mid-default", rc.MidModel)
		require.Equal(t, "high-default", rc.HighModel)
		require.Equal(t, 2048, rc.DefaultMaxTokens)
		require.Equal(t, "env-key", rc.OpenAIAPIKey)
	})

	t.Run("user_overrides", func(t *testing.T) {
		overrides := &RuntimeOverrides{
			LLMProvider: sp("anthropic"),
			LLMLowModel: sp("my-low"),
		}
		rc := ResolveForRequest(baseCfg, overrides, "", "", "", "")
		require.Equal(t, "anthropic", rc.Provider)
		require.Equal(t, "my-low", rc.LowModel)
		require.Equal(t, "mid-default", rc.MidModel)
	})

	t.Run("per_request_overrides", func(t *testing.T) {
		rc := ResolveForRequest(baseCfg, nil, "custom", "req-low", "req-mid", "req-high")
		require.Equal(t, "custom", rc.Provider)
		require.Equal(t, "req-low", rc.LowModel)
		require.Equal(t, "req-mid", rc.MidModel)
		require.Equal(t, "req-high", rc.HighModel)
	})

	t.Run("three_layer_merge", func(t *testing.T) {
		overrides := &RuntimeOverrides{
			LLMProvider: sp("anthropic"),
			LLMLowModel: sp("user-low"),
		}
		rc := ResolveForRequest(baseCfg, overrides, "custom", "", "", "req-high")
		require.Equal(t, "custom", rc.Provider)
		require.Equal(t, "user-low", rc.LowModel)
		require.Equal(t, "req-high", rc.HighModel)
	})

	t.Run("max_tokens_override", func(t *testing.T) {
		overrides := &RuntimeOverrides{LLMDefaultMaxTokens: ip(4096)}
		rc := ResolveForRequest(baseCfg, overrides, "", "", "", "")
		require.Equal(t, 4096, rc.DefaultMaxTokens)
	})

	t.Run("max_tokens_zero_ignored", func(t *testing.T) {
		overrides := &RuntimeOverrides{LLMDefaultMaxTokens: ip(0)}
		rc := ResolveForRequest(baseCfg, overrides, "", "", "", "")
		require.Equal(t, 2048, rc.DefaultMaxTokens)
	})
}

func TestOptStrVal(t *testing.T) {
	tests := []struct {
		name string
		in   *string
		want string
	}{
		{"nil", nil, ""},
		{"empty", sp(""), ""},
		{"whitespace", sp("  "), ""},
		{"value", sp("hello"), "hello"},
		{"trimmed", sp(" hello "), "hello"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, optStrVal(tt.in))
		})
	}
}
