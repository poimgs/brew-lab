package models

import (
	"time"

	"github.com/google/uuid"
)

type UserDefault struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	FieldName  string    `json:"field_name"`
	FieldValue string    `json:"field_value"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type UserDefaultResponse struct {
	FieldName  string `json:"field_name"`
	FieldValue string `json:"field_value"`
}

func (d *UserDefault) ToResponse() *UserDefaultResponse {
	return &UserDefaultResponse{
		FieldName:  d.FieldName,
		FieldValue: d.FieldValue,
	}
}

// UserDefaultsResponse is a map of field_name to field_value
type UserDefaultsResponse map[string]string

type SetUserDefaultsInput struct {
	Defaults map[string]string `json:"defaults" validate:"required,min=1,dive,keys,required,endkeys,required"`
}

// ValidDefaultFields defines which experiment fields can have defaults
var ValidDefaultFields = map[string]bool{
	"grind_size":        true,
	"water_temperature": true,
	"filter_type":       true,
	"coffee_weight":     true,
	"water_weight":      true,
	"ratio":             true,
	"bloom_water":       true,
	"bloom_time":        true,
}

func IsValidDefaultField(field string) bool {
	return ValidDefaultFields[field]
}
