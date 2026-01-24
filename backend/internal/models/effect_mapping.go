package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Input variable types for effect mappings
type InputVariable string

const (
	InputVariableTemperature   InputVariable = "temperature"
	InputVariableRatio         InputVariable = "ratio"
	InputVariableGrindSize     InputVariable = "grind_size"
	InputVariableBloomTime     InputVariable = "bloom_time"
	InputVariableTotalBrewTime InputVariable = "total_brew_time"
	InputVariableCoffeeWeight  InputVariable = "coffee_weight"
	InputVariablePourCount     InputVariable = "pour_count"
	InputVariablePourTechnique InputVariable = "pour_technique"
	InputVariableFilterType    InputVariable = "filter_type"
)

func (v InputVariable) IsValid() bool {
	switch v {
	case InputVariableTemperature, InputVariableRatio, InputVariableGrindSize,
		InputVariableBloomTime, InputVariableTotalBrewTime, InputVariableCoffeeWeight,
		InputVariablePourCount, InputVariablePourTechnique, InputVariableFilterType:
		return true
	}
	return false
}

// Output variable types for effect mappings
type OutputVariable string

const (
	OutputVariableAcidity    OutputVariable = "acidity"
	OutputVariableSweetness  OutputVariable = "sweetness"
	OutputVariableBitterness OutputVariable = "bitterness"
	OutputVariableBody       OutputVariable = "body"
	OutputVariableAroma      OutputVariable = "aroma"
	OutputVariableAftertaste OutputVariable = "aftertaste"
	OutputVariableOverall    OutputVariable = "overall"
)

func (v OutputVariable) IsValid() bool {
	switch v {
	case OutputVariableAcidity, OutputVariableSweetness, OutputVariableBitterness,
		OutputVariableBody, OutputVariableAroma, OutputVariableAftertaste, OutputVariableOverall:
		return true
	}
	return false
}

// Direction for input variable changes
type MappingDirection string

const (
	MappingDirectionIncrease MappingDirection = "increase"
	MappingDirectionDecrease MappingDirection = "decrease"
)

func (d MappingDirection) IsValid() bool {
	switch d {
	case MappingDirectionIncrease, MappingDirectionDecrease:
		return true
	}
	return false
}

// Direction for effect outcomes
type EffectDirection string

const (
	EffectDirectionIncrease EffectDirection = "increase"
	EffectDirectionDecrease EffectDirection = "decrease"
	EffectDirectionNone     EffectDirection = "none"
)

func (d EffectDirection) IsValid() bool {
	switch d {
	case EffectDirectionIncrease, EffectDirectionDecrease, EffectDirectionNone:
		return true
	}
	return false
}

// Confidence level for effects
type Confidence string

const (
	ConfidenceLow    Confidence = "low"
	ConfidenceMedium Confidence = "medium"
	ConfidenceHigh   Confidence = "high"
)

func (c Confidence) IsValid() bool {
	switch c {
	case ConfidenceLow, ConfidenceMedium, ConfidenceHigh:
		return true
	}
	return false
}

// Effect represents a single effect outcome in the child table
type Effect struct {
	ID              uuid.UUID        `json:"id"`
	EffectMappingID uuid.UUID        `json:"effect_mapping_id"`
	OutputVariable  OutputVariable   `json:"output_variable"`
	Direction       EffectDirection  `json:"direction"`
	RangeMin        *decimal.Decimal `json:"range_min"`
	RangeMax        *decimal.Decimal `json:"range_max"`
	Confidence      Confidence       `json:"confidence"`
	CreatedAt       time.Time        `json:"created_at"`
}

// EffectResponse is the API response for an effect
type EffectResponse struct {
	ID             uuid.UUID        `json:"id"`
	OutputVariable OutputVariable   `json:"output_variable"`
	Direction      EffectDirection  `json:"direction"`
	RangeMin       *decimal.Decimal `json:"range_min,omitempty"`
	RangeMax       *decimal.Decimal `json:"range_max,omitempty"`
	Confidence     Confidence       `json:"confidence"`
}

func (e *Effect) ToResponse() *EffectResponse {
	return &EffectResponse{
		ID:             e.ID,
		OutputVariable: e.OutputVariable,
		Direction:      e.Direction,
		RangeMin:       e.RangeMin,
		RangeMax:       e.RangeMax,
		Confidence:     e.Confidence,
	}
}

