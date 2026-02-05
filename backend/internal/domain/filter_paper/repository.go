package filter_paper

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	Create(ctx context.Context, userID uuid.UUID, input CreateFilterPaperInput) (*FilterPaper, error)
	GetByID(ctx context.Context, userID, filterPaperID uuid.UUID) (*FilterPaper, error)
	List(ctx context.Context, userID uuid.UUID, params ListFilterPapersParams) (*ListFilterPapersResult, error)
	Update(ctx context.Context, userID, filterPaperID uuid.UUID, input UpdateFilterPaperInput) (*FilterPaper, error)
	Delete(ctx context.Context, userID, filterPaperID uuid.UUID) error
}
