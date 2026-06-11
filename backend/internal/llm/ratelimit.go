package llm

import (
	"context"
	"time"

	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// Limiter 限制全局对外 LLM 调用速率,防止打满 provider 配额。
type Limiter struct {
	limiter *rate.Limiter
}

func NewLimiter(rps int) *Limiter {
	if rps <= 0 {
		rps = 20
	}
	return &Limiter{
		limiter: rate.NewLimiter(rate.Limit(rps), rps),
	}
}

func (l *Limiter) Wait(ctx context.Context) error {
	if l == nil || l.limiter == nil {
		return nil
	}
	return l.limiter.Wait(ctx)
}

type RateLimitedClient struct {
	inner             Client
	limiter           *Limiter
	timeout           time.Duration
	logger            *zap.Logger
	logContent        bool
	logContentMaxChar int
}

func WithRateLimit(inner Client, limiter *Limiter, timeout time.Duration, logger *zap.Logger, logContent bool, logContentMaxChar int) Client {
	return &RateLimitedClient{
		inner: inner, limiter: limiter, timeout: timeout,
		logger: logger, logContent: logContent, logContentMaxChar: logContentMaxChar,
	}
}

func (c *RateLimitedClient) Generate(ctx context.Context, params GenerateParams) (*GenerateResult, error) {
	if c.limiter != nil {
		if err := c.limiter.Wait(ctx); err != nil {
			return nil, err
		}
	}
	if c.timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, c.timeout)
		defer cancel()
	}

	fields := []zap.Field{
		zap.String("model", params.Model),
		zap.Int("messageCount", len(params.Messages)),
	}
	if c.logContent && len(params.Messages) > 0 {
		last := params.Messages[len(params.Messages)-1].Content
		fields = append(fields, zap.String("prompt", truncateStr(last, c.logContentMaxChar)))
	}
	c.logger.Info("llm.request.start", fields...)

	start := time.Now()
	result, err := c.inner.Generate(ctx, params)
	elapsed := time.Since(start)

	if err != nil {
		c.logger.Error("llm.request.error",
			zap.String("model", params.Model),
			zap.Int64("durationMs", elapsed.Milliseconds()),
			zap.Error(err),
		)
		return nil, err
	}

	finishFields := []zap.Field{
		zap.String("model", result.Model),
		zap.String("provider", string(result.Provider)),
		zap.Int("inputTokens", result.Usage.InputTokens),
		zap.Int("outputTokens", result.Usage.OutputTokens),
		zap.Int("totalTokens", result.Usage.TotalTokens),
		zap.Int64("durationMs", elapsed.Milliseconds()),
	}
	if c.logContent {
		finishFields = append(finishFields, zap.String("content", truncateStr(result.Content, c.logContentMaxChar)))
	}
	c.logger.Info("llm.request.finish", finishFields...)

	return result, nil
}

func truncateStr(s string, maxChar int) string {
	runes := []rune(s)
	if maxChar <= 0 || len(runes) <= maxChar {
		return s
	}
	return string(runes[:maxChar]) + "..."
}
