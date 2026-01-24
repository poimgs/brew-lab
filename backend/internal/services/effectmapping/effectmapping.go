package effectmapping

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
)

var (
	ErrNameRequired            = errors.New("name is required")
	ErrVariableRequired        = errors.New("variable is required")
	ErrInvalidVariable         = errors.New("invalid variable")
	ErrInvalidDirection        = errors.New("invalid direction")
	ErrTickDescriptionRequired = errors.New("tick description is required")
	ErrEffectsRequired         = errors.New("at least one effect is required")
	ErrInvalidOutputVariable   = errors.New("invalid output variable")
	ErrInvalidEffectDirection  = errors.New("invalid effect direction")
	ErrInvalidConfidence       = errors.New("invalid confidence level")
)

type EffectMappingService struct {
	repo *repository.EffectMappingRepository
}

func NewEffectMappingService(repo *repository.EffectMappingRepository) *EffectMappingService {
	return &EffectMappingService{repo: repo}
}

type CreateEffectMappingInput struct {
	Name            string        `json:"name" validate:"required,max=255"`
	Variable        string        `json:"variable" validate:"required"`
	Direction       string        `json:"direction" validate:"required"`
	TickDescription string        `json:"tick_description" validate:"required,max=100"`
	Effects         []EffectInput `json:"effects" validate:"required,min=1,dive"`
	Source          *string       `json:"source" validate:"omitempty,max=255"`
	Notes           *string       `json:"notes"`
}

type UpdateEffectMappingInput struct {
	Name            string        `json:"name" validate:"required,max=255"`
	Variable        string        `json:"variable" validate:"required"`
	Direction       string        `json:"direction" validate:"required"`
	TickDescription string        `json:"tick_description" validate:"required,max=100"`
	Effects         []EffectInput `json:"effects" validate:"required,min=1,dive"`
	Source          *string       `json:"source" validate:"omitempty,max=255"`
	Notes           *string       `json:"notes"`
}

type EffectInput struct {
	OutputVariable string   `json:"output_variable" validate:"required"`
	Direction      string   `json:"direction" validate:"required"`
	RangeMin       *float64 `json:"range_min"`
	RangeMax       *float64 `json:"range_max"`
	Confidence     string   `json:"confidence" validate:"required"`
}

type ListEffectMappingsInput struct {
	Variable *string
	Active   *bool
	Search   *string
	Page     int
	PageSize int
}

type EffectMappingListResponse struct {
	Data       []*models.EffectMappingResponse `json:"data"`
	Pagination PaginationMeta                  `json:"pagination"`
}

type PaginationMeta struct {
	Total      int `json:"total"`
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	TotalPages int `json:"total_pages"`
}

// Gap represents a desired sensory change for relevance matching
type Gap struct {
	Variable  string  `json:"variable" validate:"required"`
	Direction string  `json:"direction" validate:"required"`
	Amount    float64 `json:"amount" validate:"required,gt=0"`
}

type RelevantMappingsInput struct {
	Gaps []Gap `json:"gaps" validate:"required,min=1,dive"`
}

type RelevanceMatch struct {
	GapVariable     string `json:"gap_variable"`
	GapDirection    string `json:"gap_direction"`
	EffectDirection string `json:"effect_direction"`
	Matches         bool   `json:"matches"`
}

type RelevantMappingResponse struct {
	Mapping   *models.EffectMappingResponse `json:"mapping"`
	Relevance []RelevanceMatch              `json:"relevance"`
}

func (s *EffectMappingService) validateEffects(effects []EffectInput) error {
	if len(effects) == 0 {
		return ErrEffectsRequired
	}

	seen := make(map[string]bool)
	for _, effect := range effects {
		if !models.ValidOutputVariables[effect.OutputVariable] {
			return ErrInvalidOutputVariable
		}
		if seen[effect.OutputVariable] {
			return errors.New("duplicate output variable: " + effect.OutputVariable)
		}
		seen[effect.OutputVariable] = true

		dir := models.EffectDirection(effect.Direction)
		if !dir.IsValid() {
			return ErrInvalidEffectDirection
		}

		conf := models.Confidence(effect.Confidence)
		if !conf.IsValid() {
			return ErrInvalidConfidence
		}
	}

	return nil
}

func (s *EffectMappingService) convertEffectInputs(inputs []EffectInput) []models.Effect {
	effects := make([]models.Effect, len(inputs))
	for i, input := range inputs {
		effects[i] = models.Effect{
			OutputVariable: input.OutputVariable,
			Direction:      models.EffectDirection(input.Direction),
			RangeMin:       input.RangeMin,
			RangeMax:       input.RangeMax,
			Confidence:     models.Confidence(input.Confidence),
		}
	}
	return effects
}

