package chapter

import (
	"testing"

	"github.com/stretchr/testify/require"

	"myai-novel-go/internal/domain/shared"
)

func TestComputeAvailableActions(t *testing.T) {
	tests := []struct {
		name     string
		state    *WorkflowStateView
		want     []string
	}{
		{
			"no_artifacts",
			&WorkflowStateView{},
			[]string{"plan"},
		},
		{
			"has_plan",
			&WorkflowStateView{HasPlan: true},
			[]string{"plan", "draft"},
		},
		{
			"has_plan_and_draft",
			&WorkflowStateView{HasPlan: true, HasDraft: true},
			[]string{"plan", "draft", "review", "approve"},
		},
		{
			"has_plan_draft_review",
			&WorkflowStateView{HasPlan: true, HasDraft: true, HasReview: true},
			[]string{"plan", "draft", "review", "repair", "approve"},
		},
		{
			"has_all",
			&WorkflowStateView{HasPlan: true, HasDraft: true, HasReview: true, HasFinal: true},
			[]string{"plan", "draft", "review", "repair", "approve"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, computeAvailableActions(tt.state))
		})
	}
}

func TestComputeAvailableActions_DraftWithoutPlan(t *testing.T) {
	state := &WorkflowStateView{HasDraft: true}
	actions := computeAvailableActions(state)
	require.Contains(t, actions, "plan")
	require.Contains(t, actions, "review")
	require.Contains(t, actions, "approve")
	require.NotContains(t, actions, "draft")
}

func TestWorkflowStateView_Pointers(t *testing.T) {
	planID := int64(10)
	state := &WorkflowStateView{
		Status:        shared.ChapterStatusDrafted,
		CurrentPlanID: &planID,
		HasPlan:       true,
	}
	require.NotNil(t, state.CurrentPlanID)
	require.Equal(t, int64(10), *state.CurrentPlanID)
	require.True(t, state.HasPlan)
}
