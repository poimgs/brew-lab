package defaults

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// UserDefault represents a single default value for a user
type UserDefault struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"user_id"`
	FieldName    string    `json:"field_name"`
	DefaultValue string    `json:"default_value"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Defaults represents the map of all user defaults
type Defaults map[string]string

// PourDefault represents a single pour template in user defaults
type PourDefault struct {
	WaterAmount *float64 `json:"water_amount,omitempty"`
	PourStyle   *string  `json:"pour_style,omitempty"`
	Notes       *string  `json:"notes,omitempty"`
}

// ValidPourStyles lists acceptable pour style values
var ValidPourStyles = map[string]bool{
	"circular": true,
	"center":   true,
	"pulse":    true,
}

// ValidatePourDefaults validates a JSON string representing pour defaults
func ValidatePourDefaults(value string) error {
	var pours []PourDefault
	if err := json.Unmarshal([]byte(value), &pours); err != nil {
		return fmt.Errorf("pour_defaults must be a valid JSON array of pour objects")
	}
	if len(pours) == 0 {
		return fmt.Errorf("pour_defaults must contain at least one pour")
	}
	if len(pours) > 10 {
		return fmt.Errorf("pour_defaults cannot have more than 10 pours")
	}
	for i, p := range pours {
		if p.WaterAmount != nil && *p.WaterAmount <= 0 {
			return fmt.Errorf("pour %d: water_amount must be positive", i+1)
		}
		if p.PourStyle != nil && *p.PourStyle != "" && !ValidPourStyles[*p.PourStyle] {
			return fmt.Errorf("pour %d: invalid pour_style '%s'", i+1, *p.PourStyle)
		}
	}
	return nil
}

// SupportedFields lists all fields that can have defaults
var SupportedFields = map[string]bool{
	"coffee_weight":      true,
	"water_weight":       true,
	"ratio":              true,
	"grind_size":         true,
	"water_temperature":  true,
	"filter_paper_id":    true,
	"bloom_water":        true,
	"bloom_time":         true,
	"pour_defaults":      true,
}

// IsValidField checks if a field name is supported for defaults
func IsValidField(field string) bool {
	return SupportedFields[field]
}

// UpdateDefaultsInput represents the request to update defaults
type UpdateDefaultsInput map[string]string
