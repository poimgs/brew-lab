package filterpaper

import (
	"context"
)

type Repository interface {
	List(ctx context.Context, userID string, page, perPage int, sort string) ([]FilterPaper, int, error)
	GetByID(ctx context.Context, userID, id string) (*FilterPaper, error)
	Create(ctx context.Context, userID string, req CreateRequest) (*FilterPaper, error)
	Update(ctx context.Context, userID, id string, req UpdateRequest) (*FilterPaper, error)
	SoftDelete(ctx context.Context, userID, id string) error
}
