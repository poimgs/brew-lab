package models

import (
	"time"

	"github.com/google/uuid"
)

// ExperimentMappingDismissal represents a dismissed mapping for an experiment
type ExperimentMappingDismissal struct {
	ID           uuid.UUID `json:"id"`
	ExperimentID uuid.UUID `json:"experiment_id"`
	MappingID    uuid.UUID `json:"mapping_id"`
	UserID       uuid.UUID `json:"user_id"`
	DismissedAt  time.Time `json:"dismissed_at"`
}

// RecommendationResponse extends EffectMappingResponse with recommendation-specific fields
type RecommendationResponse struct {
	ID              uuid.UUID         `json:"id"`
	Name            string            `json:"name"`
	Variable        InputVariable     `json:"variable"`
	Direction       MappingDirection  `json:"direction"`
	TickDescription string            `json:"tick_description"`
	Source          *string           `json:"source,omitempty"`
	Notes           *string           `json:"notes,omitempty"`
	Active          bool              `json:"active"`
	Effects         []*EffectResponse `json:"effects"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
	// Recommendation-specific fields
	HelpsCount  int      `json:"helps_count"`
	HelpsGaps   []string `json:"helps_gaps"`
	HasConflict bool     `json:"has_conflict"`
	Score       int      `json:"score"`
	IsDismissed bool     `json:"is_dismissed"`
}

// ExperimentWithGapsResponse is an experiment with gap and recommendation count information
type ExperimentWithGapsResponse struct {
	ID                  uuid.UUID       `json:"id"`
	CoffeeID            *uuid.UUID      `json:"coffee_id,omitempty"`
	BrewDate            time.Time       `json:"brew_date"`
	OverallNotes        string          `json:"overall_notes"`
	OverallScore        *int            `json:"overall_score,omitempty"`
	Coffee              *CoffeeResponse `json:"coffee,omitempty"`
	Gaps                *SensoryGaps    `json:"gaps,omitempty"`
	ActiveGapCount      int             `json:"active_gap_count"`
	RecommendationCount int             `json:"recommendation_count"`
	CreatedAt           time.Time       `json:"created_at"`
}

// TryMappingInput is the input for creating an experiment from a mapping recommendation
type TryMappingInput struct {
	MappingID uuid.UUID `json:"mapping_id" validate:"required"`
	Notes     *string   `json:"notes"`
}

// DismissMappingInput is the input for dismissing a mapping
type DismissMappingInput struct {
	MappingID uuid.UUID `json:"mapping_id" validate:"required"`
}

// GetRecommendationsInput is the input for getting recommendations
type GetRecommendationsInput struct {
	ExperimentID uuid.UUID `json:"experiment_id" validate:"required"`
}

// RecommendationsResponse contains the list of recommendations
type RecommendationsResponse struct {
	Recommendations []*RecommendationResponse `json:"recommendations"`
	ExperimentID    uuid.UUID                 `json:"experiment_id"`
	TotalCount      int                       `json:"total_count"`
}

// DismissedMappingsResponse contains the list of dismissed mapping IDs
type DismissedMappingsResponse struct {
	MappingIDs []uuid.UUID `json:"mapping_ids"`
}

// ExperimentsWithGapsResponse contains the paginated list of experiments with gaps
type ExperimentsWithGapsResponse struct {
	Experiments []*ExperimentWithGapsResponse `json:"experiments"`
	TotalCount  int                           `json:"total_count"`
	Page        int                           `json:"page"`
	PageSize    int                           `json:"page_size"`
	TotalPages  int                           `json:"total_pages"`
}

// ExperimentsWithGapsParams defines parameters for listing experiments with gaps
type ExperimentsWithGapsParams struct {
	UserID   uuid.UUID
	Page     int
	PageSize int
}
