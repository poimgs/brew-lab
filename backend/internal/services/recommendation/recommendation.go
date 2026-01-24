package recommendation

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
)

var (
	ErrExperimentNotFound = errors.New("experiment not found")
	ErrMappingNotFound    = errors.New("mapping not found")
	ErrNoGapsToAddress    = errors.New("experiment has no gaps to address")
)

// ExperimentGetter interface for getting experiments
type ExperimentGetter interface {
	GetByID(ctx context.Context, userID, experimentID uuid.UUID) (*models.ExperimentResponse, error)
}

// EffectMappingGetter interface for getting effect mappings
type EffectMappingGetter interface {
	GetByID(ctx context.Context, userID, mappingID uuid.UUID) (*models.EffectMappingResponse, error)
	FindRelevant(ctx context.Context, userID uuid.UUID, input *models.FindRelevantInput) (*models.FindRelevantResult, error)
}

// ExperimentCreator interface for creating experiments
type ExperimentCreator interface {
	Create(ctx context.Context, userID uuid.UUID, input *models.CreateExperimentInput) (*models.ExperimentResponse, error)
}

type RecommendationService struct {
	dismissalRepo       *repository.DismissalRepository
	experimentRepo      *repository.ExperimentRepository
	effectMappingGetter EffectMappingGetter
	experimentGetter    ExperimentGetter
	experimentCreator   ExperimentCreator
}

func NewRecommendationService(
	dismissalRepo *repository.DismissalRepository,
	experimentRepo *repository.ExperimentRepository,
	effectMappingGetter EffectMappingGetter,
	experimentGetter ExperimentGetter,
	experimentCreator ExperimentCreator,
) *RecommendationService {
	return &RecommendationService{
		dismissalRepo:       dismissalRepo,
		experimentRepo:      experimentRepo,
		effectMappingGetter: effectMappingGetter,
		experimentGetter:    experimentGetter,
		experimentCreator:   experimentCreator,
	}
}

// GetRecommendations returns ranked recommendations for an experiment
func (s *RecommendationService) GetRecommendations(ctx context.Context, userID uuid.UUID, experimentID uuid.UUID) (*models.RecommendationsResponse, error) {
	// Get the experiment with computed gaps
	experiment, err := s.experimentGetter.GetByID(ctx, userID, experimentID)
	if err != nil {
		if errors.Is(err, repository.ErrExperimentNotFound) {
			return nil, ErrExperimentNotFound
		}
		return nil, err
	}

	// Build gaps input from the experiment's computed gaps
	gaps, gapDirections := s.buildGapsInput(experiment.Gaps)

	// If no gaps, return empty recommendations
	if len(gaps) == 0 {
		return &models.RecommendationsResponse{
			Recommendations: []*models.RecommendationResponse{},
			ExperimentID:    experimentID,
			TotalCount:      0,
		}, nil
	}

	// Find relevant mappings
	result, err := s.effectMappingGetter.FindRelevant(ctx, userID, &models.FindRelevantInput{
		Gaps: gaps,
	})
	if err != nil {
		return nil, err
	}

	// Get dismissed mappings
	dismissedMappingIDs, err := s.dismissalRepo.GetForExperiment(ctx, experimentID, userID)
	if err != nil {
		return nil, err
	}
	dismissedSet := make(map[uuid.UUID]bool)
	for _, id := range dismissedMappingIDs {
		dismissedSet[id] = true
	}

	// Convert to recommendations with scoring
	recommendations := make([]*models.RecommendationResponse, 0, len(result.Mappings))
	for _, mapping := range result.Mappings {
		rec := s.convertToRecommendation(mapping, gapDirections, dismissedSet[mapping.ID])
		recommendations = append(recommendations, rec)
	}

	// Sort by score descending, then by name for consistency
	sort.Slice(recommendations, func(i, j int) bool {
		if recommendations[i].Score != recommendations[j].Score {
			return recommendations[i].Score > recommendations[j].Score
		}
		return recommendations[i].Name < recommendations[j].Name
	})

	return &models.RecommendationsResponse{
		Recommendations: recommendations,
		ExperimentID:    experimentID,
		TotalCount:      len(recommendations),
	}, nil
}

