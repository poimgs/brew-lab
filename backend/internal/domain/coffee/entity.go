package coffee

import (
	"time"
)

type Coffee struct {
	ID              string     `json:"id"`
	UserID          string     `json:"-"`
	Roaster         string     `json:"roaster"`
	Name            string     `json:"name"`
	Country         *string    `json:"country"`
	Region          *string    `json:"region"`
	Farm            *string    `json:"farm"`
	Varietal        *string    `json:"varietal"`
	Elevation       *string    `json:"elevation"`
	Process         *string    `json:"process"`
	RoastLevel      *string    `json:"roast_level"`
	TastingNotes    *string    `json:"tasting_notes"`
	RoastDate       *string    `json:"roast_date"`
	Notes           *string    `json:"notes"`
	ReferenceBrewID *string    `json:"reference_brew_id"`
	ArchivedAt      *time.Time `json:"archived_at"`
	BrewCount       int        `json:"brew_count"`
	LastBrewed      *time.Time `json:"last_brewed"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type CreateRequest struct {
	Roaster      string  `json:"roaster"`
	Name         string  `json:"name"`
	Country      *string `json:"country"`
	Region       *string `json:"region"`
	Farm         *string `json:"farm"`
	Varietal     *string `json:"varietal"`
	Elevation    *string `json:"elevation"`
	Process      *string `json:"process"`
	RoastLevel   *string `json:"roast_level"`
	TastingNotes *string `json:"tasting_notes"`
	RoastDate    *string `json:"roast_date"`
	Notes        *string `json:"notes"`
}

type UpdateRequest struct {
	Roaster      string  `json:"roaster"`
	Name         string  `json:"name"`
	Country      *string `json:"country"`
	Region       *string `json:"region"`
	Farm         *string `json:"farm"`
	Varietal     *string `json:"varietal"`
	Elevation    *string `json:"elevation"`
	Process      *string `json:"process"`
	RoastLevel   *string `json:"roast_level"`
	TastingNotes *string `json:"tasting_notes"`
	RoastDate    *string `json:"roast_date"`
	Notes        *string `json:"notes"`
}

type SetReferenceRequest struct {
	BrewID *string `json:"brew_id"`
}

type SuggestionsResponse struct {
	Items []string `json:"items"`
}
