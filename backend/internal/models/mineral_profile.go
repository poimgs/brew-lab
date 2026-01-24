package models

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
}

type MineralProfileResponse struct {
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
}

func (m *MineralProfile) ToResponse() *MineralProfileResponse {
	return &MineralProfileResponse{
		ID:           m.ID,
		Name:         m.Name,
		Brand:        m.Brand,
		Hardness:     m.Hardness,
		Alkalinity:   m.Alkalinity,
		Magnesium:    m.Magnesium,
		Calcium:      m.Calcium,
		Potassium:    m.Potassium,
		Sodium:       m.Sodium,
		Chloride:     m.Chloride,
		Sulfate:      m.Sulfate,
		Bicarbonate:  m.Bicarbonate,
		TypicalDose:  m.TypicalDose,
		TasteEffects: m.TasteEffects,
		CreatedAt:    m.CreatedAt,
	}
}

type MineralProfileListResponse struct {
	MineralProfiles []MineralProfileResponse `json:"mineral_profiles"`
	Total           int                      `json:"total"`
}
