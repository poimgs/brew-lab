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

// Compare returns a comparison of 2-4 experiments with delta calculations
func (s *ExperimentService) Compare(ctx context.Context, userID uuid.UUID, input *models.CompareExperimentsInput) (*models.CompareExperimentsResponse, error) {
	// Fetch all experiments by IDs
	experiments, err := s.experimentRepo.GetByIDs(ctx, userID, input.ExperimentIDs)
	if err != nil {
		return nil, err
	}

	if len(experiments) != len(input.ExperimentIDs) {
		return nil, errors.New("one or more experiments not found")
	}

	// Collect experiment IDs and coffee IDs
	experimentIDs := make([]uuid.UUID, len(experiments))
	coffeeIDs := make(map[uuid.UUID]bool)
	for i, exp := range experiments {
		experimentIDs[i] = exp.ID
		if exp.CoffeeID != nil {
			coffeeIDs[*exp.CoffeeID] = true
		}
	}

	// Batch fetch tags
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
	for _, exp := range experiments {
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
	responses := make([]models.ExperimentResponse, len(experiments))
	for i, exp := range experiments {
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

	// Calculate deltas
	deltas := s.calculateDeltas(responses)

	return &models.CompareExperimentsResponse{
		Experiments: responses,
		Deltas:      deltas,
	}, nil
}

// calculateDeltas computes delta information for numeric fields across experiments
func (s *ExperimentService) calculateDeltas(experiments []models.ExperimentResponse) map[string]*models.DeltaInfo {
	deltas := make(map[string]*models.DeltaInfo)

	// Helper function to calculate delta for float64 fields
	calcFloat64Delta := func(field string, getValue func(e models.ExperimentResponse) *float64) {
		values := make([]float64, 0)
		for _, exp := range experiments {
			v := getValue(exp)
			if v != nil {
				values = append(values, *v)
			}
		}
		if len(values) >= 2 {
			deltas[field] = calculateNumericDelta(values)
		}
	}

	// Helper function to calculate delta for int fields
	calcIntDelta := func(field string, getValue func(e models.ExperimentResponse) *int) {
		values := make([]float64, 0)
		for _, exp := range experiments {
			v := getValue(exp)
			if v != nil {
				values = append(values, float64(*v))
			}
		}
		if len(values) >= 2 {
			deltas[field] = calculateNumericDelta(values)
		}
	}

	// Pre-brew parameters
	calcFloat64Delta("coffee_weight", func(e models.ExperimentResponse) *float64 { return e.CoffeeWeight })
	calcFloat64Delta("water_weight", func(e models.ExperimentResponse) *float64 { return e.WaterWeight })
	calcFloat64Delta("water_temperature", func(e models.ExperimentResponse) *float64 { return e.WaterTemperature })
	calcFloat64Delta("ratio", func(e models.ExperimentResponse) *float64 { return e.Ratio })
	calcFloat64Delta("calculated_ratio", func(e models.ExperimentResponse) *float64 { return e.CalculatedRatio })

	// Brew parameters
	calcFloat64Delta("bloom_water", func(e models.ExperimentResponse) *float64 { return e.BloomWater })
	calcIntDelta("bloom_time", func(e models.ExperimentResponse) *int { return e.BloomTime })
	calcIntDelta("total_brew_time", func(e models.ExperimentResponse) *int { return e.TotalBrewTime })
	calcIntDelta("drawdown_time", func(e models.ExperimentResponse) *int { return e.DrawdownTime })

	// Post-brew parameters
	calcFloat64Delta("serving_temperature", func(e models.ExperimentResponse) *float64 { return e.ServingTemperature })
	calcFloat64Delta("water_bypass", func(e models.ExperimentResponse) *float64 { return e.WaterBypass })

	// Quantitative results
	calcFloat64Delta("final_weight", func(e models.ExperimentResponse) *float64 { return e.FinalWeight })
	calcFloat64Delta("tds", func(e models.ExperimentResponse) *float64 { return e.TDS })
	calcFloat64Delta("extraction_yield", func(e models.ExperimentResponse) *float64 { return e.ExtractionYield })

	// Sensory scores
	calcIntDelta("overall_score", func(e models.ExperimentResponse) *int { return e.OverallScore })
	calcIntDelta("aroma_intensity", func(e models.ExperimentResponse) *int { return e.AromaIntensity })
	calcIntDelta("acidity_intensity", func(e models.ExperimentResponse) *int { return e.AcidityIntensity })
	calcIntDelta("sweetness_intensity", func(e models.ExperimentResponse) *int { return e.SweetnessIntensity })
	calcIntDelta("bitterness_intensity", func(e models.ExperimentResponse) *int { return e.BitternessIntensity })
	calcIntDelta("body_weight", func(e models.ExperimentResponse) *int { return e.BodyWeight })
	calcIntDelta("aftertaste_duration", func(e models.ExperimentResponse) *int { return e.AftertasteDuration })
	calcIntDelta("aftertaste_intensity", func(e models.ExperimentResponse) *int { return e.AftertasteIntensity })

	// Days off roast
	calcIntDelta("days_off_roast", func(e models.ExperimentResponse) *int { return e.DaysOffRoast })

	return deltas
}

// calculateNumericDelta calculates min, max, and trend for a sequence of numeric values
func calculateNumericDelta(values []float64) *models.DeltaInfo {
	if len(values) < 2 {
		return nil
	}

	min := values[0]
	max := values[0]
	for _, v := range values[1:] {
		if v < min {
			min = v
		}
		if v > max {
			max = v
		}
	}

	// Determine trend
	trend := determineTrend(values)

	return &models.DeltaInfo{
		Min:   min,
		Max:   max,
		Trend: trend,
	}
}

// determineTrend analyzes a sequence of values to determine the trend
func determineTrend(values []float64) models.DeltaTrend {
	if len(values) < 2 {
		return models.DeltaTrendStable
	}

	// Check if all values are the same
	allSame := true
	for i := 1; i < len(values); i++ {
		if values[i] != values[0] {
			allSame = false
			break
		}
	}
	if allSame {
		return models.DeltaTrendStable
	}

	// Check if monotonically increasing
	increasing := true
	for i := 1; i < len(values); i++ {
		if values[i] < values[i-1] {
			increasing = false
			break
		}
	}
	if increasing {
		return models.DeltaTrendIncreasing
	}

	// Check if monotonically decreasing
	decreasing := true
	for i := 1; i < len(values); i++ {
		if values[i] > values[i-1] {
			decreasing = false
			break
		}
	}
	if decreasing {
		return models.DeltaTrendDecreasing
	}

	return models.DeltaTrendVariable
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

// Analyze performs correlation analysis across 5+ experiments
func (s *ExperimentService) Analyze(ctx context.Context, userID uuid.UUID, input *models.AnalyzeExperimentsInput) (*models.AnalyzeExperimentsResponse, error) {
	// Fetch all experiments by IDs
	experiments, err := s.experimentRepo.GetByIDs(ctx, userID, input.ExperimentIDs)
	if err != nil {
		return nil, err
	}

	if len(experiments) != len(input.ExperimentIDs) {
		return nil, errors.New("one or more experiments not found")
	}

	// Collect coffee IDs and fetch coffees
	coffeeIDs := make(map[uuid.UUID]bool)
	for _, exp := range experiments {
		if exp.CoffeeID != nil {
			coffeeIDs[*exp.CoffeeID] = true
		}
	}

	coffeesMap := make(map[uuid.UUID]*models.CoffeeResponse)
	for coffeeID := range coffeeIDs {
		coffee, err := s.coffeeGetter.GetByID(ctx, userID, coffeeID)
		if err == nil {
			coffeesMap[coffeeID] = coffee
		}
	}

	// Build experiment responses to get days off roast
	responses := make([]models.ExperimentResponse, len(experiments))
	for i, exp := range experiments {
		var coffeeResp *models.CoffeeResponse
		if exp.CoffeeID != nil {
			coffeeResp = coffeesMap[*exp.CoffeeID]
		}
		daysOffRoast := s.calculateDaysOffRoast(coffeeResp, exp)
		// Create minimal response with just the fields we need
		responses[i] = models.ExperimentResponse{
			ID:                  exp.ID,
			BrewDate:            exp.BrewDate,
			CoffeeWeight:        exp.CoffeeWeight,
			WaterWeight:         exp.WaterWeight,
			WaterTemperature:    exp.WaterTemperature,
			BloomTime:           exp.BloomTime,
			TotalBrewTime:       exp.TotalBrewTime,
			DaysOffRoast:        daysOffRoast,
			OverallScore:        exp.OverallScore,
			AcidityIntensity:    exp.AcidityIntensity,
			SweetnessIntensity:  exp.SweetnessIntensity,
			BitternessIntensity: exp.BitternessIntensity,
			BodyWeight:          exp.BodyWeight,
			AromaIntensity:      exp.AromaIntensity,
			TDS:                 exp.TDS,
			ExtractionYield:     exp.ExtractionYield,
			Coffee:              coffeeResp,
		}
	}

	// Define input and outcome variables
	inputVars := []string{"coffee_weight", "water_weight", "water_temperature", "bloom_time", "total_brew_time", "days_off_roast"}
	outcomeVars := []string{"overall_score", "acidity_intensity", "sweetness_intensity", "bitterness_intensity", "body_weight", "aroma_intensity", "tds", "extraction_yield"}

	minSamples := input.MinSamples
	if minSamples < 3 {
		minSamples = 5 // Default minimum
	}

	// Calculate correlations
	correlations := make(map[string]map[string]*models.CorrelationResult)
	warnings := []models.Warning{}
	insights := []models.Insight{}

	for _, inputVar := range inputVars {
		correlations[inputVar] = make(map[string]*models.CorrelationResult)
		for _, outcomeVar := range outcomeVars {
			xVals, yVals := extractPairValues(responses, inputVar, outcomeVar)
			if len(xVals) < minSamples {
				continue
			}

			r, n, p := pearsonCorrelation(xVals, yVals)
			if n >= minSamples {
				correlations[inputVar][outcomeVar] = &models.CorrelationResult{
					R: r,
					N: n,
					P: p,
				}
			}
		}
	}

	// Generate insights for strong correlations
	type corrEntry struct {
		input   string
		outcome string
		r       float64
		absR    float64
	}
	var allCorrs []corrEntry

	for inputVar, outcomes := range correlations {
		for outcomeVar, result := range outcomes {
			if result != nil {
				absR := result.R
				if absR < 0 {
					absR = -absR
				}
				if absR > 0.4 {
					allCorrs = append(allCorrs, corrEntry{inputVar, outcomeVar, result.R, absR})
				}
			}
		}
	}

	// Sort by absolute correlation descending and take top 3
	for i := 0; i < len(allCorrs); i++ {
		for j := i + 1; j < len(allCorrs); j++ {
			if allCorrs[j].absR > allCorrs[i].absR {
				allCorrs[i], allCorrs[j] = allCorrs[j], allCorrs[i]
			}
		}
	}

	for i := 0; i < len(allCorrs) && i < 3; i++ {
		entry := allCorrs[i]
		insight := models.Insight{
			Input:   entry.input,
			Outcome: entry.outcome,
			R:       entry.r,
		}

		if entry.r >= 0.7 {
			insight.Type = models.InsightTypeStrongPositive
			insight.Message = generateInsightMessage(entry.input, entry.outcome, entry.r)
		} else if entry.r <= -0.7 {
			insight.Type = models.InsightTypeStrongNegative
			insight.Message = generateInsightMessage(entry.input, entry.outcome, entry.r)
		} else if entry.r >= 0.4 {
			insight.Type = models.InsightTypeModeratePositive
			insight.Message = generateInsightMessage(entry.input, entry.outcome, entry.r)
		} else if entry.r <= -0.4 {
			insight.Type = models.InsightTypeModerateNegative
			insight.Message = generateInsightMessage(entry.input, entry.outcome, entry.r)
		}

		insights = append(insights, insight)
	}

	// Check for missing data warnings
	for _, inputVar := range inputVars {
		count := countNonNilValues(responses, inputVar)
		if count < len(responses)/2 {
			warnings = append(warnings, models.Warning{
				Type:    models.WarningTypeMissingData,
				Field:   inputVar,
				N:       count,
				Message: formatVarName(inputVar) + " data is missing from most experiments",
			})
		}
	}

	return &models.AnalyzeExperimentsResponse{
		Correlations:    correlations,
		Inputs:          inputVars,
		Outcomes:        outcomeVars,
		ExperimentCount: len(experiments),
		Insights:        insights,
		Warnings:        warnings,
	}, nil
}

// AnalyzeDetail returns scatter plot data for a specific correlation
func (s *ExperimentService) AnalyzeDetail(ctx context.Context, userID uuid.UUID, input *models.AnalyzeDetailInput) (*models.AnalyzeDetailResponse, error) {
	// Fetch all experiments by IDs
	experiments, err := s.experimentRepo.GetByIDs(ctx, userID, input.ExperimentIDs)
	if err != nil {
		return nil, err
	}

	if len(experiments) != len(input.ExperimentIDs) {
		return nil, errors.New("one or more experiments not found")
	}

	// Collect coffee IDs and fetch coffees
	coffeeIDs := make(map[uuid.UUID]bool)
	for _, exp := range experiments {
		if exp.CoffeeID != nil {
			coffeeIDs[*exp.CoffeeID] = true
		}
	}

	coffeesMap := make(map[uuid.UUID]*models.CoffeeResponse)
	for coffeeID := range coffeeIDs {
		coffee, err := s.coffeeGetter.GetByID(ctx, userID, coffeeID)
		if err == nil {
			coffeesMap[coffeeID] = coffee
		}
	}

	// Build experiment responses
	responses := make([]models.ExperimentResponse, len(experiments))
	for i, exp := range experiments {
		var coffeeResp *models.CoffeeResponse
		if exp.CoffeeID != nil {
			coffeeResp = coffeesMap[*exp.CoffeeID]
		}
		daysOffRoast := s.calculateDaysOffRoast(coffeeResp, exp)
		responses[i] = models.ExperimentResponse{
			ID:                  exp.ID,
			BrewDate:            exp.BrewDate,
			CoffeeWeight:        exp.CoffeeWeight,
			WaterWeight:         exp.WaterWeight,
			WaterTemperature:    exp.WaterTemperature,
			BloomTime:           exp.BloomTime,
			TotalBrewTime:       exp.TotalBrewTime,
			DaysOffRoast:        daysOffRoast,
			OverallScore:        exp.OverallScore,
			AcidityIntensity:    exp.AcidityIntensity,
			SweetnessIntensity:  exp.SweetnessIntensity,
			BitternessIntensity: exp.BitternessIntensity,
			BodyWeight:          exp.BodyWeight,
			AromaIntensity:      exp.AromaIntensity,
			TDS:                 exp.TDS,
			ExtractionYield:     exp.ExtractionYield,
			Coffee:              coffeeResp,
		}
	}

	// Extract values for the specific correlation
	xVals, yVals := extractPairValues(responses, input.InputVariable, input.OutcomeVariable)
	r, n, p := pearsonCorrelation(xVals, yVals)

	// Build scatter data
	scatterData := []models.ScatterPoint{}
	scatterExperiments := []models.ScatterExperiment{}

	for _, resp := range responses {
		xVal := getVarValue(resp, input.InputVariable)
		yVal := getVarValue(resp, input.OutcomeVariable)
		if xVal != nil && yVal != nil {
			scatterData = append(scatterData, models.ScatterPoint{
				X:            *xVal,
				Y:            *yVal,
				ExperimentID: resp.ID,
			})

			coffeeName := ""
			if resp.Coffee != nil {
				coffeeName = resp.Coffee.Name
			}

			scatterExperiments = append(scatterExperiments, models.ScatterExperiment{
				ID:           resp.ID,
				BrewDate:     resp.BrewDate.Format("2006-01-02"),
				CoffeeName:   coffeeName,
				InputValue:   *xVal,
				OutcomeValue: *yVal,
			})
		}
	}

	interpretation := interpretCorrelation(r)
	insight := generateInsightMessage(input.InputVariable, input.OutcomeVariable, r)

	return &models.AnalyzeDetailResponse{
		InputVariable:   input.InputVariable,
		OutcomeVariable: input.OutcomeVariable,
		Correlation: &models.CorrelationDetail{
			R:              r,
			N:              n,
			P:              p,
			Interpretation: interpretation,
		},
		ScatterData: scatterData,
		Insight:     insight,
		Experiments: scatterExperiments,
	}, nil
}

// extractPairValues extracts paired x,y values for two variables
func extractPairValues(experiments []models.ExperimentResponse, inputVar, outcomeVar string) ([]float64, []float64) {
	xVals := []float64{}
	yVals := []float64{}

	for _, exp := range experiments {
		xVal := getVarValue(exp, inputVar)
		yVal := getVarValue(exp, outcomeVar)
		if xVal != nil && yVal != nil {
			xVals = append(xVals, *xVal)
			yVals = append(yVals, *yVal)
		}
	}

	return xVals, yVals
}

// getVarValue extracts a specific variable value from an experiment response
func getVarValue(exp models.ExperimentResponse, varName string) *float64 {
	switch varName {
	case "coffee_weight":
		return exp.CoffeeWeight
	case "water_weight":
		return exp.WaterWeight
	case "water_temperature":
		return exp.WaterTemperature
	case "bloom_time":
		if exp.BloomTime != nil {
			v := float64(*exp.BloomTime)
			return &v
		}
	case "total_brew_time":
		if exp.TotalBrewTime != nil {
			v := float64(*exp.TotalBrewTime)
			return &v
		}
	case "days_off_roast":
		if exp.DaysOffRoast != nil {
			v := float64(*exp.DaysOffRoast)
			return &v
		}
	case "overall_score":
		if exp.OverallScore != nil {
			v := float64(*exp.OverallScore)
			return &v
		}
	case "acidity_intensity":
		if exp.AcidityIntensity != nil {
			v := float64(*exp.AcidityIntensity)
			return &v
		}
	case "sweetness_intensity":
		if exp.SweetnessIntensity != nil {
			v := float64(*exp.SweetnessIntensity)
			return &v
		}
	case "bitterness_intensity":
		if exp.BitternessIntensity != nil {
			v := float64(*exp.BitternessIntensity)
			return &v
		}
	case "body_weight":
		if exp.BodyWeight != nil {
			v := float64(*exp.BodyWeight)
			return &v
		}
	case "aroma_intensity":
		if exp.AromaIntensity != nil {
			v := float64(*exp.AromaIntensity)
			return &v
		}
	case "tds":
		return exp.TDS
	case "extraction_yield":
		return exp.ExtractionYield
	}
	return nil
}

// countNonNilValues counts how many experiments have a non-nil value for a variable
func countNonNilValues(experiments []models.ExperimentResponse, varName string) int {
	count := 0
	for _, exp := range experiments {
		if getVarValue(exp, varName) != nil {
			count++
		}
	}
	return count
}

// pearsonCorrelation calculates Pearson correlation coefficient, sample count, and p-value
func pearsonCorrelation(x, y []float64) (r float64, n int, p float64) {
	n = len(x)
	if n < 3 || n != len(y) {
		return 0, n, 1
	}

	// Calculate means
	var sumX, sumY float64
	for i := 0; i < n; i++ {
		sumX += x[i]
		sumY += y[i]
	}
	meanX := sumX / float64(n)
	meanY := sumY / float64(n)

	// Calculate correlation
	var sumXY, sumX2, sumY2 float64
	for i := 0; i < n; i++ {
		dx := x[i] - meanX
		dy := y[i] - meanY
		sumXY += dx * dy
		sumX2 += dx * dx
		sumY2 += dy * dy
	}

	if sumX2 == 0 || sumY2 == 0 {
		return 0, n, 1 // No variance
	}

	r = sumXY / (sqrt(sumX2) * sqrt(sumY2))

	// Calculate p-value using t-distribution approximation
	if r == 1 || r == -1 {
		p = 0
	} else {
		t := r * sqrt(float64(n-2)) / sqrt(1-r*r)
		// Use simplified p-value approximation based on t-statistic
		p = tDistPValue(t, n-2)
	}

	return r, n, p
}

// sqrt is a simple square root implementation using Newton's method
func sqrt(x float64) float64 {
	if x < 0 {
		return 0
	}
	if x == 0 {
		return 0
	}
	z := x / 2
	for i := 0; i < 20; i++ {
		z = z - (z*z-x)/(2*z)
	}
	return z
}

// tDistPValue approximates the two-tailed p-value from a t-statistic
func tDistPValue(t float64, df int) float64 {
	if t < 0 {
		t = -t
	}
	// Simplified approximation using Student's t-distribution
	// For large df, approaches normal distribution
	x := float64(df) / (float64(df) + t*t)
	// Incomplete beta function approximation
	p := incompleteBeta(float64(df)/2, 0.5, x)
	return p
}

// incompleteBeta is a simple approximation of the regularized incomplete beta function
func incompleteBeta(a, b, x float64) float64 {
	// Use a series approximation for I_x(a, b)
	if x < 0 || x > 1 {
		return 0
	}
	if x == 0 {
		return 0
	}
	if x == 1 {
		return 1
	}

	// Continued fraction representation (simplified)
	// For our use case, this approximation is sufficient
	bt := exp(lnGamma(a+b) - lnGamma(a) - lnGamma(b) + a*ln(x) + b*ln(1-x))
	if x < (a+1)/(a+b+2) {
		return bt * betaCF(a, b, x) / a
	}
	return 1 - bt*betaCF(b, a, 1-x)/b
}

// betaCF evaluates continued fraction for incomplete beta
func betaCF(a, b, x float64) float64 {
	const maxIter = 100
	const epsilon = 1e-10

	qab := a + b
	qap := a + 1
	qam := a - 1
	c := 1.0
	d := 1 - qab*x/qap
	if abs(d) < epsilon {
		d = epsilon
	}
	d = 1 / d
	h := d

	for m := 1; m <= maxIter; m++ {
		m2 := 2 * m
		aa := float64(m) * (b - float64(m)) * x / ((qam + float64(m2)) * (a + float64(m2)))
		d = 1 + aa*d
		if abs(d) < epsilon {
			d = epsilon
		}
		c = 1 + aa/c
		if abs(c) < epsilon {
			c = epsilon
		}
		d = 1 / d
		h *= d * c
		aa = -(a + float64(m)) * (qab + float64(m)) * x / ((a + float64(m2)) * (qap + float64(m2)))
		d = 1 + aa*d
		if abs(d) < epsilon {
			d = epsilon
		}
		c = 1 + aa/c
		if abs(c) < epsilon {
			c = epsilon
		}
		d = 1 / d
		del := d * c
		h *= del
		if abs(del-1) < epsilon {
			break
		}
	}
	return h
}

// abs returns absolute value
func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

// ln returns natural logarithm (simplified for positive values)
func ln(x float64) float64 {
	if x <= 0 {
		return -1e10
	}
	// Use log(1+y) series where y = (x-1)/(x+1)
	y := (x - 1) / (x + 1)
	y2 := y * y
	result := 0.0
	term := y
	for i := 1; i <= 50; i += 2 {
		result += term / float64(i)
		term *= y2
	}
	return 2 * result
}

// exp returns e^x (simplified)
func exp(x float64) float64 {
	if x > 700 {
		return 1e300
	}
	if x < -700 {
		return 0
	}
	// Taylor series
	result := 1.0
	term := 1.0
	for i := 1; i <= 50; i++ {
		term *= x / float64(i)
		result += term
	}
	return result
}

// lnGamma approximates ln(Gamma(x)) using Stirling's approximation
func lnGamma(x float64) float64 {
	if x <= 0 {
		return 0
	}
	// Stirling's approximation: ln(Gamma(x)) ≈ (x-0.5)*ln(x) - x + 0.5*ln(2*pi) + series
	return (x-0.5)*ln(x) - x + 0.9189385332 // 0.5*ln(2*pi) ≈ 0.9189385332
}

// formatVarName converts snake_case to human-readable format
func formatVarName(name string) string {
	switch name {
	case "coffee_weight":
		return "Coffee weight"
	case "water_weight":
		return "Water weight"
	case "water_temperature":
		return "Water temperature"
	case "bloom_time":
		return "Bloom time"
	case "total_brew_time":
		return "Total brew time"
	case "days_off_roast":
		return "Days off roast"
	case "overall_score":
		return "Overall score"
	case "acidity_intensity":
		return "Acidity"
	case "sweetness_intensity":
		return "Sweetness"
	case "bitterness_intensity":
		return "Bitterness"
	case "body_weight":
		return "Body"
	case "aroma_intensity":
		return "Aroma"
	case "tds":
		return "TDS"
	case "extraction_yield":
		return "Extraction yield"
	default:
		return name
	}
}

// interpretCorrelation returns a human-readable interpretation of the correlation
func interpretCorrelation(r float64) string {
	absR := r
	if absR < 0 {
		absR = -absR
	}

	strength := ""
	if absR >= 0.7 {
		strength = "strong"
	} else if absR >= 0.4 {
		strength = "moderate"
	} else if absR >= 0.1 {
		strength = "weak"
	} else {
		return "No correlation"
	}

	direction := "positive"
	if r < 0 {
		direction = "negative"
	}

	return strength + " " + direction + " correlation"
}

// generateInsightMessage creates a human-readable insight message
func generateInsightMessage(inputVar, outcomeVar string, r float64) string {
	input := formatVarName(inputVar)
	outcome := formatVarName(outcomeVar)

	if r >= 0.7 {
		return "Higher " + input + " is strongly associated with higher " + outcome
	} else if r <= -0.7 {
		return "Higher " + input + " is strongly associated with lower " + outcome
	} else if r >= 0.4 {
		return "Higher " + input + " tends to correlate with higher " + outcome
	} else if r <= -0.4 {
		return "Higher " + input + " tends to correlate with lower " + outcome
	}
	return ""
}
