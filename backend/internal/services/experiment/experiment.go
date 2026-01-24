package experiment

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
)

var (
	ErrOverallNotesRequired = errors.New("overall notes is required")
	ErrOverallNotesTooShort = errors.New("overall notes must be at least 10 characters")
	ErrInvalidScore         = errors.New("score must be between 1 and 10")
	ErrCoffeeNotFound       = errors.New("coffee not found")
)

// CoffeeGetter interface for coffee service dependency
type CoffeeGetter interface {
	GetByID(ctx context.Context, userID, coffeeID uuid.UUID) (*models.CoffeeResponse, error)
}

// FilterPaperGetter interface for filter paper service dependency
type FilterPaperGetter interface {
	GetByID(ctx context.Context, userID, filterPaperID uuid.UUID) (*models.FilterPaperResponse, error)
}

// EffectMappingFinder interface for effect mapping service dependency
type EffectMappingFinder interface {
	FindRelevant(ctx context.Context, userID uuid.UUID, input *models.FindRelevantInput) (*models.FindRelevantResult, error)
}

type ExperimentService struct {
	experimentRepo      *repository.ExperimentRepository
	experimentTagsRepo  *repository.ExperimentTagsRepository
	issueTagsRepo       *repository.IssueTagsRepository
	coffeeGetter        CoffeeGetter
	filterPaperGetter   FilterPaperGetter
	effectMappingFinder EffectMappingFinder
}

func NewExperimentService(
	experimentRepo *repository.ExperimentRepository,
	experimentTagsRepo *repository.ExperimentTagsRepository,
	issueTagsRepo *repository.IssueTagsRepository,
	coffeeGetter CoffeeGetter,
	filterPaperGetter FilterPaperGetter,
	effectMappingFinder EffectMappingFinder,
) *ExperimentService {
	return &ExperimentService{
		experimentRepo:      experimentRepo,
		experimentTagsRepo:  experimentTagsRepo,
		issueTagsRepo:       issueTagsRepo,
		coffeeGetter:        coffeeGetter,
		filterPaperGetter:   filterPaperGetter,
		effectMappingFinder: effectMappingFinder,
	}
}

func (s *ExperimentService) Create(ctx context.Context, userID uuid.UUID, input *models.CreateExperimentInput) (*models.ExperimentResponse, error) {
	// Validate required fields
	if input.OverallNotes == "" {
		return nil, ErrOverallNotesRequired
	}
	if len(input.OverallNotes) < 10 {
		return nil, ErrOverallNotesTooShort
	}
	if input.OverallScore != nil && (*input.OverallScore < 1 || *input.OverallScore > 10) {
		return nil, ErrInvalidScore
	}

	// Validate coffee exists and belongs to user
	var coffeeResp *models.CoffeeResponse
	if input.CoffeeID != nil {
		var err error
		coffeeResp, err = s.coffeeGetter.GetByID(ctx, userID, *input.CoffeeID)
		if err != nil {
			if errors.Is(err, repository.ErrCoffeeNotFound) {
				return nil, ErrCoffeeNotFound
			}
			return nil, err
		}
	}

	// Create the experiment
	exp, err := s.experimentRepo.Create(ctx, userID, *input)
	if err != nil {
		return nil, err
	}

	// Build response
	return s.buildResponse(ctx, exp, userID, coffeeResp)
}

func (s *ExperimentService) GetByID(ctx context.Context, userID, experimentID uuid.UUID) (*models.ExperimentResponse, error) {
	exp, err := s.experimentRepo.GetByID(ctx, userID, experimentID)
	if err != nil {
		return nil, err
	}

	// Get coffee if present
	var coffeeResp *models.CoffeeResponse
	if exp.CoffeeID != nil {
		coffeeResp, _ = s.coffeeGetter.GetByID(ctx, userID, *exp.CoffeeID)
	}

	return s.buildResponse(ctx, exp, userID, coffeeResp)
}

type ListExperimentsInput struct {
	Filter   models.ExperimentFilter
	SortBy   string
	SortDir  string
	Page     int
	PageSize int
}

