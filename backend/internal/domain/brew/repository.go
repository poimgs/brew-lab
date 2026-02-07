package brew

import (
	"context"

	"github.com/google/uuid"
)

// Repository defines the interface for brew data access
type Repository interface {
	// Create creates a new brew with optional pours
	Create(ctx context.Context, userID uuid.UUID, input CreateBrewInput) (*Brew, error)

	// GetByID retrieves an brew by ID with nested data (coffee, filter paper, pours)
	GetByID(ctx context.Context, userID, brewID uuid.UUID) (*Brew, error)

	// GetByIDs retrieves multiple brews by their IDs
	GetByIDs(ctx context.Context, userID uuid.UUID, brewIDs []uuid.UUID) ([]Brew, error)

	// List retrieves brews with filtering, sorting, and pagination
	List(ctx context.Context, userID uuid.UUID, params ListBrewsParams) (*ListBrewsResult, error)

	// ListAll retrieves all brews matching filters (no pagination) for export
	ListAll(ctx context.Context, userID uuid.UUID, params ListBrewsParams) ([]Brew, error)

	// Update updates an brew and optionally replaces pours
	Update(ctx context.Context, userID, brewID uuid.UUID, input UpdateBrewInput) (*Brew, error)

	// Delete permanently deletes an brew and its pours
	Delete(ctx context.Context, userID, brewID uuid.UUID) error

	// CopyAsTemplate creates a new brew by copying parameters from an existing one
	// Clears overall_notes, overall_score, improvement_notes, and all sensory data
	CopyAsTemplate(ctx context.Context, userID, brewID uuid.UUID) (*Brew, error)
}
