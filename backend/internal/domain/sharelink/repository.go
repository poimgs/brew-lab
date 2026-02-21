package sharelink

import (
	"context"
	"time"
)

type Repository interface {
	GetShareToken(ctx context.Context, userID string) (*string, *time.Time, error)
	SetShareToken(ctx context.Context, userID, token string) (*time.Time, error)
	ClearShareToken(ctx context.Context, userID string) error
	GetUserIDByToken(ctx context.Context, token string) (*string, error)
	GetSharedCoffees(ctx context.Context, userID string) ([]ShareCoffee, error)
}
