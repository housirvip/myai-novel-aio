package llmfactory

import (
	"fmt"
	"net/http"
	"time"

	"myai-novel-go/internal/config"
	"myai-novel-go/internal/llm"
	"myai-novel-go/internal/llm/providers"
)

type Factory struct {
	cfg     *config.Config
	httpC   *http.Client
	limiter *llm.Limiter
}

func New(cfg *config.Config) *Factory {
	httpC := &http.Client{Timeout: time.Duration(cfg.LLMRequestTimeoutSec+30) * time.Second}
	return &Factory{
		cfg:     cfg,
		httpC:   httpC,
		limiter: llm.NewLimiter(cfg.LLMRateLimitRPS),
	}
}

func (f *Factory) Create(provider llm.ProviderName) (llm.Client, error) {
	if provider == "" {
		provider = llm.ProviderName(f.cfg.LLMProvider)
	}
	var client llm.Client
	switch provider {
	case llm.ProviderMock:
		client = providers.NewMock(f.cfg)
	case llm.ProviderOpenAI:
		client = providers.NewOpenAI(f.cfg, f.httpC)
	case llm.ProviderAnthropic:
		client = providers.NewAnthropic(f.cfg, f.httpC)
	case llm.ProviderCustom:
		client = providers.NewCustom(f.cfg, f.httpC)
	default:
		return nil, fmt.Errorf("unsupported LLM provider: %s", provider)
	}
	timeout := time.Duration(f.cfg.LLMRequestTimeoutSec) * time.Second
	return llm.WithRateLimit(client, f.limiter, timeout), nil
}

func (f *Factory) CreateWithConfig(rc *llm.ResolvedLLMConfig) (llm.Client, error) {
	if rc == nil {
		return f.Create("")
	}
	provider := llm.ProviderName(rc.Provider)
	if provider == "" {
		provider = llm.ProviderName(f.cfg.LLMProvider)
	}
	var client llm.Client
	switch provider {
	case llm.ProviderMock:
		client = providers.NewMock(f.cfg)
	case llm.ProviderOpenAI:
		apiKey := firstNonEmpty(rc.OpenAIAPIKey, f.cfg.OpenAIAPIKey)
		baseURL := firstNonEmpty(rc.OpenAIBaseURL, f.cfg.OpenAIBaseURL)
		if baseURL == "" {
			baseURL = "https://api.openai.com/v1"
		}
		model := firstNonEmpty(rc.Model, f.cfg.OpenAIModel)
		client = providers.NewCompatible(baseURL, apiKey, model, f.httpC)
	case llm.ProviderAnthropic:
		apiKey := firstNonEmpty(rc.AnthropicAPIKey, f.cfg.AnthropicAPIKey)
		baseURL := firstNonEmpty(rc.AnthropicBaseURL, f.cfg.AnthropicBaseURL)
		model := firstNonEmpty(rc.Model, f.cfg.AnthropicModel)
		maxTokens := rc.DefaultMaxTokens
		if maxTokens <= 0 {
			maxTokens = f.cfg.LLMDefaultMaxTokens
		}
		client = providers.NewAnthropicDirect(apiKey, baseURL, model, maxTokens, f.httpC)
	case llm.ProviderCustom:
		apiKey := firstNonEmpty(rc.CustomLLMAPIKey, f.cfg.CustomLLMAPIKey)
		baseURL := firstNonEmpty(rc.CustomLLMBaseURL, f.cfg.CustomLLMBaseURL)
		model := firstNonEmpty(rc.Model, f.cfg.CustomLLMModel)
		inner := providers.NewCompatible(baseURL, apiKey, model, f.httpC)
		client = providers.NewCustomWrap(inner)
	default:
		return nil, fmt.Errorf("unsupported LLM provider: %s", provider)
	}
	timeout := time.Duration(f.cfg.LLMRequestTimeoutSec) * time.Second
	return llm.WithRateLimit(client, f.limiter, timeout), nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

// NewEmbedding 按 cfg.PlanningRetrievalEmbeddingProvider 创建嵌入客户端;
// 返回 nil 表示禁用嵌入(provider=none),调用方据此跳过嵌入链路装配。
func (f *Factory) NewEmbedding() llm.EmbeddingClient {
	switch llm.EmbeddingProvider(f.cfg.PlanningRetrievalEmbeddingProvider) {
	case llm.EmbeddingProviderHash:
		return providers.NewHashEmbedding()
	case llm.EmbeddingProviderCustom:
		return providers.NewCustomEmbedding(providers.CustomEmbeddingOptions{
			BaseURL:   f.cfg.CustomEmbeddingBaseURL,
			APIKey:    f.cfg.CustomEmbeddingAPIKey,
			Model:     f.cfg.CustomEmbeddingModel,
			BatchSize: f.cfg.CustomEmbeddingBatchSize,
		})
	default:
		return nil
	}
}
