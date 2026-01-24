package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
)

var ErrExperimentNotFound = errors.New("experiment not found")

type ExperimentRepository struct {
	pool *pgxpool.Pool
}

func NewExperimentRepository(pool *pgxpool.Pool) *ExperimentRepository {
	return &ExperimentRepository{pool: pool}
}

var experimentColumns = `id, user_id, coffee_id, brew_date, overall_notes, overall_score,
	coffee_weight, water_weight, ratio, grind_size, water_temperature, filter_type,
	bloom_water, bloom_time, pour_1, pour_2, pour_3, total_brew_time, drawdown_time, technique_notes,
	serving_temperature, water_bypass, mineral_additions,
	final_weight, tds, extraction_yield,
	aroma_intensity, acidity_intensity, sweetness_intensity, bitterness_intensity, body_weight, aftertaste_duration, aftertaste_intensity,
	aroma_notes, flavor_notes, aftertaste_notes,
	improvement_notes, created_at, updated_at`

func scanExperiment(row pgx.Row) (*models.Experiment, error) {
	exp := &models.Experiment{}
	err := row.Scan(
		&exp.ID, &exp.UserID, &exp.CoffeeID, &exp.BrewDate, &exp.OverallNotes, &exp.OverallScore,
		&exp.CoffeeWeight, &exp.WaterWeight, &exp.Ratio, &exp.GrindSize, &exp.WaterTemperature, &exp.FilterType,
		&exp.BloomWater, &exp.BloomTime, &exp.Pour1, &exp.Pour2, &exp.Pour3, &exp.TotalBrewTime, &exp.DrawdownTime, &exp.TechniqueNotes,
		&exp.ServingTemperature, &exp.WaterBypass, &exp.MineralAdditions,
		&exp.FinalWeight, &exp.TDS, &exp.ExtractionYield,
		&exp.AromaIntensity, &exp.AcidityIntensity, &exp.SweetnessIntensity, &exp.BitternessIntensity, &exp.BodyWeight, &exp.AftertasteDuration, &exp.AftertasteIntensity,
		&exp.AromaNotes, &exp.FlavorNotes, &exp.AftertasteNotes,
		&exp.ImprovementNotes, &exp.CreatedAt, &exp.UpdatedAt,
	)
	return exp, err
}

func scanExperimentRows(rows pgx.Rows) (*models.Experiment, error) {
	exp := &models.Experiment{}
	err := rows.Scan(
		&exp.ID, &exp.UserID, &exp.CoffeeID, &exp.BrewDate, &exp.OverallNotes, &exp.OverallScore,
		&exp.CoffeeWeight, &exp.WaterWeight, &exp.Ratio, &exp.GrindSize, &exp.WaterTemperature, &exp.FilterType,
		&exp.BloomWater, &exp.BloomTime, &exp.Pour1, &exp.Pour2, &exp.Pour3, &exp.TotalBrewTime, &exp.DrawdownTime, &exp.TechniqueNotes,
		&exp.ServingTemperature, &exp.WaterBypass, &exp.MineralAdditions,
		&exp.FinalWeight, &exp.TDS, &exp.ExtractionYield,
		&exp.AromaIntensity, &exp.AcidityIntensity, &exp.SweetnessIntensity, &exp.BitternessIntensity, &exp.BodyWeight, &exp.AftertasteDuration, &exp.AftertasteIntensity,
		&exp.AromaNotes, &exp.FlavorNotes, &exp.AftertasteNotes,
		&exp.ImprovementNotes, &exp.CreatedAt, &exp.UpdatedAt,
	)
	return exp, err
}

func (r *ExperimentRepository) Create(ctx context.Context, userID uuid.UUID, input models.CreateExperimentInput) (*models.Experiment, error) {
	brewDate := time.Now()
	if input.BrewDate != nil {
		brewDate = *input.BrewDate
	}

	query := fmt.Sprintf(`
		INSERT INTO experiments (
			user_id, coffee_id, brew_date, overall_notes, overall_score,
			coffee_weight, water_weight, ratio, grind_size, water_temperature, filter_type,
			bloom_water, bloom_time, pour_1, pour_2, pour_3, total_brew_time, drawdown_time, technique_notes,
			serving_temperature, water_bypass, mineral_additions,
			final_weight, tds, extraction_yield,
			aroma_intensity, acidity_intensity, sweetness_intensity, bitterness_intensity, body_weight, aftertaste_duration, aftertaste_intensity,
			aroma_notes, flavor_notes, aftertaste_notes,
			improvement_notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)
		RETURNING %s
	`, experimentColumns)

	exp, err := scanExperiment(r.pool.QueryRow(ctx, query,
		userID, input.CoffeeID, brewDate, input.OverallNotes, input.OverallScore,
		input.CoffeeWeight, input.WaterWeight, input.Ratio, input.GrindSize, input.WaterTemperature, input.FilterType,
		input.BloomWater, input.BloomTime, input.Pour1, input.Pour2, input.Pour3, input.TotalBrewTime, input.DrawdownTime, input.TechniqueNotes,
		input.ServingTemperature, input.WaterBypass, input.MineralAdditions,
		input.FinalWeight, input.TDS, input.ExtractionYield,
		input.AromaIntensity, input.AcidityIntensity, input.SweetnessIntensity, input.BitternessIntensity, input.BodyWeight, input.AftertasteDuration, input.AftertasteIntensity,
		input.AromaNotes, input.FlavorNotes, input.AftertasteNotes,
		input.ImprovementNotes,
	))

	if err != nil {
		return nil, err
	}

	return exp, nil
}

