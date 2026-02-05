package mineral_profile

import (
	"time"

	"github.com/google/uuid"
)

type MineralProfile struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Brand        *string   `json:"brand,omitempty"`
	Hardness     *float64  `json:"hardness,omitempty"`
	Alkalinity   *float64  `json:"alkalinity,omitempty"`
	Magnesium    *float64  `json:"magnesium,omitempty"`
	Calcium      *float64  `json:"calcium,omitempty"`
	Potassium    *float64  `json:"potassium,omitempty"`
	Sodium       *float64  `json:"sodium,omitempty"`
	Chloride     *float64  `json:"chloride,omitempty"`
	Sulfate      *float64  `json:"sulfate,omitempty"`
	Bicarbonate  *float64  `json:"bicarbonate,omitempty"`
	TypicalDose  *string   `json:"typical_dose,omitempty"`
	TasteEffects *string   `json:"taste_effects,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type ListMineralProfilesResult struct {
	Items []MineralProfile `json:"items"`
}
