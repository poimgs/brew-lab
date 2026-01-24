package models

import (
	"time"

	"github.com/google/uuid"
)

// MappingDirection represents the direction of input variable change
type MappingDirection string

const (
	MappingDirectionIncrease MappingDirection = "increase"
	MappingDirectionDecrease MappingDirection = "decrease"
)

func (d MappingDirection) IsValid() bool {
	return d == MappingDirectionIncrease || d == MappingDirectionDecrease
}

// EffectDirection represents how an output variable changes
type EffectDirection string

const (
	EffectDirectionIncrease EffectDirection = "increase"
	EffectDirectionDecrease EffectDirection = "decrease"
	EffectDirectionNone     EffectDirection = "none"
)

func (d EffectDirection) IsValid() bool {
	return d == EffectDirectionIncrease || d == EffectDirectionDecrease || d == EffectDirectionNone
}

// Confidence represents certainty level for an effect
type Confidence string

const (
	ConfidenceLow    Confidence = "low"
	ConfidenceMedium Confidence = "medium"
	ConfidenceHigh   Confidence = "high"
)

func (c Confidence) IsValid() bool {
	return c == ConfidenceLow || c == ConfidenceMedium || c == ConfidenceHigh
}

// Valid input variables for effect mappings
var ValidInputVariables = map[string]bool{
	"temperature":      true,
	"ratio":            true,
	"grind_size":       true,
	"bloom_time":       true,
	"total_brew_time":  true,
	"coffee_weight":    true,
	"pour_count":       true,
	"pour_technique":   true,
	"filter_type":      true,
}

// Valid output variables (sensory outcomes)
var ValidOutputVariables = map[string]bool{
	"acidity":    true,
	"sweetness":  true,
	"bitterness": true,
	"body":       true,
	"aroma":      true,
	"aftertaste": true,
	"overall":    true,
}

// Effect represents a single sensory outcome change
type Effect struct {
	ID              uuid.UUID       `json:"id"`
	EffectMappingID uuid.UUID       `json:"effect_mapping_id"`
	OutputVariable  string          `json:"output_variable"`
	Direction       EffectDirection `json:"direction"`
	RangeMin        *float64        `json:"range_min,omitempty"`
	RangeMax        *float64        `json:"range_max,omitempty"`
	Confidence      Confidence      `json:"confidence"`
}

// EffectMapping represents a cause-to-effect relationship
type EffectMapping struct {
	ID              uuid.UUID        `json:"id"`
	UserID          uuid.UUID        `json:"user_id"`
	Name            string           `json:"name"`
	Variable        string           `json:"variable"`
	Direction       MappingDirection `json:"direction"`
	TickDescription string           `json:"tick_description"`
	Source          *string          `json:"source,omitempty"`
	Notes           *string          `json:"notes,omitempty"`
	Active          bool             `json:"active"`
	Effects         []Effect         `json:"effects"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

// EffectMappingResponse is the API response type
type EffectMappingResponse struct {
	ID              uuid.UUID        `json:"id"`
	Name            string           `json:"name"`
	Variable        string           `json:"variable"`
	Direction       MappingDirection `json:"direction"`
	TickDescription string           `json:"tick_description"`
	Effects         []EffectResponse `json:"effects"`
	Source          *string          `json:"source,omitempty"`
	Notes           *string          `json:"notes,omitempty"`
	Active          bool             `json:"active"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

// EffectResponse is the API response type for an effect
type EffectResponse struct {
	OutputVariable string          `json:"output_variable"`
	Direction      EffectDirection `json:"direction"`
	RangeMin       *float64        `json:"range_min,omitempty"`
	RangeMax       *float64        `json:"range_max,omitempty"`
	Confidence     Confidence      `json:"confidence"`
}

func (e *Effect) ToResponse() EffectResponse {
	return EffectResponse{
		OutputVariable: e.OutputVariable,
		Direction:      e.Direction,
		RangeMin:       e.RangeMin,
		RangeMax:       e.RangeMax,
		Confidence:     e.Confidence,
	}
}

func (m *EffectMapping) ToResponse() *EffectMappingResponse {
	effects := make([]EffectResponse, len(m.Effects))
	for i, e := range m.Effects {
		effects[i] = e.ToResponse()
	}

	return &EffectMappingResponse{
		ID:              m.ID,
		Name:            m.Name,
		Variable:        m.Variable,
		Direction:       m.Direction,
		TickDescription: m.TickDescription,
		Effects:         effects,
		Source:          m.Source,
		Notes:           m.Notes,
		Active:          m.Active,
		CreatedAt:       m.CreatedAt,
		UpdatedAt:       m.UpdatedAt,
	}
}