func (r *ExperimentRepository) GetByID(ctx context.Context, userID, experimentID uuid.UUID) (*models.Experiment, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM experiments
		WHERE id = $1 AND user_id = $2
	`, experimentColumns)

	exp, err := scanExperiment(r.pool.QueryRow(ctx, query, experimentID, userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrExperimentNotFound
		}
		return nil, err
	}

	return exp, nil
}

type ExperimentListParams struct {
	UserID   uuid.UUID
	Filter   models.ExperimentFilter
	SortBy   string
	SortDir  string
	Page     int
	PageSize int
}

type ExperimentListResult struct {
	Experiments []*models.Experiment
	TotalCount  int
	Page        int
	PageSize    int
	TotalPages  int
}

func (r *ExperimentRepository) List(ctx context.Context, params ExperimentListParams) (*ExperimentListResult, error) {
	var conditions []string
	var args []interface{}
	argCount := 1

	conditions = append(conditions, fmt.Sprintf("e.user_id = $%d", argCount))
	args = append(args, params.UserID)
	argCount++

	if params.Filter.CoffeeID != nil {
		conditions = append(conditions, fmt.Sprintf("e.coffee_id = $%d", argCount))
		args = append(args, *params.Filter.CoffeeID)
		argCount++
	}

	if params.Filter.ScoreGTE != nil {
		conditions = append(conditions, fmt.Sprintf("e.overall_score >= $%d", argCount))
		args = append(args, *params.Filter.ScoreGTE)
		argCount++
	}

	if params.Filter.ScoreLTE != nil {
		conditions = append(conditions, fmt.Sprintf("e.overall_score <= $%d", argCount))
		args = append(args, *params.Filter.ScoreLTE)
		argCount++
	}

	if params.Filter.HasTDS != nil {
		if *params.Filter.HasTDS {
			conditions = append(conditions, "e.tds IS NOT NULL")
		} else {
			conditions = append(conditions, "e.tds IS NULL")
		}
	}

	if params.Filter.DateFrom != nil {
		conditions = append(conditions, fmt.Sprintf("e.brew_date >= $%d", argCount))
		args = append(args, *params.Filter.DateFrom)
		argCount++
	}

	if params.Filter.DateTo != nil {
		conditions = append(conditions, fmt.Sprintf("e.brew_date <= $%d", argCount))
		args = append(args, *params.Filter.DateTo)
		argCount++
	}

	// Tag filtering requires a subquery
	if len(params.Filter.Tags) > 0 {
		conditions = append(conditions, fmt.Sprintf(`
			EXISTS (
				SELECT 1 FROM experiment_tags et
				INNER JOIN issue_tags t ON et.tag_id = t.id
				WHERE et.experiment_id = e.id AND t.name = ANY($%d)
			)
		`, argCount))
		args = append(args, params.Filter.Tags)
		argCount++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count total
	var totalCount int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM experiments e WHERE %s", whereClause)
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, err
	}

	// Validate and set sort
	sortBy := "brew_date"
	validSortFields := map[string]bool{"brew_date": true, "created_at": true, "overall_score": true}
	if params.SortBy != "" && validSortFields[params.SortBy] {
		sortBy = params.SortBy
	}

	sortDir := "DESC"
	if params.SortDir == "asc" {
		sortDir = "ASC"
	}

	// Pagination
	page := params.Page
	if page < 1 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	// Build main query
	query := fmt.Sprintf(`
		SELECT e.%s
		FROM experiments e
		WHERE %s
		ORDER BY e.%s %s
		LIMIT $%d OFFSET $%d
	`, strings.ReplaceAll(experimentColumns, "\n", ""), whereClause, sortBy, sortDir, argCount, argCount+1)

	args = append(args, pageSize, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	experiments := make([]*models.Experiment, 0)
	for rows.Next() {
		exp, err := scanExperimentRows(rows)
		if err != nil {
			return nil, err
		}
		experiments = append(experiments, exp)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	totalPages := (totalCount + pageSize - 1) / pageSize

	return &ExperimentListResult{
		Experiments: experiments,
		TotalCount:  totalCount,
		Page:        page,
		PageSize:    pageSize,
		TotalPages:  totalPages,
	}, nil
}

func (r *ExperimentRepository) Update(ctx context.Context, userID, experimentID uuid.UUID, input models.UpdateExperimentInput) (*models.Experiment, error) {
	// First get the existing experiment
	existing, err := r.GetByID(ctx, userID, experimentID)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if input.CoffeeID != nil {
		existing.CoffeeID = input.CoffeeID
	}
	if input.BrewDate != nil {
		existing.BrewDate = *input.BrewDate
	}
	if input.OverallNotes != nil {
		existing.OverallNotes = *input.OverallNotes
	}
	if input.OverallScore != nil {
		existing.OverallScore = input.OverallScore
	}
	if input.CoffeeWeight != nil {
		existing.CoffeeWeight = input.CoffeeWeight
	}
	if input.WaterWeight != nil {
		existing.WaterWeight = input.WaterWeight
	}
	if input.Ratio != nil {
		existing.Ratio = input.Ratio
	}
	if input.GrindSize != nil {
		existing.GrindSize = input.GrindSize
	}
	if input.WaterTemperature != nil {
		existing.WaterTemperature = input.WaterTemperature
	}
	if input.FilterType != nil {
		existing.FilterType = input.FilterType
	}
	if input.BloomWater != nil {
		existing.BloomWater = input.BloomWater
	}
	if input.BloomTime != nil {
		existing.BloomTime = input.BloomTime
	}
	if input.Pour1 != nil {
		existing.Pour1 = input.Pour1
	}
	if input.Pour2 != nil {
		existing.Pour2 = input.Pour2
	}
	if input.Pour3 != nil {
		existing.Pour3 = input.Pour3
	}
	if input.TotalBrewTime != nil {
		existing.TotalBrewTime = input.TotalBrewTime
	}
	if input.DrawdownTime != nil {
		existing.DrawdownTime = input.DrawdownTime
	}
	if input.TechniqueNotes != nil {
		existing.TechniqueNotes = input.TechniqueNotes
	}
	if input.ServingTemperature != nil {
		existing.ServingTemperature = input.ServingTemperature
	}
	if input.WaterBypass != nil {
		existing.WaterBypass = input.WaterBypass
	}
	if input.MineralAdditions != nil {
		existing.MineralAdditions = input.MineralAdditions
	}
	if input.FinalWeight != nil {
		existing.FinalWeight = input.FinalWeight
	}
	if input.TDS != nil {
		existing.TDS = input.TDS
	}
	if input.ExtractionYield != nil {
		existing.ExtractionYield = input.ExtractionYield
	}
	if input.AromaIntensity != nil {
		existing.AromaIntensity = input.AromaIntensity
	}
	if input.AcidityIntensity != nil {
		existing.AcidityIntensity = input.AcidityIntensity
	}
	if input.SweetnessIntensity != nil {
		existing.SweetnessIntensity = input.SweetnessIntensity
	}
	if input.BitternessIntensity != nil {
		existing.BitternessIntensity = input.BitternessIntensity
	}
	if input.BodyWeight != nil {
		existing.BodyWeight = input.BodyWeight
	}
	if input.AftertasteDuration != nil {
		existing.AftertasteDuration = input.AftertasteDuration
	}
	if input.AftertasteIntensity != nil {
		existing.AftertasteIntensity = input.AftertasteIntensity
	}
	if input.AromaNotes != nil {
		existing.AromaNotes = input.AromaNotes
	}
	if input.FlavorNotes != nil {
		existing.FlavorNotes = input.FlavorNotes
	}
	if input.AftertasteNotes != nil {
		existing.AftertasteNotes = input.AftertasteNotes
	}
	if input.ImprovementNotes != nil {
		existing.ImprovementNotes = input.ImprovementNotes
	}

	query := fmt.Sprintf(`
		UPDATE experiments SET
			coffee_id = $1, brew_date = $2, overall_notes = $3, overall_score = $4,
			coffee_weight = $5, water_weight = $6, ratio = $7, grind_size = $8, water_temperature = $9, filter_type = $10,
			bloom_water = $11, bloom_time = $12, pour_1 = $13, pour_2 = $14, pour_3 = $15, total_brew_time = $16, drawdown_time = $17, technique_notes = $18,
			serving_temperature = $19, water_bypass = $20, mineral_additions = $21,
			final_weight = $22, tds = $23, extraction_yield = $24,
			aroma_intensity = $25, acidity_intensity = $26, sweetness_intensity = $27, bitterness_intensity = $28, body_weight = $29, aftertaste_duration = $30, aftertaste_intensity = $31,
			aroma_notes = $32, flavor_notes = $33, aftertaste_notes = $34,
			improvement_notes = $35, updated_at = NOW()
		WHERE id = $36 AND user_id = $37
		RETURNING %s
	`, experimentColumns)

	exp, err := scanExperiment(r.pool.QueryRow(ctx, query,
		existing.CoffeeID, existing.BrewDate, existing.OverallNotes, existing.OverallScore,
		existing.CoffeeWeight, existing.WaterWeight, existing.Ratio, existing.GrindSize, existing.WaterTemperature, existing.FilterType,
		existing.BloomWater, existing.BloomTime, existing.Pour1, existing.Pour2, existing.Pour3, existing.TotalBrewTime, existing.DrawdownTime, existing.TechniqueNotes,
		existing.ServingTemperature, existing.WaterBypass, existing.MineralAdditions,
		existing.FinalWeight, existing.TDS, existing.ExtractionYield,
		existing.AromaIntensity, existing.AcidityIntensity, existing.SweetnessIntensity, existing.BitternessIntensity, existing.BodyWeight, existing.AftertasteDuration, existing.AftertasteIntensity,
		existing.AromaNotes, existing.FlavorNotes, existing.AftertasteNotes,
		existing.ImprovementNotes,
		experimentID, userID,
	))

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrExperimentNotFound
		}
		return nil, err
	}

	return exp, nil
}

func (r *ExperimentRepository) Delete(ctx context.Context, userID, experimentID uuid.UUID) error {
	result, err := r.pool.Exec(ctx, `
		DELETE FROM experiments
		WHERE id = $1 AND user_id = $2
	`, experimentID, userID)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrExperimentNotFound
	}

	return nil
}

func (r *ExperimentRepository) Copy(ctx context.Context, userID, experimentID uuid.UUID) (*models.Experiment, error) {
	// Get the source experiment
	source, err := r.GetByID(ctx, userID, experimentID)
	if err != nil {
		return nil, err
	}

	// Create a copy with new ID, today's date, no notes/score
	query := fmt.Sprintf(`
		INSERT INTO experiments (
			user_id, coffee_id, brew_date, overall_notes, overall_score,
			coffee_weight, water_weight, ratio, grind_size, water_temperature, filter_type,
			bloom_water, bloom_time, pour_1, pour_2, pour_3, total_brew_time, drawdown_time, technique_notes,
			serving_temperature, water_bypass, mineral_additions,
			final_weight, tds, extraction_yield,
			aroma_intensity, acidity_intensity, sweetness_intensity, bitterness_intensity, body_weight, aftertaste_duration, aftertaste_intensity,
			aroma_notes, flavor_notes, aftertaste_notes,
			improvement_notes
		)
		VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
		RETURNING %s
	`, experimentColumns)

	exp, err := scanExperiment(r.pool.QueryRow(ctx, query,
		userID, source.CoffeeID, time.Now(), "",
		source.CoffeeWeight, source.WaterWeight, source.Ratio, source.GrindSize, source.WaterTemperature, source.FilterType,
		source.BloomWater, source.BloomTime, source.Pour1, source.Pour2, source.Pour3, source.TotalBrewTime, source.DrawdownTime, source.TechniqueNotes,
		source.ServingTemperature, source.WaterBypass, source.MineralAdditions,
	))

	if err != nil {
		return nil, err
	}

	return exp, nil
}

func (r *ExperimentRepository) GetLatestForCoffee(ctx context.Context, userID, coffeeID uuid.UUID) (*models.Experiment, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM experiments
		WHERE user_id = $1 AND coffee_id = $2
		ORDER BY brew_date DESC, created_at DESC
		LIMIT 1
	`, experimentColumns)

	exp, err := scanExperiment(r.pool.QueryRow(ctx, query, userID, coffeeID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrExperimentNotFound
		}
		return nil, err
	}

	return exp, nil
}

func (r *ExperimentRepository) CountForCoffee(ctx context.Context, coffeeID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM experiments WHERE coffee_id = $1`, coffeeID).Scan(&count)
	return count, err
}

func (r *ExperimentRepository) GetLastBrewedForCoffee(ctx context.Context, coffeeID uuid.UUID) (*time.Time, error) {
	var lastBrewed time.Time
	err := r.pool.QueryRow(ctx, `
		SELECT MAX(brew_date)
		FROM experiments
		WHERE coffee_id = $1
	`, coffeeID).Scan(&lastBrewed)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if lastBrewed.IsZero() {
		return nil, nil
	}

	return &lastBrewed, nil
}
