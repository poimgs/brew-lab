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
	ErrInvalidVariable         = errors.New("invalid input variable")
	ErrDirectionRequired       = errors.New("direction is required")
	ErrInvalidDirection        = errors.New("invalid mapping direction")
	ErrTickDescriptionRequired = errors.New("tick description is required")
	ErrEffectsRequired         = errors.New("at least one effect is required")
	ErrInvalidOutputVariable   = errors.New("invalid output variable")
	ErrInvalidEffectDirection  = errors.New("invalid effect direction")
	ErrInvalidConfidence       = errors.New("invalid confidence level")
	ErrInvalidRange            = errors.New("range_min must be less than or equal to range_max")
)

type EffectMappingService struct {
	repo *repository.EffectMappingRepository
}

func NewEffectMappingService(repo *repository.EffectMappingRepository) *EffectMappingService {
	return &EffectMappingService{repo: repo}
}

type ListEffectMappingsInput struct {
	Variable *models.InputVariable `json:"variable"`
	Active   *bool                 `json:"active"`
	Search   string                `json:"search"`
	SortBy   string                `json:"sort_by"`
	SortDir  string                `json:"sort_dir"`
	Page     int                   `json:"page"`
	PageSize int                   `json:"page_size"`
}

type EffectMappingListResponse struct {
	Mappings   []*models.EffectMappingResponse `json:"mappings"`
	TotalCount int                             `json:"total_count"`
	Page       int                             `json:"page"`
	PageSize   int                             `json:"page_size"`
	TotalPages int                             `json:"total_pages"`
}

func (s *EffectMappingService) validateCreateInput(input *models.CreateEffectMappingInput) error {
	if input.Name == "" {
		return ErrNameRequired
	}
	if input.Variable == "" {
		return ErrVariableRequired
	}
	if !input.Variable.IsValid() {
		return ErrInvalidVariable
	}
	if input.Direction == "" {
		return ErrDirectionRequired
	}
	if !input.Direction.IsValid() {
		return ErrInvalidDirection
	}
	if input.TickDescription == "" {
		return ErrTickDescriptionRequired
	}
	if len(input.Effects) == 0 {
		return ErrEffectsRequired
	}

	for _, effect := range input.Effects {
		if err := s.validateEffectInput(&effect); err != nil {
			return err
		}
	}

	return nil
}

func (s *EffectMappingService) validateEffectInput(effect *models.EffectInput) error {
	if !effect.OutputVariable.IsValid() {
		return ErrInvalidOutputVariable
	}
	if !effect.Direction.IsValid() {
		return ErrInvalidEffectDirection
	}
	if !effect.Confidence.IsValid() {
		return ErrInvalidConfidence
	}
	if effect.RangeMin != nil && effect.RangeMax != nil && effect.RangeMin.GreaterThan(*effect.RangeMax) {
		return ErrInvalidRange
	}
	return nil
}

