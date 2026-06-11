package workflow

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"myai-novel-go/internal/config"
	"myai-novel-go/internal/db"
	"myai-novel-go/internal/db/models"
	"myai-novel-go/internal/domain/shared"
	"myai-novel-go/internal/domain/workflows"
)

func openTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := filepath.Join(t.TempDir(), "test.db") + "?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=on"
	gdb, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger:                                   gormlogger.Default.LogMode(gormlogger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	require.NoError(t, err)
	require.NoError(t, db.Migrate(gdb))
	return gdb
}

func newTestTaskService(t *testing.T) *Service {
	t.Helper()
	gdb := openTestDB(t)
	cfg := &config.Config{}
	svc := NewService(gdb, zap.NewNop(), cfg, nil, nil, nil, nil, nil, nil, nil)

	now := shared.NowISO()
	book := models.Book{Title: "Test Book", Status: "active", CreatedAt: now, UpdatedAt: now}
	require.NoError(t, gdb.Create(&book).Error)
	ch := models.Chapter{BookID: book.ID, ChapterNo: 1, Status: "outlined", CreatedAt: now, UpdatedAt: now}
	require.NoError(t, gdb.Create(&ch).Error)

	return svc
}

func TestStartPlan(t *testing.T) {
	t.Run("creates_pending_task", func(t *testing.T) {
		svc := newTestTaskService(t)
		view, err := svc.StartPlan(context.Background(), workflows.PlanInput{BookID: 1, ChapterNo: 1})
		require.NoError(t, err)
		require.Equal(t, shared.WorkflowTaskStatusPending, view.Status)
		require.Equal(t, "plan", view.WorkflowType)
		require.Equal(t, int64(1), view.BookID)
		require.Equal(t, 1, view.ChapterNo)
	})

	t.Run("rejects_duplicate", func(t *testing.T) {
		svc := newTestTaskService(t)
		_, err := svc.StartPlan(context.Background(), workflows.PlanInput{BookID: 1, ChapterNo: 1})
		require.NoError(t, err)
		_, err = svc.StartPlan(context.Background(), workflows.PlanInput{BookID: 1, ChapterNo: 1})
		require.Error(t, err)
		require.Contains(t, err.Error(), "already running")
	})

	t.Run("chapter_not_found", func(t *testing.T) {
		svc := newTestTaskService(t)
		_, err := svc.StartPlan(context.Background(), workflows.PlanInput{BookID: 1, ChapterNo: 999})
		require.Error(t, err)
		require.Contains(t, err.Error(), "not found")
	})
}

func TestGet(t *testing.T) {
	t.Run("found", func(t *testing.T) {
		svc := newTestTaskService(t)
		created, err := svc.StartPlan(context.Background(), workflows.PlanInput{BookID: 1, ChapterNo: 1})
		require.NoError(t, err)

		got, err := svc.Get(context.Background(), created.ID)
		require.NoError(t, err)
		require.Equal(t, created.ID, got.ID)
	})

	t.Run("not_found", func(t *testing.T) {
		svc := newTestTaskService(t)
		_, err := svc.Get(context.Background(), 99999)
		require.Error(t, err)
		require.Contains(t, err.Error(), "not found")
	})
}

func TestGetLatest(t *testing.T) {
	svc := newTestTaskService(t)

	t.Run("no_tasks", func(t *testing.T) {
		got, err := svc.GetLatest(context.Background(), 1, 1, "plan")
		require.NoError(t, err)
		require.Nil(t, got)
	})
}

func TestList(t *testing.T) {
	svc := newTestTaskService(t)

	t.Run("empty", func(t *testing.T) {
		list, err := svc.List(context.Background(), 1, 1, 50)
		require.NoError(t, err)
		require.Empty(t, list)
	})

	t.Run("returns_ordered", func(t *testing.T) {
		_, err := svc.StartPlan(context.Background(), workflows.PlanInput{BookID: 1, ChapterNo: 1})
		require.NoError(t, err)

		list, err := svc.List(context.Background(), 1, 1, 50)
		require.NoError(t, err)
		require.Len(t, list, 1)
	})
}

func TestTerminate(t *testing.T) {
	t.Run("pending_task", func(t *testing.T) {
		svc := newTestTaskService(t)
		created, err := svc.StartPlan(context.Background(), workflows.PlanInput{BookID: 1, ChapterNo: 1})
		require.NoError(t, err)

		terminated, err := svc.Terminate(context.Background(), created.ID)
		require.NoError(t, err)
		require.Equal(t, shared.WorkflowTaskStatusFailed, terminated.Status)
	})

	t.Run("not_found", func(t *testing.T) {
		svc := newTestTaskService(t)
		_, err := svc.Terminate(context.Background(), 99999)
		require.Error(t, err)
	})
}

func TestRecoverInterrupted(t *testing.T) {
	svc := newTestTaskService(t)

	t.Run("no_interrupted_tasks", func(t *testing.T) {
		count, err := svc.RecoverInterrupted(context.Background())
		require.NoError(t, err)
		require.Equal(t, int64(0), count)
	})
}
