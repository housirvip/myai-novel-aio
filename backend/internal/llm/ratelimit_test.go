package llm

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNewLimiter(t *testing.T) {
	t.Run("positive_rps", func(t *testing.T) {
		l := NewLimiter(10)
		require.NotNil(t, l)
		require.NotNil(t, l.limiter)
	})

	t.Run("zero_rps_defaults_to_20", func(t *testing.T) {
		l := NewLimiter(0)
		require.NotNil(t, l)
	})

	t.Run("negative_rps_defaults_to_20", func(t *testing.T) {
		l := NewLimiter(-5)
		require.NotNil(t, l)
	})
}

func TestLimiter_Wait(t *testing.T) {
	t.Run("nil_limiter_noop", func(t *testing.T) {
		var l *Limiter
		require.NoError(t, l.Wait(context.Background()))
	})

	t.Run("cancelled_context", func(t *testing.T) {
		l := NewLimiter(1)
		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		require.Error(t, l.Wait(ctx))
	})
}
