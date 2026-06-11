package middleware

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestActorMayAccessBook(t *testing.T) {
	ownerID := int64(42)

	tests := []struct {
		name  string
		actor Actor
		owner *int64
		want  bool
	}{
		{"nil_owner_allows_anyone", Actor{Kind: ActorAnonymous}, nil, true},
		{"matching_user", Actor{Kind: ActorUser, UserID: 42}, &ownerID, true},
		{"different_user", Actor{Kind: ActorUser, UserID: 99}, &ownerID, false},
		{"anonymous_denied", Actor{Kind: ActorAnonymous}, &ownerID, false},
		{"system_always_allowed", Actor{Kind: ActorSystem}, &ownerID, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, ActorMayAccessBook(tt.actor, tt.owner))
		})
	}
}

func TestAnonymousActor(t *testing.T) {
	a := AnonymousActor()
	require.Equal(t, ActorAnonymous, a.Kind)
	require.Equal(t, int64(0), a.UserID)
}