// EffectMapping represents a user-defined cause-effect relationship
type EffectMapping struct {
	ID              uuid.UUID        `json:"id"`
	UserID          uuid.UUID        `json:"user_id"`
	Name            string           `json:"name"`
	Variable        InputVariable    `json:"variable"`
	Direction       MappingDirection `json:"direction"`
	TickDescription string           `json:"tick_description"`
	Source          *string          `json:"source"`
	Notes           *string          `json:"notes"`
	Active          bool             `json:"active"`
	Effects         []Effect         `json:"effects"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

// EffectMappingResponse is the API response for an effect mapping
type EffectMappingResponse struct {
	ID              uuid.UUID         `json:"id"`
	Name            string            `json:"name"`
	Variable        InputVariable     `json:"variable"`
	Direction       MappingDirection  `json:"direction"`
	TickDescription string            `json:"tick_description"`
	Source          *string           `json:"source,omitempty"`
	Notes           *string           `json:"notes,omitempty"`
	Active          bool              `json:"active"`
	Effects         []*EffectResponse `json:"effects"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

func (em *EffectMapping) ToResponse() *EffectMappingResponse {
	effects := make([]*EffectResponse, len(em.Effects))
	for i, e := range em.Effects {
		effects[i] = e.ToResponse()
	}

	return &EffectMappingResponse{
		ID:              em.ID,
		Name:            em.Name,
		Variable:        em.Variable,
		Direction:       em.Direction,
		TickDescription: em.TickDescription,
		Source:          em.Source,
		Notes:           em.Notes,
		Active:          em.Active,
		Effects:         effects,
		CreatedAt:       em.CreatedAt,
		UpdatedAt:       em.UpdatedAt,
	}
}

// EffectInput is used for creating/updating effects
type EffectInput struct {
	OutputVariable OutputVariable   `json:"output_variable" validate:"required"`
	Direction      EffectDirection  `json:"direction" validate:"required"`
	RangeMin       *decimal.Decimal `json:"range_min"`
	RangeMax       *decimal.Decimal `json:"range_max"`
	Confidence     Confidence       `json:"confidence" validate:"required"`
}

// CreateEffectMappingInput is used for creating a new effect mapping
type CreateEffectMappingInput struct {
	Name            string           `json:"name" validate:"required,max=255"`
	Variable        InputVariable    `json:"variable" validate:"required"`
	Direction       MappingDirection `json:"direction" validate:"required"`
	TickDescription string           `json:"tick_description" validate:"required,max=100"`
	Source          *string          `json:"source" validate:"omitempty,max=255"`
	Notes           *string          `json:"notes"`
	Effects         []EffectInput    `json:"effects" validate:"required,min=1,dive"`
}

// UpdateEffectMappingInput is used for updating an effect mapping
type UpdateEffectMappingInput struct {
	Name            *string          `json:"name" validate:"omitempty,max=255"`
	Variable        *InputVariable   `json:"variable"`
	Direction       *MappingDirection `json:"direction"`
	TickDescription *string          `json:"tick_description" validate:"omitempty,max=100"`
	Source          *string          `json:"source" validate:"omitempty,max=255"`
	Notes           *string          `json:"notes"`
	Active          *bool            `json:"active"`
	Effects         []EffectInput    `json:"effects" validate:"omitempty,min=1,dive"`
}

// EffectMappingListParams defines parameters for listing effect mappings
type EffectMappingListParams struct {
	UserID   uuid.UUID
	Variable *InputVariable
	Active   *bool
	Search   string
	SortBy   string
	SortDir  string
	Page     int
	PageSize int
}

// EffectMappingListResult contains the paginated list result
type EffectMappingListResult struct {
	Mappings   []*EffectMapping
	TotalCount int
	Page       int
	PageSize   int
	TotalPages int
}

// FindRelevantInput is used to find mappings that address specific gaps
type FindRelevantInput struct {
	Gaps []GapInput `json:"gaps" validate:"required,min=1,dive"`
}

// GapInput represents a gap between current and target taste profile
type GapInput struct {
	OutputVariable OutputVariable `json:"output_variable" validate:"required"`
	CurrentValue   float64        `json:"current_value" validate:"required,min=0,max=10"`
	TargetValue    float64        `json:"target_value" validate:"required,min=0,max=10"`
}

// FindRelevantResult contains mappings that address the specified gaps
type FindRelevantResult struct {
	Mappings []*EffectMappingResponse `json:"mappings"`
}
