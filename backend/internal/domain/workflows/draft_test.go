package workflows

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestShouldRepairLength(t *testing.T) {
	tests := []struct {
		name   string
		wc     int
		target int
		want   bool
	}{
		{"within_tolerance", 4800, 5000, false},
		{"exactly_at_boundary_over", 5500, 5000, false},
		{"over_tolerance", 5501, 5000, true},
		{"under_tolerance", 4499, 5000, true},
		{"exact_match", 5000, 5000, false},
		{"small_target_uses_min_delta", 500, 100, true},
		{"small_target_within_min_delta", 350, 100, false},
		{"zero_target", 500, 0, true},
		{"min_delta_dominates", 1200, 1000, false},
		{"min_delta_boundary", 1301, 1000, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, shouldRepairLength(tt.wc, tt.target))
		})
	}
}

func TestShouldAggressivelyCompress(t *testing.T) {
	tests := []struct {
		name   string
		wc     int
		target int
		want   bool
	}{
		{"below_120pct", 5500, 5000, false},
		{"at_120pct", 6000, 5000, false},
		{"above_120pct", 6001, 5000, true},
		{"small_target_uses_min_delta", 450, 100, true},
		{"small_target_at_threshold", 400, 100, false},
		{"min_delta_dominates", 1201, 1000, false},
		{"min_delta_boundary", 1301, 1000, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, shouldAggressivelyCompress(tt.wc, tt.target))
		})
	}
}

func TestRepairProgress(t *testing.T) {
	tests := []struct {
		name  string
		round int
		max   int
		want  int
	}{
		{"max_1", 1, 1, 85},
		{"round_1_of_5", 1, 5, 85},
		{"round_2_of_5", 2, 5, 87},
		{"round_3_of_5", 3, 5, 89},
		{"round_5_of_5", 5, 5, 93},
		{"never_exceeds_93", 10, 5, 93},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, repairProgress(tt.round, tt.max))
		})
	}

	t.Run("monotonically_increasing", func(t *testing.T) {
		max := 8
		prev := 0
		for r := 1; r <= max; r++ {
			p := repairProgress(r, max)
			require.GreaterOrEqual(t, p, prev)
			prev = p
		}
	})
}
