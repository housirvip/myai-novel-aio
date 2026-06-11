package shared

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestEstimateWordCount(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want int
	}{
		{"empty", "", 0},
		{"pure_chinese", "今天天气很好", 6},
		{"pure_english", "hello world foo", 3},
		{"mixed", "今天hello世界world", 6},
		{"digits_attached", "hello123 world", 2},
		{"punctuation_only", "，。！？、", 0},
		{"whitespace_only", "   \n\t  ", 0},
		{"newlines_between_words", "hello\nworld", 2},
		{"chinese_with_punctuation", "你好，世界！", 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, EstimateWordCount(tt.in))
		})
	}
}

func TestDedupeInt64(t *testing.T) {
	tests := []struct {
		name string
		in   []int64
		want []int64
	}{
		{"empty", []int64{}, []int64{}},
		{"no_dupes", []int64{1, 2, 3}, []int64{1, 2, 3}},
		{"with_dupes_preserves_order", []int64{3, 1, 2, 1, 3}, []int64{3, 1, 2}},
		{"single", []int64{42}, []int64{42}},
		{"all_same", []int64{5, 5, 5}, []int64{5}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, DedupeInt64(tt.in))
		})
	}
}

func TestTrimSplit(t *testing.T) {
	tests := []struct {
		name string
		s    string
		seps string
		want []string
	}{
		{"empty_string", "", ",", nil},
		{"single_sep", "a,b,c", ",", []string{"a", "b", "c"}},
		{"multi_seps", "a,b;c", ",;", []string{"a", "b", "c"}},
		{"trim_whitespace", " a , b , c ", ",", []string{"a", "b", "c"}},
		{"consecutive_seps", "a,,b", ",", []string{"a", "b"}},
		{"no_sep_match", "abc", ",", []string{"abc"}},
		{"only_seps", ",;,", ",;", []string{}},
		{"whitespace_items", " , , ", ",", []string{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := TrimSplit(tt.s, tt.seps)
			require.Equal(t, tt.want, got)
		})
	}
}

func TestMarshalString(t *testing.T) {
	tests := []struct {
		name string
		in   any
		want string
	}{
		{"nil", nil, ""},
		{"struct", struct{ X int }{42}, `{"X":42}`},
		{"string", "hello", `"hello"`},
		{"number", 123, "123"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, MarshalString(tt.in))
		})
	}
}

func TestMarshalStringPtr(t *testing.T) {
	t.Run("nil_returns_nil", func(t *testing.T) {
		require.Nil(t, MarshalStringPtr(nil))
	})
	t.Run("valid_returns_ptr", func(t *testing.T) {
		got := MarshalStringPtr(42)
		require.NotNil(t, got)
		require.Equal(t, "42", *got)
	})
}

func TestUnmarshalString(t *testing.T) {
	t.Run("empty_noop", func(t *testing.T) {
		var x int
		require.NoError(t, UnmarshalString("", &x))
		require.Equal(t, 0, x)
	})
	t.Run("whitespace_noop", func(t *testing.T) {
		var x int
		require.NoError(t, UnmarshalString("  \t ", &x))
		require.Equal(t, 0, x)
	})
	t.Run("valid_json", func(t *testing.T) {
		var x int
		require.NoError(t, UnmarshalString("42", &x))
		require.Equal(t, 42, x)
	})
	t.Run("invalid_json", func(t *testing.T) {
		var x int
		require.Error(t, UnmarshalString("not_json", &x))
	})
}

func TestStrPtr_DerefStr(t *testing.T) {
	t.Run("empty_string_nil", func(t *testing.T) {
		require.Nil(t, StrPtr(""))
	})
	t.Run("nonempty_roundtrip", func(t *testing.T) {
		p := StrPtr("hello")
		require.NotNil(t, p)
		require.Equal(t, "hello", *p)
		require.Equal(t, "hello", DerefStr(p))
	})
	t.Run("deref_nil", func(t *testing.T) {
		require.Equal(t, "", DerefStr(nil))
	})
}

func TestIntPtr(t *testing.T) {
	p := IntPtr(7)
	require.Equal(t, 7, *p)
}

func TestInt64Ptr(t *testing.T) {
	p := Int64Ptr(99)
	require.Equal(t, int64(99), *p)
}
