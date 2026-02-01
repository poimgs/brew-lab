package mineral_profile

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	List(ctx context.Context) (*ListMineralProfilesResult, error)
	GetByID(ctx context.Context, id uuid.UUID) (*MineralProfile, error)
}