func (s *ExperimentService) List(ctx context.Context, userID uuid.UUID, input *ListExperimentsInput) (*models.ExperimentListResponse, error) {
	params := repository.ExperimentListParams{
		UserID:   userID,
		Filter:   input.Filter,
		SortBy:   input.SortBy,
		SortDir:  input.SortDir,
		Page:     input.Page,
		PageSize: input.PageSize,
	}

	result, err := s.experimentRepo.List(ctx, params)
	if err != nil {
		return nil, err
	}

	// Collect experiment IDs and coffee IDs
	experimentIDs := make([]uuid.UUID, len(result.Experiments))
	coffeeIDs := make(map[uuid.UUID]bool)
	for i, exp := range result.Experiments {
		experimentIDs[i] = exp.ID
		if exp.CoffeeID != nil {
			coffeeIDs[*exp.CoffeeID] = true
		}
	}

	// Batch fetch tags for all experiments
	tagsMap, err := s.experimentTagsRepo.GetTagsForExperiments(ctx, experimentIDs)
	if err != nil {
		return nil, err
	}

	// Batch fetch coffees
	coffeesMap := make(map[uuid.UUID]*models.CoffeeResponse)
	for coffeeID := range coffeeIDs {
		coffee, err := s.coffeeGetter.GetByID(ctx, userID, coffeeID)
		if err == nil {
			coffeesMap[coffeeID] = coffee
		}
	}

	// Collect filter paper IDs
	filterPaperIDs := make(map[uuid.UUID]bool)
	for _, exp := range result.Experiments {
		if exp.FilterPaperID != nil {
			filterPaperIDs[*exp.FilterPaperID] = true
		}
	}

	// Batch fetch filter papers
	filterPapersMap := make(map[uuid.UUID]*models.FilterPaperResponse)
	if s.filterPaperGetter != nil {
		for fpID := range filterPaperIDs {
			fp, err := s.filterPaperGetter.GetByID(ctx, userID, fpID)
			if err == nil {
				filterPapersMap[fpID] = fp
			}
		}
	}

	// Build responses
	responses := make([]models.ExperimentResponse, len(result.Experiments))
	for i, exp := range result.Experiments {
		var coffeeResp *models.CoffeeResponse
		if exp.CoffeeID != nil {
			coffeeResp = coffeesMap[*exp.CoffeeID]
		}

		var filterPaperResp *models.FilterPaperResponse
		if exp.FilterPaperID != nil {
			filterPaperResp = filterPapersMap[*exp.FilterPaperID]
		}

		tags := tagsMap[exp.ID]
		tagResponses := make([]models.IssueTagResponse, len(tags))
		for j, tag := range tags {
			tagResponses[j] = *tag.ToResponse()
		}

		daysOffRoast := s.calculateDaysOffRoast(coffeeResp, exp)
		resp := exp.ToResponse(coffeeResp, filterPaperResp, tagResponses, daysOffRoast)
		responses[i] = *resp
	}

	return &models.ExperimentListResponse{
		Experiments: responses,
		Total:       result.TotalCount,
		Page:        result.Page,
		PerPage:     result.PageSize,
	}, nil
}

func (s *ExperimentService) Update(ctx context.Context, userID, experimentID uuid.UUID, input *models.UpdateExperimentInput) (*models.ExperimentResponse, error) {
	// Validate fields if provided
	if input.OverallNotes != nil && len(*input.OverallNotes) < 10 {
		return nil, ErrOverallNotesTooShort
	}
	if input.OverallScore != nil && (*input.OverallScore < 1 || *input.OverallScore > 10) {
		return nil, ErrInvalidScore
	}

	// Validate coffee if being changed
	if input.CoffeeID != nil {
		_, err := s.coffeeGetter.GetByID(ctx, userID, *input.CoffeeID)
		if err != nil {
			if errors.Is(err, repository.ErrCoffeeNotFound) {
				return nil, ErrCoffeeNotFound
			}
			return nil, err
		}
	}

	exp, err := s.experimentRepo.Update(ctx, userID, experimentID, *input)
	if err != nil {
		return nil, err
	}

	// Get coffee if present
	var coffeeResp *models.CoffeeResponse
	if exp.CoffeeID != nil {
		coffeeResp, _ = s.coffeeGetter.GetByID(ctx, userID, *exp.CoffeeID)
	}

	return s.buildResponse(ctx, exp, userID, coffeeResp)
}

func (s *ExperimentService) Delete(ctx context.Context, userID, experimentID uuid.UUID) error {
	return s.experimentRepo.Delete(ctx, userID, experimentID)
}

