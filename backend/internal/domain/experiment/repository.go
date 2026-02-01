package experiment

import (
	"context"

	"github.com/google/uuid"
)

// Repository defines the interface for experiment data access
type Repository interface {
	// Create creates a new experiment with optional pours
	Create(ctx context.Context, userID uuid.UUID, input CreateExperimentInput) (*Experiment, error)

	// GetByID retrieves an experiment by ID with nested data (coffee, filter paper, pours)
	GetByID(ctx context.Context, userID, experimentID uuid.UUID) (*Experiment, error)

	// GetByIDs retrieves multiple experiments by their IDs
	GetByIDs(ctx context.Context, userID uuid.UUID, experimentIDs []uuid.UUID) ([]Experiment, error)

	// List retrieves experiments with filtering, sorting, and pagination
	List(ctx context.Context, userID uuid.UUID, params ListExperimentsParams) (*ListExperimentsResult, error)

	// ListAll retrieves all experiments matching filters (no pagination) for export
	ListAll(ctx context.Context, userID uuid.UUID, params ListExperimentsParams) ([]Experiment, error)

	// Update updates an experiment and optionally replaces pours
	Update(ctx context.Context, userID, experimentID uuid.UUID, input UpdateExperimentInput) (*Experiment, error)

	// Delete permanently deletes an experiment and its pours
	Delete(ctx context.Context, userID, experimentID uuid.UUID) error

	// CopyAsTemplate creates a new experiment by copying parameters from an existing one
	// Clears overall_notes, overall_score, improvement_notes, and all sensory data
	CopyAsTemplate(ctx context.Context, userID, experimentID uuid.UUID) (*Experiment, error)
}
