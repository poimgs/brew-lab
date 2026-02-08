package brew

import (
	"context"
)

type ListParams struct {
	Page     int
	PerPage  int
	Sort     string
	CoffeeID string
	ScoreGTE *int
	ScoreLTE *int
	HasTDS   *bool
	DateFrom *string
	DateTo   *string
}

type Repository interface {
	List(ctx context.Context, userID string, params ListParams) ([]Brew, int, error)
	Recent(ctx context.Context, userID string, limit int) ([]Brew, error)
	GetByID(ctx context.Context, userID, id string) (*Brew, error)
	Create(ctx context.Context, userID string, req CreateRequest) (*Brew, error)
	Update(ctx context.Context, userID, id string, req UpdateRequest) (*Brew, error)
	Delete(ctx context.Context, userID, id string) error
	GetReference(ctx context.Context, userID, coffeeID string) (*Brew, string, error)
}
