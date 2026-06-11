package workflows

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseApproveDiff_ValidJSON(t *testing.T) {
	raw := `{"chapterSummary":"summary","unresolvedImpact":null}`
	diff, err := parseApproveDiff(raw)
	require.NoError(t, err)
	require.Equal(t, "summary", diff.ChapterSummary)
	require.Nil(t, diff.UnresolvedImpact)
}

func TestParseApproveDiff_WithCodeFence(t *testing.T) {
	raw := "```json\n{\"chapterSummary\":\"fenced\"}\n```"
	diff, err := parseApproveDiff(raw)
	require.NoError(t, err)
	require.Equal(t, "fenced", diff.ChapterSummary)
}

func TestParseApproveDiff_MissingSummary(t *testing.T) {
	raw := `{"unresolvedImpact":null}`
	_, err := parseApproveDiff(raw)
	require.Error(t, err)
	require.Contains(t, err.Error(), "chapterSummary")
}

func TestParseApproveDiff_InvalidJSON(t *testing.T) {
	_, err := parseApproveDiff("not json at all")
	require.Error(t, err)
	require.Contains(t, err.Error(), "decode diff")
}

func TestParseApproveDiff_ExtraFields(t *testing.T) {
	raw := `{"chapterSummary":"ok","unknownField":"ignored"}`
	diff, err := parseApproveDiff(raw)
	require.NoError(t, err)
	require.Equal(t, "ok", diff.ChapterSummary)
}

func TestMergeIDs(t *testing.T) {
	tests := []struct {
		name string
		a    []int64
		b    []int64
		want []int64
	}{
		{"nil_a", nil, []int64{1, 2}, []int64{1, 2}},
		{"nil_b", []int64{1, 2}, nil, []int64{1, 2}},
		{"both_nil", nil, nil, []int64{}},
		{"overlapping_deduped", []int64{1, 2}, []int64{2, 3}, []int64{1, 2, 3}},
		{"no_overlap", []int64{1}, []int64{2}, []int64{1, 2}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, mergeIDs(tt.a, tt.b))
		})
	}
}

func TestSplitParagraphs(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want []string
	}{
		{"empty", "", []string{}},
		{"single", "paragraph one", []string{"paragraph one"}},
		{"multiple", "para one\n\npara two\n\npara three", []string{"para one", "para two", "para three"}},
		{"whitespace_filtered", "para one\n\n  \n\npara two", []string{"para one", "para two"}},
		{"trailing_newlines", "para one\n\n", []string{"para one"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, splitParagraphs(tt.in))
		})
	}
}
