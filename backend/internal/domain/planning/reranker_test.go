package planning

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCountKeywordHits(t *testing.T) {
	tests := []struct {
		name     string
		keywords []string
		content  string
		want     int
	}{
		{"empty_keywords", nil, "some content", 0},
		{"empty_content", []string{"a"}, "", 0},
		{"no_hits", []string{"xyz"}, "abc def", 0},
		{"partial_hits", []string{"abc", "xyz", "def"}, "abc def ghi", 2},
		{"all_hits", []string{"abc", "def"}, "abc def", 2},
		{"case_insensitive", []string{"ABC"}, "abc def", 1},
		{"whitespace_keyword_skipped", []string{" ", "abc"}, "abc", 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, countKeywordHits(tt.keywords, tt.content))
		})
	}
}

func TestHasReason(t *testing.T) {
	tests := []struct {
		name   string
		reason string
		want   string
		result bool
	}{
		{"single_match", "手动指定", "手动指定", true},
		{"pipe_separated", "keyword_hit|manual_id", "manual_id", true},
		{"no_match", "keyword_hit|embedding_match", "manual_id", false},
		{"empty_reason", "", "manual_id", false},
		{"whitespace_trimmed", " manual_id | keyword_hit ", "manual_id", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.result, hasReason(tt.reason, tt.want))
		})
	}
}

func TestContinuityBonus(t *testing.T) {
	tests := []struct {
		name       string
		content    string
		entityType string
		want       float64
	}{
		{"hook_open", "状态:open 某伏笔", "hook", 6},
		{"hook_unresolved", "未回收的线索", "hook", 6},
		{"hook_no_match", "已回收", "hook", 0},
		{"world_setting_active", "状态:active 设定", "world_setting", 2},
		{"world_setting_lively", "活跃的世界观", "world_setting", 2},
		{"world_setting_no_match", "已废弃", "world_setting", 0},
		{"character_always_zero", "状态:open 某角色", "character", 0},
		{"item_always_zero", "活跃 item", "item", 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.InDelta(t, tt.want, continuityBonus(tt.content, tt.entityType), 1e-6)
		})
	}
}

func TestHookChapterBonus(t *testing.T) {
	tests := []struct {
		name      string
		content   string
		chapterNo int
		want      float64
	}{
		{"no_target", "some hook content", 5, 0},
		{"exact_match_d0", "target_chapter_no=5", 5, 30},
		{"distance_1", "target_chapter_no=6", 5, 20},
		{"distance_2", "target_chapter_no=3", 5, 10},
		{"distance_3_plus", "target_chapter_no=10", 5, 0},
		{"malformed_number", "target_chapter_no=abc", 5, 0},
		{"negative_distance", "target_chapter_no=4", 5, 20},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.InDelta(t, tt.want, hookChapterBonus(tt.content, tt.chapterNo), 1e-6)
		})
	}
}

func TestComputeHeuristicScore(t *testing.T) {
	tests := []struct {
		name       string
		entity     RetrievedEntity
		params     RetrieveParams
		entityType string
		want       float64
	}{
		{
			name:       "base_only",
			entity:     RetrievedEntity{ID: 1, Score: 10, Reason: "", Content: ""},
			params:     RetrieveParams{Keywords: nil, ChapterNo: 1},
			entityType: "character",
			want:       10,
		},
		{
			name:       "manual_flag",
			entity:     RetrievedEntity{ID: 1, Score: 0, Reason: "手动指定", Content: ""},
			params:     RetrieveParams{Keywords: nil, ChapterNo: 1},
			entityType: "character",
			want:       40,
		},
		{
			name:       "keyword_flag",
			entity:     RetrievedEntity{ID: 1, Score: 0, Reason: "关键词命中", Content: ""},
			params:     RetrieveParams{Keywords: nil, ChapterNo: 1},
			entityType: "character",
			want:       15,
		},
		{
			name:       "embedding_match",
			entity:     RetrievedEntity{ID: 1, Score: 0, Reason: "embedding_match", Content: ""},
			params:     RetrieveParams{Keywords: nil, ChapterNo: 1},
			entityType: "character",
			want:       10,
		},
		{
			name:       "embedding_support",
			entity:     RetrievedEntity{ID: 1, Score: 0, Reason: "embedding_support", Content: ""},
			params:     RetrieveParams{Keywords: nil, ChapterNo: 1},
			entityType: "character",
			want:       6,
		},
		{
			name:       "keyword_continuity_combined",
			entity:     RetrievedEntity{ID: 1, Score: 5, Reason: "manual_id|keyword_hit", Content: "状态:open target_chapter_no=3"},
			params:     RetrieveParams{Keywords: []string{"状态"}, ChapterNo: 3},
			entityType: "hook",
			// base(5) + manual(40) + keyword(15) + continuity(1*4 + 6) + hookBonus(30) = 100
			want: 100,
		},
		{
			name:       "combined_all_factors",
			entity:     RetrievedEntity{ID: 1, Score: 2, Reason: "手动指定|关键词命中|embedding_match|embedding_support", Content: "abc"},
			params:     RetrieveParams{Keywords: []string{"abc"}, ChapterNo: 1},
			entityType: "character",
			// base(2) + manual(40) + keyword(15) + embedding(10+6) + continuity(1*4 + 0) = 77
			want: 77,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.InDelta(t, tt.want, computeHeuristicScore(tt.entity, tt.params, tt.entityType), 1e-6)
		})
	}
}

func TestRerankGroup(t *testing.T) {
	entities := []RetrievedEntity{
		{ID: 1, Score: 0, Reason: "", Content: "low"},
		{ID: 2, Score: 0, Reason: "手动指定", Content: "high"},
		{ID: 3, Score: 0, Reason: "关键词命中", Content: "mid"},
	}
	params := RetrieveParams{Keywords: nil, ChapterNo: 1}

	result := rerankGroup(entities, params, "character")

	require.Len(t, result, 3)
	require.Equal(t, int64(2), result[0].ID)
	require.Equal(t, int64(3), result[1].ID)
	require.Equal(t, int64(1), result[2].ID)
	require.InDelta(t, 40, result[0].Score, 1e-6)
	require.InDelta(t, 15, result[1].Score, 1e-6)
	require.InDelta(t, 0, result[2].Score, 1e-6)
}

func TestRerankGroup_StableSortByID(t *testing.T) {
	entities := []RetrievedEntity{
		{ID: 3, Score: 0, Reason: "", Content: ""},
		{ID: 1, Score: 0, Reason: "", Content: ""},
		{ID: 2, Score: 0, Reason: "", Content: ""},
	}
	params := RetrieveParams{Keywords: nil, ChapterNo: 1}

	result := rerankGroup(entities, params, "character")

	require.Equal(t, int64(1), result[0].ID)
	require.Equal(t, int64(2), result[1].ID)
	require.Equal(t, int64(3), result[2].ID)
}
