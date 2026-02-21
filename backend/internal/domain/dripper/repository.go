package dripper

import (
	"context"
)

type Repository interface {
	List(ctx context.Context, userID string, page, perPage int, sort string) ([]Dripper, int, error)
	GetByID(ctx context.Context, userID, id string) (*Dripper, error)
	Create(ctx context.Context, userID string, req CreateRequest) (*Dripper, error)
	Update(ctx context.Context, userID, id string, req UpdateRequest) (*Dripper, error)
	SoftDelete(ctx context.Context, userID, id string) error
}
