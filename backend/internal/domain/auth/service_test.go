package auth

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"myai-novel-go/internal/config"
	"myai-novel-go/internal/db"
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

func newTestService(t *testing.T) *Service {
	t.Helper()
	gdb := openTestDB(t)
	cfg := &config.Config{
		AuthSessionSecret:   "test-secret-that-is-long-enough-32chars!!",
		AuthSessionTTLHours: 24,
	}
	return NewService(gdb, cfg)
}

func TestRegister(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		svc := newTestService(t)
		res, err := svc.Register(context.Background(), "user@example.com", "password123", "Test User")
		require.NoError(t, err)
		require.NotEmpty(t, res.SessionToken)
		require.Equal(t, "user@example.com", res.User.Email)
		require.Equal(t, "Test User", res.User.DisplayName)
		require.Equal(t, "active", res.User.Status)
	})

	t.Run("duplicate_email", func(t *testing.T) {
		svc := newTestService(t)
		_, err := svc.Register(context.Background(), "dup@example.com", "password123", "User A")
		require.NoError(t, err)
		_, err = svc.Register(context.Background(), "dup@example.com", "password123", "User B")
		require.Error(t, err)
		require.Contains(t, err.Error(), "already exists")
	})

	t.Run("empty_email", func(t *testing.T) {
		svc := newTestService(t)
		_, err := svc.Register(context.Background(), "", "password123", "Name")
		require.Error(t, err)
		require.Contains(t, err.Error(), "Email")
	})

	t.Run("empty_display_name", func(t *testing.T) {
		svc := newTestService(t)
		_, err := svc.Register(context.Background(), "a@b.com", "password123", "")
		require.Error(t, err)
		require.Contains(t, err.Error(), "Display name")
	})

	t.Run("short_password", func(t *testing.T) {
		svc := newTestService(t)
		_, err := svc.Register(context.Background(), "a@b.com", "short", "Name")
		require.Error(t, err)
		require.Contains(t, err.Error(), "at least 8")
	})

	t.Run("email_normalized", func(t *testing.T) {
		svc := newTestService(t)
		_, err := svc.Register(context.Background(), "  USER@EXAMPLE.COM  ", "password123", "Name")
		require.NoError(t, err)
		res, err := svc.Login(context.Background(), "user@example.com", "password123")
		require.NoError(t, err)
		require.Equal(t, "user@example.com", res.User.Email)
	})
}

func TestLogin(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		svc := newTestService(t)
		_, err := svc.Register(context.Background(), "login@test.com", "password123", "Name")
		require.NoError(t, err)
		res, err := svc.Login(context.Background(), "login@test.com", "password123")
		require.NoError(t, err)
		require.NotEmpty(t, res.SessionToken)
	})

	t.Run("wrong_password", func(t *testing.T) {
		svc := newTestService(t)
		_, err := svc.Register(context.Background(), "login2@test.com", "password123", "Name")
		require.NoError(t, err)
		_, err = svc.Login(context.Background(), "login2@test.com", "wrongpass")
		require.Error(t, err)
		require.Contains(t, err.Error(), "Invalid")
	})

	t.Run("nonexistent_user", func(t *testing.T) {
		svc := newTestService(t)
		_, err := svc.Login(context.Background(), "noone@test.com", "password123")
		require.Error(t, err)
		require.Contains(t, err.Error(), "Invalid")
	})
}

func TestSignVerifySessionToken(t *testing.T) {
	svc := newTestService(t)

	t.Run("roundtrip", func(t *testing.T) {
		signed := svc.SignSessionToken("mytoken123")
		require.Contains(t, signed, "mytoken123.")
		verified := svc.VerifySignedSessionToken(signed)
		require.Equal(t, "mytoken123", verified)
	})

	t.Run("tampered_signature", func(t *testing.T) {
		signed := svc.SignSessionToken("mytoken")
		tampered := signed + "x"
		require.Empty(t, svc.VerifySignedSessionToken(tampered))
	})

	t.Run("empty_value", func(t *testing.T) {
		require.Empty(t, svc.VerifySignedSessionToken(""))
	})

	t.Run("no_dot", func(t *testing.T) {
		require.Empty(t, svc.VerifySignedSessionToken("nodothere"))
	})
}

func TestGetSessionUser(t *testing.T) {
	t.Run("valid_token", func(t *testing.T) {
		svc := newTestService(t)
		reg, err := svc.Register(context.Background(), "session@test.com", "password123", "Name")
		require.NoError(t, err)
		user, err := svc.GetSessionUser(context.Background(), reg.SessionToken)
		require.NoError(t, err)
		require.NotNil(t, user)
		require.Equal(t, "session@test.com", user.Email)
	})

	t.Run("empty_token", func(t *testing.T) {
		svc := newTestService(t)
		user, err := svc.GetSessionUser(context.Background(), "")
		require.NoError(t, err)
		require.Nil(t, user)
	})

	t.Run("invalid_token", func(t *testing.T) {
		svc := newTestService(t)
		user, err := svc.GetSessionUser(context.Background(), "nonexistent")
		require.NoError(t, err)
		require.Nil(t, user)
	})
}

func TestLogout(t *testing.T) {
	svc := newTestService(t)
	reg, err := svc.Register(context.Background(), "logout@test.com", "password123", "Name")
	require.NoError(t, err)

	require.NoError(t, svc.Logout(context.Background(), reg.SessionToken))

	user, err := svc.GetSessionUser(context.Background(), reg.SessionToken)
	require.NoError(t, err)
	require.Nil(t, user)
}
