package defaults

import (
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
}

// IsValidField checks if a field name is supported for defaults
func IsValidField(field string) bool {
	return SupportedFields[field]
}

// UpdateDefaultsInput represents the request to update defaults
type UpdateDefaultsInput map[string]string