func (s *ExperimentService) Copy(ctx context.Context, userID, experimentID uuid.UUID) (*models.ExperimentResponse, error) {
	exp, err := s.experimentRepo.Copy(ctx, userID, experimentID)
	if err != nil {
		return nil, err
	}

	// Get coffee if present
	var coffeeResp *models.CoffeeResponse
	if exp.CoffeeID != nil {
		coffeeResp, _ = s.coffeeGetter.GetByID(ctx, userID, *exp.CoffeeID)
	}

	return s.buildResponse(ctx, exp, userID, coffeeResp)
}

func (s *ExperimentService) AddTags(ctx context.Context, userID, experimentID uuid.UUID, tagIDs []uuid.UUID) (*models.ExperimentResponse, error) {
	// Verify experiment exists
	exp, err := s.experimentRepo.GetByID(ctx, userID, experimentID)
	if err != nil {
		return nil, err
	}

	// Verify tags exist and are accessible to user
	for _, tagID := range tagIDs {
		tag, err := s.issueTagsRepo.GetByID(ctx, tagID)
		if err != nil {
			return nil, err
		}
		// Check tag is either system or belongs to user
		if tag.UserID != nil && *tag.UserID != userID {
			return nil, repository.ErrTagNotFound
		}
	}

	// Add tags
	for _, tagID := range tagIDs {
		err := s.experimentTagsRepo.AddTag(ctx, experimentID, tagID)
		if err != nil {
			return nil, err
		}
	}

	// Get coffee if present
	var coffeeResp *models.CoffeeResponse
	if exp.CoffeeID != nil {
		coffeeResp, _ = s.coffeeGetter.GetByID(ctx, userID, *exp.CoffeeID)
	}

	return s.buildResponse(ctx, exp, userID, coffeeResp)
}

func (s *ExperimentService) RemoveTag(ctx context.Context, userID, experimentID, tagID uuid.UUID) (*models.ExperimentResponse, error) {
	// Verify experiment exists
	exp, err := s.experimentRepo.GetByID(ctx, userID, experimentID)
	if err != nil {
		return nil, err
	}

	err = s.experimentTagsRepo.RemoveTag(ctx, experimentID, tagID)
	if err != nil {
		return nil, err
	}

	// Get coffee if present
	var coffeeResp *models.CoffeeResponse
	if exp.CoffeeID != nil {
		coffeeResp, _ = s.coffeeGetter.GetByID(ctx, userID, *exp.CoffeeID)
	}

	return s.buildResponse(ctx, exp, userID, coffeeResp)
}

func (s *ExperimentService) buildResponse(ctx context.Context, exp *models.Experiment, userID uuid.UUID, coffeeResp *models.CoffeeResponse) (*models.ExperimentResponse, error) {
	// Get tags
	tags, err := s.experimentTagsRepo.GetTagsForExperiment(ctx, exp.ID)
	if err != nil {
		return nil, err
	}

	tagResponses := make([]models.IssueTagResponse, len(tags))
	for i, tag := range tags {
		tagResponses[i] = *tag.ToResponse()
	}

	// Get filter paper if present
	var filterPaperResp *models.FilterPaperResponse
	if exp.FilterPaperID != nil && s.filterPaperGetter != nil {
		filterPaperResp, _ = s.filterPaperGetter.GetByID(ctx, userID, *exp.FilterPaperID)
	}

	// Calculate days off roast
	daysOffRoast := s.calculateDaysOffRoast(coffeeResp, exp)

	return exp.ToResponse(coffeeResp, filterPaperResp, tagResponses, daysOffRoast), nil
}

func (s *ExperimentService) calculateDaysOffRoast(coffee *models.CoffeeResponse, exp *models.Experiment) *int {
	if coffee == nil || coffee.RoastDate == nil {
		return nil
	}

	days := int(exp.BrewDate.Sub(*coffee.RoastDate).Hours() / 24)
	return &days
}

// GetExperimentCountForCoffee returns the number of experiments for a coffee
func (s *ExperimentService) GetExperimentCountForCoffee(ctx context.Context, coffeeID uuid.UUID) (int, error) {
	return s.experimentRepo.CountForCoffee(ctx, coffeeID)
}

