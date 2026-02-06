package session

import (
	"time"

	"github.com/google/uuid"
)

// Session represents a group of related experiments testing a variable
type Session struct {
	ID             uuid.UUID `json:"id"`
	UserID         uuid.UUID `json:"user_id"`
	CoffeeID       uuid.UUID `json:"coffee_id"`
	Name           string    `json:"name"`
	VariableTested string    `json:"variable_tested"`
	Hypothesis     *string   `json:"hypothesis,omitempty"`
	Conclusion     *string   `json:"conclusion,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	// Computed properties
	ExperimentCount int `json:"experiment_count"`

	// Nested data (populated on GetByID)
	Experiments []ExperimentSummary `json:"experiments,omitempty"`
}

// ExperimentSummary is a compact experiment representation for session detail
type ExperimentSummary struct {
	ID           uuid.UUID `json:"id"`
	BrewDate     time.Time `json:"brew_date"`
	GrindSize    *float64  `json:"grind_size,omitempty"`
	OverallScore *int      `json:"overall_score,omitempty"`
	OverallNotes string    `json:"overall_notes"`
}

// CreateSessionInput is the input for creating a new session
type CreateSessionInput struct {
	CoffeeID       uuid.UUID   `json:"coffee_id"`
	Name           string      `json:"name"`
	VariableTested string      `json:"variable_tested"`
	Hypothesis     *string     `json:"hypothesis,omitempty"`
	ExperimentIDs  []uuid.UUID `json:"experiment_ids,omitempty"`
}

// UpdateSessionInput is the input for updating a session
type UpdateSessionInput struct {
	Name           *string `json:"name,omitempty"`
	VariableTested *string `json:"variable_tested,omitempty"`
	Hypothesis     *string `json:"hypothesis,omitempty"`
	Conclusion     *string `json:"conclusion,omitempty"`
}

// LinkExperimentsInput is the input for linking experiments to a session
type LinkExperimentsInput struct {
	ExperimentIDs []uuid.UUID `json:"experiment_ids"`
}

// ListSessionsParams defines query parameters for listing sessions
type ListSessionsParams struct {
	CoffeeID uuid.UUID
	Page     int
	PerPage  int
}

// SetDefaults sets default values for list parameters
func (p *ListSessionsParams) SetDefaults() {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 {
		p.PerPage = 20
	}
	if p.PerPage > 100 {
		p.PerPage = 100
	}
}

// ListSessionsResult is the paginated result for listing sessions
type ListSessionsResult struct {
	Items      []Session  `json:"items"`
	Pagination Pagination `json:"pagination"`
}

// Pagination holds pagination metadata
type Pagination struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}
