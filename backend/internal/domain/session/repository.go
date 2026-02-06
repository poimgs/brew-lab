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
	LinkExperiments(ctx context.Context, userID, sessionID uuid.UUID, experimentIDs []uuid.UUID) (*Session, error)
	UnlinkExperiment(ctx context.Context, userID, sessionID, experimentID uuid.UUID) error
}
