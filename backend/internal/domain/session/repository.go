package session

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	Create(ctx context.Context, userID uuid.UUID, input CreateSessionInput) (*Session, error)
	GetByID(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error)
	List(ctx context.Context, userID uuid.UUID, params ListSessionsParams) (*ListSessionsResult, error)
	Update(ctx context.Context, userID, sessionID uuid.UUID, input UpdateSessionInput) (*Session, error)
	Delete(ctx context.Context, userID, sessionID uuid.UUID) error
	LinkBrews(ctx context.Context, userID, sessionID uuid.UUID, brewIDs []uuid.UUID) (*Session, error)
	UnlinkBrew(ctx context.Context, userID, sessionID, brewID uuid.UUID) error
}