// DismissMapping adds a dismissal for a mapping on an experiment
func (s *RecommendationService) DismissMapping(ctx context.Context, userID, experimentID, mappingID uuid.UUID) error {
	// Verify experiment exists
	_, err := s.experimentRepo.GetByID(ctx, userID, experimentID)
	if err != nil {
		if errors.Is(err, repository.ErrExperimentNotFound) {
			return ErrExperimentNotFound
		}
		return err
	}

	// Verify mapping exists
	_, err = s.effectMappingGetter.GetByID(ctx, userID, mappingID)
	if err != nil {
		if errors.Is(err, repository.ErrEffectMappingNotFound) {
			return ErrMappingNotFound
		}
		return err
	}

	_, err = s.dismissalRepo.Create(ctx, experimentID, mappingID, userID)
	return err
}

// UndoDismissal removes a dismissal for a mapping on an experiment
func (s *RecommendationService) UndoDismissal(ctx context.Context, userID, experimentID, mappingID uuid.UUID) error {
	return s.dismissalRepo.Delete(ctx, experimentID, mappingID, userID)
}

// GetDismissedMappings returns the list of dismissed mapping IDs for an experiment
func (s *RecommendationService) GetDismissedMappings(ctx context.Context, userID, experimentID uuid.UUID) (*models.DismissedMappingsResponse, error) {
	mappingIDs, err := s.dismissalRepo.GetForExperiment(ctx, experimentID, userID)
	if err != nil {
		return nil, err
	}

	return &models.DismissedMappingsResponse{
		MappingIDs: mappingIDs,
	}, nil
}

// TryMapping creates a new experiment based on the source experiment with improvement notes
func (s *RecommendationService) TryMapping(ctx context.Context, userID, experimentID uuid.UUID, input *models.TryMappingInput) (*models.ExperimentResponse, error) {
	// Get the source experiment
	sourceExp, err := s.experimentRepo.GetByID(ctx, userID, experimentID)
	if err != nil {
		if errors.Is(err, repository.ErrExperimentNotFound) {
			return nil, ErrExperimentNotFound
		}
		return nil, err
	}

	// Get the mapping
	mapping, err := s.effectMappingGetter.GetByID(ctx, userID, input.MappingID)
	if err != nil {
		if errors.Is(err, repository.ErrEffectMappingNotFound) {
			return nil, ErrMappingNotFound
		}
		return nil, err
	}

	// Build improvement notes from mapping
	improvementNotes := "Trying: " + mapping.Name + " - " + mapping.TickDescription
	if input.Notes != nil && *input.Notes != "" {
		improvementNotes += "\n\nAdditional notes: " + *input.Notes
	}

	// Create a new experiment with copied pre-brew parameters and improvement notes
	brewDate := time.Now()
	createInput := &models.CreateExperimentInput{
		CoffeeID:           sourceExp.CoffeeID,
		BrewDate:           &brewDate,
		OverallNotes:       "Follow-up experiment for: " + mapping.Name,
		CoffeeWeight:       sourceExp.CoffeeWeight,
		WaterWeight:        sourceExp.WaterWeight,
		Ratio:              sourceExp.Ratio,
		GrindSize:          sourceExp.GrindSize,
		WaterTemperature:   sourceExp.WaterTemperature,
		FilterPaperID:      sourceExp.FilterPaperID,
		BloomWater:         sourceExp.BloomWater,
		BloomTime:          sourceExp.BloomTime,
		Pour1:              sourceExp.Pour1,
		Pour2:              sourceExp.Pour2,
		Pour3:              sourceExp.Pour3,
		TotalBrewTime:      sourceExp.TotalBrewTime,
		DrawdownTime:       sourceExp.DrawdownTime,
		TechniqueNotes:     sourceExp.TechniqueNotes,
		ServingTemperature: sourceExp.ServingTemperature,
		WaterBypass:        sourceExp.WaterBypass,
		MineralAdditions:   sourceExp.MineralAdditions,
		ImprovementNotes:   &improvementNotes,
		// Copy target profile
		TargetAcidity:    sourceExp.TargetAcidity,
		TargetSweetness:  sourceExp.TargetSweetness,
		TargetBitterness: sourceExp.TargetBitterness,
		TargetBody:       sourceExp.TargetBody,
		TargetAroma:      sourceExp.TargetAroma,
	}

	return s.experimentCreator.Create(ctx, userID, createInput)
}

