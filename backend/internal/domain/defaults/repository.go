package defaults

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	// GetAll returns all defaults for a user as a map
	GetAll(ctx context.Context, userID uuid.UUID) (Defaults, error)

	// Upsert updates or inserts defaults for a user (merges with existing)
	Upsert(ctx context.Context, userID uuid.UUID, input UpdateDefaultsInput) (Defaults, error)

	// DeleteField removes a single default field for a user
	DeleteField(ctx context.Context, userID uuid.UUID, fieldName string) error
}
