package user_settings

import (
	"strings"

	"myai-novel-go/internal/config"
	"myai-novel-go/internal/llm"
)

// ResolveForRequest produces a fully-resolved LLM config by layering:
//  1. Server env defaults (cfg)
//  2. User DB overrides (overrides, may be nil)
//  3. Per-request overrides from the HTTP body (reqProvider, reqLow, reqMid, reqHigh)
func ResolveForRequest(
	cfg *config.Config,
	overrides *RuntimeOverrides,
	reqProvider, reqLowModel, reqMidModel, reqHighModel string,
) *llm.ResolvedLLMConfig {
	if overrides == nil {
		overrides = &RuntimeOverrides{}
	}

	// Layer 1+2: server defaults + user DB overrides
	provider := string(cfg.LLMProvider)
	if v := optStrVal(overrides.LLMProvider); v != "" {
		provider = v
	}

	model := DefaultProviderModel(cfg, provider)
	if v := optStrVal(overrides.LLMModel); v != "" {
		model = v
	}

	lowModel := resolveFieldChain(optStrVal(overrides.LLMLowModel), strings.TrimSpace(cfg.LLMLowModel), model)
	midModel := resolveFieldChain(optStrVal(overrides.LLMMidModel), strings.TrimSpace(cfg.LLMMidModel), model)
	highModel := resolveFieldChain(optStrVal(overrides.LLMHighModel), strings.TrimSpace(cfg.LLMHighModel), model)

	defaultMaxTokens := cfg.LLMDefaultMaxTokens
	if overrides.LLMDefaultMaxTokens != nil && *overrides.LLMDefaultMaxTokens > 0 {
		defaultMaxTokens = *overrides.LLMDefaultMaxTokens
	}

	openAIKey, openAIBase := resolveProviderConn(
		optStrVal(overrides.OpenAIAPIKey), optStrVal(overrides.OpenAIBaseURL),
		strings.TrimSpace(cfg.OpenAIAPIKey), strings.TrimSpace(cfg.OpenAIBaseURL), true,
	)
	anthropicKey, anthropicBase := resolveProviderConn(
		optStrVal(overrides.AnthropicAPIKey), optStrVal(overrides.AnthropicBaseURL),
		strings.TrimSpace(cfg.AnthropicAPIKey), strings.TrimSpace(cfg.AnthropicBaseURL), true,
	)
	customKey, customBase := resolveProviderConn(
		optStrVal(overrides.CustomLLMAPIKey), optStrVal(overrides.CustomLLMBaseURL),
		strings.TrimSpace(cfg.CustomLLMAPIKey), strings.TrimSpace(cfg.CustomLLMBaseURL), false,
	)

	// Layer 3: per-request overrides
	if reqProvider != "" {
		provider = reqProvider
	}
	if reqLowModel != "" {
		lowModel = reqLowModel
	}
	if reqMidModel != "" {
		midModel = reqMidModel
	}
	if reqHighModel != "" {
		highModel = reqHighModel
	}

	return &llm.ResolvedLLMConfig{
		Provider:         provider,
		Model:            model,
		LowModel:         lowModel,
		MidModel:         midModel,
		HighModel:        highModel,
		DefaultMaxTokens: defaultMaxTokens,
		OpenAIAPIKey:     openAIKey,
		OpenAIBaseURL:    openAIBase,
		AnthropicAPIKey:  anthropicKey,
		AnthropicBaseURL: anthropicBase,
		CustomLLMAPIKey:  customKey,
		CustomLLMBaseURL: customBase,
	}
}

func DefaultProviderModel(cfg *config.Config, provider string) string {
	switch provider {
	case "openai":
		return strings.TrimSpace(cfg.OpenAIModel)
	case "anthropic":
		return strings.TrimSpace(cfg.AnthropicModel)
	case "custom":
		return strings.TrimSpace(cfg.CustomLLMModel)
	default:
		return strings.TrimSpace(cfg.MockLLMModel)
	}
}

func resolveFieldChain(override, serverDefault, fallback string) string {
	if override != "" {
		return override
	}
	if serverDefault != "" {
		return serverDefault
	}
	return fallback
}

func resolveProviderConn(overrideKey, overrideBase, envKey, envBase string, requireKeyPairing bool) (string, string) {
	hasKey := overrideKey != ""
	hasBase := overrideBase != ""
	if !hasKey && !hasBase {
		return envKey, envBase
	}
	apiKey := envKey
	if hasKey {
		apiKey = overrideKey
	} else if requireKeyPairing {
		apiKey = ""
	}
	baseURL := envBase
	if hasBase {
		baseURL = overrideBase
	}
	return apiKey, baseURL
}

func optStrVal(v *string) string {
	if v == nil {
		return ""
	}
	return strings.TrimSpace(*v)
}
