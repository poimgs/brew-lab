package coffee

import (
	"time"

	"github.com/google/uuid"
)

type Coffee struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	Roaster      string     `json:"roaster"`
	Name         string     `json:"name"`
	Country      *string    `json:"country,omitempty"`
	Region       *string    `json:"region,omitempty"`
	Process      *string    `json:"process,omitempty"`
	RoastLevel   *string    `json:"roast_level,omitempty"`
	TastingNotes *string    `json:"tasting_notes,omitempty"`
	RoastDate    *time.Time `json:"roast_date,omitempty"`
	PurchaseDate *time.Time `json:"purchase_date,omitempty"`
	Notes        *string    `json:"notes,omitempty"`
	ArchivedAt   *time.Time `json:"archived_at,omitempty"`
	DeletedAt    *time.Time `json:"-"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	// Computed properties (read-only, not stored in DB)
	DaysOffRoast    *int       `json:"days_off_roast,omitempty"`
	ExperimentCount int        `json:"experiment_count"`
	LastBrewed      *time.Time `json:"last_brewed,omitempty"`
}

type CreateCoffeeInput struct {
	Roaster      string     `json:"roaster"`
	Name         string     `json:"name"`
	Country      *string    `json:"country,omitempty"`
	Region       *string    `json:"region,omitempty"`
	Process      *string    `json:"process,omitempty"`
	RoastLevel   *string    `json:"roast_level,omitempty"`
	TastingNotes *string    `json:"tasting_notes,omitempty"`
	RoastDate    *time.Time `json:"roast_date,omitempty"`
	PurchaseDate *time.Time `json:"purchase_date,omitempty"`
	Notes        *string    `json:"notes,omitempty"`
}

type UpdateCoffeeInput struct {
	Roaster      *string    `json:"roaster,omitempty"`
	Name         *string    `json:"name,omitempty"`
	Country      *string    `json:"country,omitempty"`
	Region       *string    `json:"region,omitempty"`
	Process      *string    `json:"process,omitempty"`
	RoastLevel   *string    `json:"roast_level,omitempty"`
	TastingNotes *string    `json:"tasting_notes,omitempty"`
	RoastDate    *time.Time `json:"roast_date,omitempty"`
	PurchaseDate *time.Time `json:"purchase_date,omitempty"`
	Notes        *string    `json:"notes,omitempty"`
}

type ListCoffeesParams struct {
	Page            int
	PerPage         int
	Sort            string
	Roaster         string
	Country         string
	Process         string
	Search          string
	IncludeArchived bool
	IncludeDeleted  bool
}

type ListCoffeesResult struct {
	Items      []Coffee   `json:"items"`
	Pagination Pagination `json:"pagination"`
}

type Pagination struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

func (p *ListCoffeesParams) SetDefaults() {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 {
		p.PerPage = 20
	}
	if p.PerPage > 100 {
		p.PerPage = 100
	}
	if p.Sort == "" {
		p.Sort = "-created_at"
	}
}

// CalculateDaysOffRoast computes days since roast date
func (c *Coffee) CalculateDaysOffRoast() {
	if c.RoastDate == nil {
		c.DaysOffRoast = nil
		return
	}
	days := int(time.Since(*c.RoastDate).Hours() / 24)
	c.DaysOffRoast = &days
}
