package coffee_goal

import (
	"time"

	"github.com/google/uuid"
)

// CoffeeGoal represents target outcomes for a coffee
type CoffeeGoal struct {
	ID                  uuid.UUID `json:"id"`
	CoffeeID            uuid.UUID `json:"coffee_id"`
	UserID              uuid.UUID `json:"user_id"`
	TDS                 *float64  `json:"tds,omitempty"`
	ExtractionYield     *float64  `json:"extraction_yield,omitempty"`
	AromaIntensity       *int      `json:"aroma_intensity,omitempty"`
	SweetnessIntensity   *int      `json:"sweetness_intensity,omitempty"`
	BodyIntensity        *int      `json:"body_intensity,omitempty"`
	FlavorIntensity      *int      `json:"flavor_intensity,omitempty"`
	BrightnessIntensity  *int      `json:"brightness_intensity,omitempty"`
	CleanlinessIntensity *int      `json:"cleanliness_intensity,omitempty"`
	ComplexityIntensity  *int      `json:"complexity_intensity,omitempty"`
	BalanceIntensity     *int      `json:"balance_intensity,omitempty"`
	AftertasteIntensity  *int      `json:"aftertaste_intensity,omitempty"`
	OverallScore        *int      `json:"overall_score,omitempty"`
	Notes               *string   `json:"notes,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// UpsertInput is the input for creating or updating coffee goals
type UpsertInput struct {
	TDS                 *float64 `json:"tds,omitempty"`
	ExtractionYield     *float64 `json:"extraction_yield,omitempty"`
	AromaIntensity       *int     `json:"aroma_intensity,omitempty"`
	SweetnessIntensity   *int     `json:"sweetness_intensity,omitempty"`
	BodyIntensity        *int     `json:"body_intensity,omitempty"`
	FlavorIntensity      *int     `json:"flavor_intensity,omitempty"`
	BrightnessIntensity  *int     `json:"brightness_intensity,omitempty"`
	CleanlinessIntensity *int     `json:"cleanliness_intensity,omitempty"`
	ComplexityIntensity  *int     `json:"complexity_intensity,omitempty"`
	BalanceIntensity     *int     `json:"balance_intensity,omitempty"`
	AftertasteIntensity  *int     `json:"aftertaste_intensity,omitempty"`
	OverallScore        *int     `json:"overall_score,omitempty"`
	Notes               *string  `json:"notes,omitempty"`
}

// ValidateIntensity checks if an intensity value is within 1-10 range
func ValidateIntensity(value *int, fieldName string) error {
	if value != nil && (*value < 1 || *value > 10) {
		return &ValidationError{Field: fieldName, Message: "must be between 1 and 10"}
	}
	return nil
}

// ValidationError represents a field validation error
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Field + ": " + e.Message
}