// GetLastBrewedForCoffee returns the last brew date for a coffee
func (s *ExperimentService) GetLastBrewedForCoffee(ctx context.Context, coffeeID uuid.UUID) (*models.Experiment, error) {
	return s.experimentRepo.GetLatestForCoffee(ctx, uuid.Nil, coffeeID)
}

// GetOptimization returns the experiment with its computed gaps and relevant effect mappings
func (s *ExperimentService) GetOptimization(ctx context.Context, userID, experimentID uuid.UUID) (*models.OptimizationResponse, error) {
	// Get the experiment with computed gaps
	expResp, err := s.GetByID(ctx, userID, experimentID)
	if err != nil {
		return nil, err
	}

	// Build gaps input from the experiment's computed gaps
	var relevantMappings []*models.EffectMappingResponse
	if expResp.Gaps != nil && s.effectMappingFinder != nil {
		gaps := make([]models.GapInput, 0)

		if expResp.Gaps.Acidity != nil && expResp.Gaps.Acidity.Direction != models.GapDirectionOnTarget {
			current := 0.0
			if expResp.Gaps.Acidity.Current != nil {
				current = float64(*expResp.Gaps.Acidity.Current)
			}
			target := 0.0
			if expResp.Gaps.Acidity.Target != nil {
				target = float64(*expResp.Gaps.Acidity.Target)
			}
			gaps = append(gaps, models.GapInput{
				OutputVariable: models.OutputVariableAcidity,
				CurrentValue:   current,
				TargetValue:    target,
			})
		}

		if expResp.Gaps.Sweetness != nil && expResp.Gaps.Sweetness.Direction != models.GapDirectionOnTarget {
			current := 0.0
			if expResp.Gaps.Sweetness.Current != nil {
				current = float64(*expResp.Gaps.Sweetness.Current)
			}
			target := 0.0
			if expResp.Gaps.Sweetness.Target != nil {
				target = float64(*expResp.Gaps.Sweetness.Target)
			}
			gaps = append(gaps, models.GapInput{
				OutputVariable: models.OutputVariableSweetness,
				CurrentValue:   current,
				TargetValue:    target,
			})
		}

		if expResp.Gaps.Bitterness != nil && expResp.Gaps.Bitterness.Direction != models.GapDirectionOnTarget {
			current := 0.0
			if expResp.Gaps.Bitterness.Current != nil {
				current = float64(*expResp.Gaps.Bitterness.Current)
			}
			target := 0.0
			if expResp.Gaps.Bitterness.Target != nil {
				target = float64(*expResp.Gaps.Bitterness.Target)
			}
			gaps = append(gaps, models.GapInput{
				OutputVariable: models.OutputVariableBitterness,
				CurrentValue:   current,
				TargetValue:    target,
			})
		}

		if expResp.Gaps.Body != nil && expResp.Gaps.Body.Direction != models.GapDirectionOnTarget {
			current := 0.0
			if expResp.Gaps.Body.Current != nil {
				current = float64(*expResp.Gaps.Body.Current)
			}
			target := 0.0
			if expResp.Gaps.Body.Target != nil {
				target = float64(*expResp.Gaps.Body.Target)
			}
			gaps = append(gaps, models.GapInput{
				OutputVariable: models.OutputVariableBody,
				CurrentValue:   current,
				TargetValue:    target,
			})
		}

		if expResp.Gaps.Aroma != nil && expResp.Gaps.Aroma.Direction != models.GapDirectionOnTarget {
			current := 0.0
			if expResp.Gaps.Aroma.Current != nil {
				current = float64(*expResp.Gaps.Aroma.Current)
			}
			target := 0.0
			if expResp.Gaps.Aroma.Target != nil {
				target = float64(*expResp.Gaps.Aroma.Target)
			}
			gaps = append(gaps, models.GapInput{
				OutputVariable: models.OutputVariableAroma,
				CurrentValue:   current,
				TargetValue:    target,
			})
		}

		// Find relevant mappings if there are any gaps
		if len(gaps) > 0 {
			result, err := s.effectMappingFinder.FindRelevant(ctx, userID, &models.FindRelevantInput{
				Gaps: gaps,
			})
			if err == nil && result != nil {
				relevantMappings = result.Mappings
			}
		}
	}

	if relevantMappings == nil {
		relevantMappings = []*models.EffectMappingResponse{}
	}

	return &models.OptimizationResponse{
		Experiment:       expResp,
		RelevantMappings: relevantMappings,
	}, nil
}