func (s *EffectMappingService) Create(ctx context.Context, userID uuid.UUID, input *CreateEffectMappingInput) (*models.EffectMappingResponse, error) {
	if input.Name == "" {
		return nil, ErrNameRequired
	}
	if input.Variable == "" {
		return nil, ErrVariableRequired
	}
	if !models.ValidInputVariables[input.Variable] {
		return nil, ErrInvalidVariable
	}

	direction := models.MappingDirection(input.Direction)
	if !direction.IsValid() {
		return nil, ErrInvalidDirection
	}

	if input.TickDescription == "" {
		return nil, ErrTickDescriptionRequired
	}

	if err := s.validateEffects(input.Effects); err != nil {
		return nil, err
	}

	mapping := &models.EffectMapping{
		UserID:          userID,
		Name:            input.Name,
		Variable:        input.Variable,
		Direction:       direction,
		TickDescription: input.TickDescription,
		Source:          input.Source,
		Notes:           input.Notes,
		Active:          true,
		Effects:         s.convertEffectInputs(input.Effects),
	}

	created, err := s.repo.Create(ctx, mapping)
	if err != nil {
		return nil, err
	}

	return created.ToResponse(), nil
}

func (s *EffectMappingService) GetByID(ctx context.Context, userID, mappingID uuid.UUID) (*models.EffectMappingResponse, error) {
	mapping, err := s.repo.GetByID(ctx, userID, mappingID)
	if err != nil {
		return nil, err
	}
	return mapping.ToResponse(), nil
}

func (s *EffectMappingService) List(ctx context.Context, userID uuid.UUID, input *ListEffectMappingsInput) (*EffectMappingListResponse, error) {
	params := repository.EffectMappingListParams{
		UserID:   userID,
		Variable: input.Variable,
		Active:   input.Active,
		Search:   input.Search,
		Page:     input.Page,
		PageSize: input.PageSize,
	}

	result, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, err
	}

	responses := make([]*models.EffectMappingResponse, len(result.Mappings))
	for i, mapping := range result.Mappings {
		responses[i] = mapping.ToResponse()
	}

	return &EffectMappingListResponse{
		Data: responses,
		Pagination: PaginationMeta{
			Total:      result.TotalCount,
			Page:       result.Page,
			PerPage:    result.PageSize,
			TotalPages: result.TotalPages,
		},
	}, nil
}

func (s *EffectMappingService) Update(ctx context.Context, userID, mappingID uuid.UUID, input *UpdateEffectMappingInput) (*models.EffectMappingResponse, error) {
	// Verify exists
	existing, err := s.repo.GetByID(ctx, userID, mappingID)
	if err != nil {
		return nil, err
	}

	if input.Name == "" {
		return nil, ErrNameRequired
	}
	if !models.ValidInputVariables[input.Variable] {
		return nil, ErrInvalidVariable
	}

	direction := models.MappingDirection(input.Direction)
	if !direction.IsValid() {
		return nil, ErrInvalidDirection
	}

	if input.TickDescription == "" {
		return nil, ErrTickDescriptionRequired
	}

	if err := s.validateEffects(input.Effects); err != nil {
		return nil, err
	}

	mapping := &models.EffectMapping{
		ID:              existing.ID,
		UserID:          userID,
		Name:            input.Name,
		Variable:        input.Variable,
		Direction:       direction,
		TickDescription: input.TickDescription,
		Source:          input.Source,
		Notes:           input.Notes,
		Effects:         s.convertEffectInputs(input.Effects),
	}

	updated, err := s.repo.Update(ctx, mapping)
	if err != nil {
		return nil, err
	}

	return updated.ToResponse(), nil
}

func (s *EffectMappingService) Delete(ctx context.Context, userID, mappingID uuid.UUID) error {
	return s.repo.Delete(ctx, userID, mappingID)
}

func (s *EffectMappingService) Toggle(ctx context.Context, userID, mappingID uuid.UUID) (*models.EffectMappingResponse, error) {
	updated, err := s.repo.ToggleActive(ctx, userID, mappingID)
	if err != nil {
		return nil, err
	}
	return updated.ToResponse(), nil
}

func (s *EffectMappingService) GetRelevant(ctx context.Context, userID uuid.UUID, input *RelevantMappingsInput) ([]*RelevantMappingResponse, error) {
	mappings, err := s.repo.GetActiveMappings(ctx, userID)
	if err != nil {
		return nil, err
	}

	var results []*RelevantMappingResponse

	for _, mapping := range mappings {
		relevance := s.calculateRelevance(mapping, input.Gaps)

		// Include if any effect matches at least one gap
		hasMatch := false
		for _, r := range relevance {
			if r.Matches {
				hasMatch = true
				break
			}
		}

		if hasMatch {
			results = append(results, &RelevantMappingResponse{
				Mapping:   mapping.ToResponse(),
				Relevance: relevance,
			})
		}
	}

	return results, nil
}

func (s *EffectMappingService) calculateRelevance(mapping *models.EffectMapping, gaps []Gap) []RelevanceMatch {
	var matches []RelevanceMatch

	for _, gap := range gaps {
		for _, effect := range mapping.Effects {
			if effect.OutputVariable == gap.Variable {
				isMatch := string(effect.Direction) == gap.Direction
				matches = append(matches, RelevanceMatch{
					GapVariable:     gap.Variable,
					GapDirection:    gap.Direction,
					EffectDirection: string(effect.Direction),
					Matches:         isMatch,
				})
			}
		}
	}

	return matches
}