// ListExperimentsWithGaps returns experiments that have target profiles with gaps
func (s *RecommendationService) ListExperimentsWithGaps(ctx context.Context, userID uuid.UUID, page, pageSize int) (*models.ExperimentsWithGapsResponse, error) {
	// Validate pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	// Get all experiments (with targets) to filter for gaps
	// We need experiments with at least one target set and corresponding current value
	params := repository.ExperimentListParams{
		UserID:   userID,
		SortBy:   "brew_date",
		SortDir:  "desc",
		Page:     1,
		PageSize: 500, // Fetch more to filter locally
	}

	result, err := s.experimentRepo.List(ctx, params)
	if err != nil {
		return nil, err
	}

	// Filter experiments with active gaps
	var experimentsWithGaps []*models.ExperimentWithGapsResponse
	for _, exp := range result.Experiments {
		gaps := exp.ComputeGaps()
		if gaps == nil {
			continue
		}

		activeGapCount := s.countActiveGaps(gaps)
		if activeGapCount == 0 {
			continue
		}

		// Get recommendation count for this experiment
		recommendationCount, err := s.getRecommendationCountForExperiment(ctx, userID, exp, gaps)
		if err != nil {
			recommendationCount = 0
		}

		experimentsWithGaps = append(experimentsWithGaps, &models.ExperimentWithGapsResponse{
			ID:                  exp.ID,
			CoffeeID:            exp.CoffeeID,
			BrewDate:            exp.BrewDate,
			OverallNotes:        exp.OverallNotes,
			OverallScore:        exp.OverallScore,
			Gaps:                gaps,
			ActiveGapCount:      activeGapCount,
			RecommendationCount: recommendationCount,
			CreatedAt:           exp.CreatedAt,
		})
	}

	// Calculate pagination
	totalCount := len(experimentsWithGaps)
	totalPages := (totalCount + pageSize - 1) / pageSize
	offset := (page - 1) * pageSize

	// Apply pagination
	endIdx := offset + pageSize
	if endIdx > totalCount {
		endIdx = totalCount
	}
	if offset > totalCount {
		offset = totalCount
	}

	paginatedExperiments := experimentsWithGaps[offset:endIdx]
	if paginatedExperiments == nil {
		paginatedExperiments = []*models.ExperimentWithGapsResponse{}
	}

	return &models.ExperimentsWithGapsResponse{
		Experiments: paginatedExperiments,
		TotalCount:  totalCount,
		Page:        page,
		PageSize:    pageSize,
		TotalPages:  totalPages,
	}, nil
}

// buildGapsInput converts SensoryGaps to a list of GapInput for finding relevant mappings
func (s *RecommendationService) buildGapsInput(gaps *models.SensoryGaps) ([]models.GapInput, map[models.OutputVariable]models.GapDirection) {
	if gaps == nil {
		return nil, nil
	}

	var gapInputs []models.GapInput
	gapDirections := make(map[models.OutputVariable]models.GapDirection)

	addGap := func(gap *models.SensoryGap, variable models.OutputVariable) {
		if gap == nil || gap.Direction == models.GapDirectionOnTarget {
			return
		}
		current := 0.0
		if gap.Current != nil {
			current = float64(*gap.Current)
		}
		target := 0.0
		if gap.Target != nil {
			target = float64(*gap.Target)
		}
		gapInputs = append(gapInputs, models.GapInput{
			OutputVariable: variable,
			CurrentValue:   current,
			TargetValue:    target,
		})
		gapDirections[variable] = gap.Direction
	}

	addGap(gaps.Acidity, models.OutputVariableAcidity)
	addGap(gaps.Sweetness, models.OutputVariableSweetness)
	addGap(gaps.Bitterness, models.OutputVariableBitterness)
	addGap(gaps.Body, models.OutputVariableBody)
	addGap(gaps.Aroma, models.OutputVariableAroma)

	return gapInputs, gapDirections
}