func (s *EffectMappingService) Create(ctx context.Context, userID uuid.UUID, input *models.CreateEffectMappingInput) (*models.EffectMappingResponse, error) {
	if err := s.validateCreateInput(input); err != nil {
		return nil, err
	}

	// Convert input effects to model effects
	effects := make([]models.Effect, len(input.Effects))
	for i, effectInput := range input.Effects {
		effects[i] = models.Effect{
			OutputVariable: effectInput.OutputVariable,
			Direction:      effectInput.Direction,
			RangeMin:       effectInput.RangeMin,
			RangeMax:       effectInput.RangeMax,
			Confidence:     effectInput.Confidence,
		}
	}

	mapping := &models.EffectMapping{
		UserID:          userID,
		Name:            input.Name,
		Variable:        input.Variable,
		Direction:       input.Direction,
		TickDescription: input.TickDescription,
		Source:          input.Source,
		Notes:           input.Notes,
		Active:          true,
		Effects:         effects,
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
	params := models.EffectMappingListParams{
		UserID:   userID,
		Variable: input.Variable,
		Active:   input.Active,
		Search:   input.Search,
		SortBy:   input.SortBy,
		SortDir:  input.SortDir,
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
		Mappings:   responses,
		TotalCount: result.TotalCount,
		Page:       result.Page,
		PageSize:   result.PageSize,
		TotalPages: result.TotalPages,
	}, nil
}

func (s *EffectMappingService) Update(ctx context.Context, userID, mappingID uuid.UUID, input *models.UpdateEffectMappingInput) (*models.EffectMappingResponse, error) {
	// Verify the mapping exists and belongs to the user
	existing, err := s.repo.GetByID(ctx, userID, mappingID)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if input.Name != nil {
		if *input.Name == "" {
			return nil, ErrNameRequired
		}
		existing.Name = *input.Name
	}
	if input.Variable != nil {
		if !input.Variable.IsValid() {
			return nil, ErrInvalidVariable
		}
		existing.Variable = *input.Variable
	}
	if input.Direction != nil {
		if !input.Direction.IsValid() {
			return nil, ErrInvalidDirection
		}
		existing.Direction = *input.Direction
	}
	if input.TickDescription != nil {
		if *input.TickDescription == "" {
			return nil, ErrTickDescriptionRequired
		}
		existing.TickDescription = *input.TickDescription
	}
	if input.Source != nil {
		existing.Source = input.Source
	}
	if input.Notes != nil {
		existing.Notes = input.Notes
	}
	if input.Active != nil {
		existing.Active = *input.Active
	}

	// Handle effects update
	if input.Effects != nil {
		if len(input.Effects) == 0 {
			return nil, ErrEffectsRequired
		}

		effects := make([]models.Effect, len(input.Effects))
		for i, effectInput := range input.Effects {
			if err := s.validateEffectInput(&effectInput); err != nil {
				return nil, err
			}
			effects[i] = models.Effect{
				OutputVariable: effectInput.OutputVariable,
				Direction:      effectInput.Direction,
				RangeMin:       effectInput.RangeMin,
				RangeMax:       effectInput.RangeMax,
				Confidence:     effectInput.Confidence,
			}
		}
		existing.Effects = effects
	}

	updated, err := s.repo.Update(ctx, existing)
	if err != nil {
		return nil, err
	}

	return updated.ToResponse(), nil
}

func (s *EffectMappingService) Delete(ctx context.Context, userID, mappingID uuid.UUID) error {
	return s.repo.Delete(ctx, userID, mappingID)
}

func (s *EffectMappingService) ToggleActive(ctx context.Context, userID, mappingID uuid.UUID) (*models.EffectMappingResponse, error) {
	mapping, err := s.repo.ToggleActive(ctx, userID, mappingID)
	if err != nil {
		return nil, err
	}

	return mapping.ToResponse(), nil
}

func (s *EffectMappingService) FindRelevant(ctx context.Context, userID uuid.UUID, input *models.FindRelevantInput) (*models.FindRelevantResult, error) {
	// Validate gaps input
	for _, gap := range input.Gaps {
		if !gap.OutputVariable.IsValid() {
			return nil, ErrInvalidOutputVariable
		}
	}

	// Calculate desired direction for each gap
	gapDirections := make(map[models.OutputVariable]models.EffectDirection)
	for _, gap := range input.Gaps {
		if gap.TargetValue > gap.CurrentValue {
			gapDirections[gap.OutputVariable] = models.EffectDirectionIncrease
		} else if gap.TargetValue < gap.CurrentValue {
			gapDirections[gap.OutputVariable] = models.EffectDirectionDecrease
		}
		// If equal, no gap to address
	}

	// Get all active mappings
	activeMappings, err := s.repo.ListActive(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Filter mappings whose effects address at least one gap
	var relevantMappings []*models.EffectMappingResponse
	for _, mapping := range activeMappings {
		if s.mappingAddressesGaps(mapping, gapDirections) {
			relevantMappings = append(relevantMappings, mapping.ToResponse())
		}
	}

	if relevantMappings == nil {
		relevantMappings = []*models.EffectMappingResponse{}
	}

	return &models.FindRelevantResult{
		Mappings: relevantMappings,
	}, nil
}

func (s *EffectMappingService) mappingAddressesGaps(mapping *models.EffectMapping, gapDirections map[models.OutputVariable]models.EffectDirection) bool {
	for _, effect := range mapping.Effects {
		if effect.Direction == models.EffectDirectionNone {
			continue
		}
		desiredDirection, hasGap := gapDirections[effect.OutputVariable]
		if hasGap && effect.Direction == desiredDirection {
			return true
		}
	}
	return false
}
