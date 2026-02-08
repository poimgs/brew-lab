package coffee

import (
	"context"
)

type ListParams struct {
	Page         int
	PerPage      int
	Search       string
	Roaster      string
	Country      string
	Process      string
	ArchivedOnly bool
}

type Repository interface {
	List(ctx context.Context, userID string, params ListParams) ([]Coffee, int, error)
	GetByID(ctx context.Context, userID, id string) (*Coffee, error)
	Create(ctx context.Context, userID string, req CreateRequest) (*Coffee, error)
	Update(ctx context.Context, userID, id string, req UpdateRequest) (*Coffee, error)
	Delete(ctx context.Context, userID, id string) error
	Archive(ctx context.Context, userID, id string) (*Coffee, error)
	Unarchive(ctx context.Context, userID, id string) (*Coffee, error)
	SetReferenceBrew(ctx context.Context, userID, id string, brewID *string) (*Coffee, error)
	Suggestions(ctx context.Context, userID, field, query string) ([]string, error)
}
