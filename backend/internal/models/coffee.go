package models

import (
	"time"

	"github.com/google/uuid"
)

type RoastLevel string

const (
	RoastLevelLight      RoastLevel = "Light"
	RoastLevelMedium     RoastLevel = "Medium"
	RoastLevelMediumDark RoastLevel = "Medium-Dark"
	RoastLevelDark       RoastLevel = "Dark"
)

func (r RoastLevel) IsValid() bool {
	switch r {
	case RoastLevelLight, RoastLevelMedium, RoastLevelMediumDark, RoastLevelDark:
		return true
	}
	return false
}

type Coffee struct {
	ID           uuid.UUID   `json:"id"`
	UserID       uuid.UUID   `json:"user_id"`
	Roaster      string      `json:"roaster"`
	Name         string      `json:"name"`
	Country      *string     `json:"country"`
	Region       *string     `json:"region"`
	Process      *string     `json:"process"`
	RoastLevel   *RoastLevel `json:"roast_level"`
	TastingNotes *string     `json:"tasting_notes"`
	RoastDate    *time.Time  `json:"roast_date"`
	PurchaseDate *time.Time  `json:"purchase_date"`
	Notes        *string     `json:"notes"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

type CoffeeResponse struct {
	ID              uuid.UUID   `json:"id"`
	Roaster         string      `json:"roaster"`
	Name            string      `json:"name"`
	Country         *string     `json:"country,omitempty"`
	Region          *string     `json:"region,omitempty"`
	Process         *string     `json:"process,omitempty"`
	RoastLevel      *RoastLevel `json:"roast_level,omitempty"`
	TastingNotes    *string     `json:"tasting_notes,omitempty"`
	RoastDate       *time.Time  `json:"roast_date,omitempty"`
	PurchaseDate    *time.Time  `json:"purchase_date,omitempty"`
	Notes           *string     `json:"notes,omitempty"`
	DaysSinceRoast  *int        `json:"days_since_roast,omitempty"`
	ExperimentCount int         `json:"experiment_count"`
	LastBrewed      *time.Time  `json:"last_brewed,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
}

func (c *Coffee) ToResponse(experimentCount int, lastBrewed *time.Time) *CoffeeResponse {
	resp := &CoffeeResponse{
		ID:              c.ID,
		Roaster:         c.Roaster,
		Name:            c.Name,
		Country:         c.Country,
		Region:          c.Region,
		Process:         c.Process,
		RoastLevel:      c.RoastLevel,
		TastingNotes:    c.TastingNotes,
		RoastDate:       c.RoastDate,
		PurchaseDate:    c.PurchaseDate,
		Notes:           c.Notes,
		ExperimentCount: experimentCount,
		LastBrewed:      lastBrewed,
		CreatedAt:       c.CreatedAt,
		UpdatedAt:       c.UpdatedAt,
	}

	if c.RoastDate != nil {
		days := int(time.Since(*c.RoastDate).Hours() / 24)
		resp.DaysSinceRoast = &days
	}

	return resp
}
