package handler

import (
	"strings"

	"myai-novel-go/internal/config"
	usersettings "myai-novel-go/internal/domain/user_settings"
	"myai-novel-go/internal/llm"
)

type userRuntimeSettingsView struct {
	Overrides      llmRuntimeSettingsView  `json:"overrides"`
	ServerDefaults llmRuntimeSettingsView  `json:"serverDefaults"`
	Effective      llmRuntimeSettingsView  `json:"effective"`
	Capabilities   runtimeCapabilitiesView `json:"capabilities"`
}

type llmRuntimeSettingsView struct {
	Provider         *string        `json:"provider,omitempty"`
	Model            *string        `json:"model,omitempty"`
	LowModel         *string        `json:"lowModel,omitempty"`
	MidModel         *string        `json:"midModel,omitempty"`
	HighModel        *string        `json:"highModel,omitempty"`
	DefaultMaxTokens *int           `json:"defaultMaxTokens,omitempty"`
	OpenAIAPIKey     llmSecretField `json:"openaiApiKey"`
	OpenAIBaseURL    *string        `json:"openaiBaseUrl,omitempty"`
	AnthropicAPIKey  llmSecretField `json:"anthropicApiKey"`
	AnthropicBaseURL *string        `json:"anthropicBaseUrl,omitempty"`
	CustomLLMAPIKey  llmSecretField `json:"customLlmApiKey"`
	CustomLLMBaseURL *string        `json:"customLlmBaseUrl,omitempty"`
}

type llmSecretField struct {
	HasValue    bool    `json:"hasValue"`
	MaskedValue *string `json:"maskedValue"`
}

type runtimeCapabilitiesView struct {
	AllowedProviders           []string        `json:"allowedProviders"`
	ProviderAvailability       map[string]bool `json:"providerAvailability"`
	SupportsSensitiveOverrides bool            `json:"supportsSensitiveOverrides"`
}

func buildUserRuntimeSettingsView(cfg *config.Config, overrides *usersettings.RuntimeOverrides) userRuntimeSettingsView {
	if overrides == nil {
		overrides = &usersettings.RuntimeOverrides{}
	}
	serverDefaults := usersettings.ResolveForRequest(cfg, nil, "", "", "", "")
	effective := usersettings.ResolveForRequest(cfg, overrides, "", "", "", "")
	return userRuntimeSettingsView{
		Overrides:      buildOverridesView(overrides),
		ServerDefaults: rcToView(serverDefaults),
		Effective:      rcToView(effective),
		Capabilities:   buildCapabilitiesView(effective),
	}
}

func buildOverridesView(overrides *usersettings.RuntimeOverrides) llmRuntimeSettingsView {
	return llmRuntimeSettingsView{
		Provider:         optionalStringPtr(overrides.LLMProvider),
		Model:            optionalStringPtr(overrides.LLMModel),
		LowModel:         optionalStringPtr(overrides.LLMLowModel),
		MidModel:         optionalStringPtr(overrides.LLMMidModel),
		HighModel:        optionalStringPtr(overrides.LLMHighModel),
		DefaultMaxTokens: optionalIntPtr(overrides.LLMDefaultMaxTokens),
		OpenAIAPIKey:     toSecretField(optionalStringValue(overrides.OpenAIAPIKey)),
		OpenAIBaseURL:    optionalStringPtr(overrides.OpenAIBaseURL),
		AnthropicAPIKey:  toSecretField(optionalStringValue(overrides.AnthropicAPIKey)),
		AnthropicBaseURL: optionalStringPtr(overrides.AnthropicBaseURL),
		CustomLLMAPIKey:  toSecretField(optionalStringValue(overrides.CustomLLMAPIKey)),
		CustomLLMBaseURL: optionalStringPtr(overrides.CustomLLMBaseURL),
	}
}

func rcToView(rc *llm.ResolvedLLMConfig) llmRuntimeSettingsView {
	return llmRuntimeSettingsView{
		Provider:         valueStringPtr(rc.Provider),
		Model:            valueStringPtr(rc.Model),
		LowModel:         valueStringPtr(rc.LowModel),
		MidModel:         valueStringPtr(rc.MidModel),
		HighModel:        valueStringPtr(rc.HighModel),
		DefaultMaxTokens: valueIntPtr(rc.DefaultMaxTokens),
		OpenAIAPIKey:     toSecretField(rc.OpenAIAPIKey),
		OpenAIBaseURL:    valueStringPtr(rc.OpenAIBaseURL),
		AnthropicAPIKey:  toSecretField(rc.AnthropicAPIKey),
		AnthropicBaseURL: valueStringPtr(rc.AnthropicBaseURL),
		CustomLLMAPIKey:  toSecretField(rc.CustomLLMAPIKey),
		CustomLLMBaseURL: valueStringPtr(rc.CustomLLMBaseURL),
	}
}

func buildCapabilitiesView(rc *llm.ResolvedLLMConfig) runtimeCapabilitiesView {
	return runtimeCapabilitiesView{
		AllowedProviders: []string{"mock", "openai", "anthropic", "custom"},
		ProviderAvailability: map[string]bool{
			"mock":      true,
			"openai":    rc.OpenAIAPIKey != "",
			"anthropic": rc.AnthropicAPIKey != "",
			"custom":    rc.CustomLLMBaseURL != "",
		},
		SupportsSensitiveOverrides: true,
	}
}

func toSecretField(value string) llmSecretField {
	if value == "" {
		return llmSecretField{HasValue: false, MaskedValue: nil}
	}
	masked := maskSecretValue(value)
	return llmSecretField{HasValue: true, MaskedValue: &masked}
}

func maskSecretValue(value string) string {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) <= 8 {
		return trimmed[:1] + "***" + trimmed[len(trimmed)-1:]
	}
	return trimmed[:4] + "..." + trimmed[len(trimmed)-4:]
}

func optionalStringPtr(v *string) *string {
	if v == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*v)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func optionalStringValue(v *string) string {
	if v == nil {
		return ""
	}
	return strings.TrimSpace(*v)
}

func optionalIntPtr(v *int) *int {
	if v == nil {
		return nil
	}
	if *v <= 0 {
		return nil
	}
	value := *v
	return &value
}

func valueStringPtr(v string) *string {
	trimmed := strings.TrimSpace(v)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func valueIntPtr(v int) *int {
	if v <= 0 {
		return nil
	}
	value := v
	return &value
}
