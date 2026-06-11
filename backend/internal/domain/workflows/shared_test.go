package workflows

import (
	"testing"

	"myai-novel-go/internal/db/models"
	"myai-novel-go/internal/domain/shared"

	"github.com/stretchr/testify/require"
)

func TestInt64PtrEq(t *testing.T) {
	tests := []struct {
		name string
		a    *int64
		b    *int64
		want bool
	}{
		{"both_nil", nil, nil, true},
		{"a_nil", nil, shared.Int64Ptr(1), false},
		{"b_nil", shared.Int64Ptr(1), nil, false},
		{"same_val", shared.Int64Ptr(42), shared.Int64Ptr(42), true},
		{"diff_val", shared.Int64Ptr(1), shared.Int64Ptr(2), false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, int64PtrEq(tt.a, tt.b))
		})
	}
}

func TestTakeSnapshot(t *testing.T) {
	planID := int64(10)
	draftID := int64(20)
	ch := &models.Chapter{
		CurrentPlanID:  &planID,
		CurrentDraftID: &draftID,
	}
	snap := TakeSnapshot(ch)
	require.NotNil(t, snap.CurrentPlanID)
	require.Equal(t, int64(10), *snap.CurrentPlanID)
	require.NotNil(t, snap.CurrentDraftID)
	require.Equal(t, int64(20), *snap.CurrentDraftID)
	require.Nil(t, snap.CurrentReviewID)
	require.Nil(t, snap.CurrentFinalID)
}

func TestReadIntentConstraints(t *testing.T) {
	t.Run("nil_fields", func(t *testing.T) {
		plan := &models.ChapterPlan{}
		ic := ReadIntentConstraints(plan)
		require.Empty(t, ic.IntentSummary)
		require.Nil(t, ic.MustInclude)
		require.Nil(t, ic.MustAvoid)
	})

	t.Run("populated", func(t *testing.T) {
		summary := "test summary"
		include := `["a","b"]`
		avoid := `["c"]`
		plan := &models.ChapterPlan{
			IntentSummary:     &summary,
			IntentMustInclude: &include,
			IntentMustAvoid:   &avoid,
		}
		ic := ReadIntentConstraints(plan)
		require.Equal(t, "test summary", ic.IntentSummary)
		require.Equal(t, []string{"a", "b"}, ic.MustInclude)
		require.Equal(t, []string{"c"}, ic.MustAvoid)
	})

	t.Run("malformed_json_ignored", func(t *testing.T) {
		bad := "not json"
		plan := &models.ChapterPlan{IntentMustInclude: &bad}
		ic := ReadIntentConstraints(plan)
		require.Nil(t, ic.MustInclude)
	})
}

func TestLoadRetrievedContext(t *testing.T) {
	t.Run("nil_field", func(t *testing.T) {
		plan := &models.ChapterPlan{}
		ctx, err := LoadRetrievedContext(plan)
		require.NoError(t, err)
		require.NotNil(t, ctx)
	})

	t.Run("empty_string", func(t *testing.T) {
		empty := ""
		plan := &models.ChapterPlan{RetrievedContext: &empty}
		ctx, err := LoadRetrievedContext(plan)
		require.NoError(t, err)
		require.NotNil(t, ctx)
	})

	t.Run("valid_json", func(t *testing.T) {
		raw := `{"book":{"id":1,"title":"test","currentChapterCount":5}}`
		plan := &models.ChapterPlan{RetrievedContext: &raw}
		ctx, err := LoadRetrievedContext(plan)
		require.NoError(t, err)
		require.Equal(t, int64(1), ctx.Book.ID)
		require.Equal(t, "test", ctx.Book.Title)
	})

	t.Run("invalid_json", func(t *testing.T) {
		bad := "not json"
		plan := &models.ChapterPlan{RetrievedContext: &bad}
		_, err := LoadRetrievedContext(plan)
		require.Error(t, err)
	})
}

func TestNotify_NilNotifier(t *testing.T) {
	require.NotPanics(t, func() {
		Notify(nil, "stage", 50)
	})
}

func TestNotify_Called(t *testing.T) {
	var calledStage string
	var calledProgress int
	notifier := func(stage string, progress *int) error {
		calledStage = stage
		if progress != nil {
			calledProgress = *progress
		}
		return nil
	}
	Notify(notifier, "test_stage", 75)
	require.Equal(t, "test_stage", calledStage)
	require.Equal(t, 75, calledProgress)
}