// convertToRecommendation converts an EffectMappingResponse to a RecommendationResponse with scoring
func (s *RecommendationService) convertToRecommendation(mapping *models.EffectMappingResponse, gapDirections map[models.OutputVariable]models.GapDirection, isDismissed bool) *models.RecommendationResponse {
	helpsGaps := make([]string, 0)
	hasConflict := false
	totalConfidenceWeight := 0

	outputVariableLabels := map[models.OutputVariable]string{
		models.OutputVariableAcidity:    "Acidity",
		models.OutputVariableSweetness:  "Sweetness",
		models.OutputVariableBitterness: "Bitterness",
		models.OutputVariableBody:       "Body",
		models.OutputVariableAroma:      "Aroma",
		models.OutputVariableAftertaste: "Aftertaste",
		models.OutputVariableOverall:    "Overall",
	}

	for _, effect := range mapping.Effects {
		if effect.Direction == models.EffectDirectionNone {
			continue
		}

		desiredDirection, hasGap := gapDirections[effect.OutputVariable]
		if !hasGap {
			continue
		}

		// Check if effect direction matches desired direction
		effectMatchesDesired := (desiredDirection == models.GapDirectionIncrease && effect.Direction == models.EffectDirectionIncrease) ||
			(desiredDirection == models.GapDirectionDecrease && effect.Direction == models.EffectDirectionDecrease)

		if effectMatchesDesired {
			label := outputVariableLabels[effect.OutputVariable]
			if label == "" {
				label = string(effect.OutputVariable)
			}
			helpsGaps = append(helpsGaps, label)

			// Add confidence weight
			switch effect.Confidence {
			case models.ConfidenceHigh:
				totalConfidenceWeight += 3
			case models.ConfidenceMedium:
				totalConfidenceWeight += 2
			case models.ConfidenceLow:
				totalConfidenceWeight += 1
			}
		} else {
			// Effect direction is opposite to desired - conflict
			hasConflict = true
		}
	}

	// Calculate score: (helps_count * 10) + confidence_weight - (has_conflict ? 5 : 0)
	helpsCount := len(helpsGaps)
	score := (helpsCount * 10) + totalConfidenceWeight
	if hasConflict {
		score -= 5
	}

	return &models.RecommendationResponse{
		ID:              mapping.ID,
		Name:            mapping.Name,
		Variable:        mapping.Variable,
		Direction:       mapping.Direction,
		TickDescription: mapping.TickDescription,
		Source:          mapping.Source,
		Notes:           mapping.Notes,
		Active:          mapping.Active,
		Effects:         mapping.Effects,
		CreatedAt:       mapping.CreatedAt,
		UpdatedAt:       mapping.UpdatedAt,
		HelpsCount:      helpsCount,
		HelpsGaps:       helpsGaps,
		HasConflict:     hasConflict,
		Score:           score,
		IsDismissed:     isDismissed,
	}
}

// countActiveGaps counts the number of active gaps in SensoryGaps
func (s *RecommendationService) countActiveGaps(gaps *models.SensoryGaps) int {
	count := 0
	if gaps.Acidity != nil && gaps.Acidity.Direction != models.GapDirectionOnTarget {
		count++
	}
	if gaps.Sweetness != nil && gaps.Sweetness.Direction != models.GapDirectionOnTarget {
		count++
	}
	if gaps.Bitterness != nil && gaps.Bitterness.Direction != models.GapDirectionOnTarget {
		count++
	}
	if gaps.Body != nil && gaps.Body.Direction != models.GapDirectionOnTarget {
		count++
	}
	if gaps.Aroma != nil && gaps.Aroma.Direction != models.GapDirectionOnTarget {
		count++
	}
	return count
}

// getRecommendationCountForExperiment returns the number of recommendations for an experiment
func (s *RecommendationService) getRecommendationCountForExperiment(ctx context.Context, userID uuid.UUID, exp *models.Experiment, gaps *models.SensoryGaps) (int, error) {
	gapInputs, _ := s.buildGapsInput(gaps)
	if len(gapInputs) == 0 {
		return 0, nil
	}

	result, err := s.effectMappingGetter.FindRelevant(ctx, userID, &models.FindRelevantInput{
		Gaps: gapInputs,
	})
	if err != nil {
		return 0, err
	}

	return len(result.Mappings), nil
}
