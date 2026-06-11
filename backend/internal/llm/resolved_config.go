package llm

type ResolvedLLMConfig struct {
	Provider         string `json:"provider"`
	Model            string `json:"model"`
	LowModel         string `json:"lowModel"`
	MidModel         string `json:"midModel"`
	HighModel        string `json:"highModel"`
	DefaultMaxTokens int    `json:"defaultMaxTokens,omitempty"`
	OpenAIAPIKey     string `json:"openaiApiKey,omitempty"`
	OpenAIBaseURL    string `json:"openaiBaseUrl,omitempty"`
	AnthropicAPIKey  string `json:"anthropicApiKey,omitempty"`
	AnthropicBaseURL string `json:"anthropicBaseUrl,omitempty"`
	CustomLLMAPIKey  string `json:"customLlmApiKey,omitempty"`
	CustomLLMBaseURL string `json:"customLlmBaseUrl,omitempty"`
	ActorUserID      int64  `json:"actorUserId,omitempty"`
}

func (rc *ResolvedLLMConfig) Sanitized() *ResolvedLLMConfig {
	if rc == nil {
		return nil
	}
	cp := *rc
	cp.OpenAIAPIKey = ""
	cp.AnthropicAPIKey = ""
	cp.CustomLLMAPIKey = ""
	return &cp
}

func ResolveModelFromConfig(rc *ResolvedLLMConfig, explicit string, tier ModelTier) string {
	if explicit != "" {
		return explicit
	}
	if rc == nil {
		return ""
	}
	switch tier {
	case TierLow:
		return rc.LowModel
	case TierMid:
		return rc.MidModel
	case TierHigh:
		return rc.HighModel
	}
	return ""
}
