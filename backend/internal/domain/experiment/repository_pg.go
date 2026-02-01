package experiment

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrExperimentNotFound = errors.New("experiment not found")
	ErrCoffeeNotFound     = errors.New("coffee not found")
)

type PostgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, userID uuid.UUID, input CreateExperimentInput) (*Experiment, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Verify coffee exists and belongs to user
	var coffeeExists bool
	err = tx.QueryRowContext(ctx,
		"SELECT EXISTS(SELECT 1 FROM coffees WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL)",
		input.CoffeeID, userID,
	).Scan(&coffeeExists)
	if err != nil {
		return nil, err
	}
	if !coffeeExists {
		return nil, ErrCoffeeNotFound
	}

	// Calculate water_weight if not provided but coffee_weight and ratio are
	waterWeight := input.WaterWeight
	if waterWeight == nil && input.CoffeeWeight != nil && input.Ratio != nil {
		calculated := *input.CoffeeWeight * *input.Ratio
		waterWeight = &calculated
	}

	// Set brew_date to now if not provided
	brewDate := time.Now()
	if input.BrewDate != nil {
		brewDate = *input.BrewDate
	}

	experiment := &Experiment{
		ID:                  uuid.New(),
		UserID:              userID,
		CoffeeID:            input.CoffeeID,
		BrewDate:            brewDate,
		CoffeeWeight:        input.CoffeeWeight,
		WaterWeight:         waterWeight,
		Ratio:               input.Ratio,
		GrindSize:           input.GrindSize,
		WaterTemperature:    input.WaterTemperature,
		FilterPaperID:       input.FilterPaperID,
		BloomWater:          input.BloomWater,
		BloomTime:           input.BloomTime,
		TotalBrewTime:       input.TotalBrewTime,
		DrawdownTime:        input.DrawdownTime,
		TechniqueNotes:      input.TechniqueNotes,
		ServingTemperature:  input.ServingTemperature,
		WaterBypass:         input.WaterBypass,
		MineralAdditions:    input.MineralAdditions,
		FinalWeight:         input.FinalWeight,
		TDS:                 input.TDS,
		ExtractionYield:     input.ExtractionYield,
		AromaIntensity:      input.AromaIntensity,
		AromaNotes:          input.AromaNotes,
		AcidityIntensity:    input.AcidityIntensity,
		AcidityNotes:        input.AcidityNotes,
		SweetnessIntensity:  input.SweetnessIntensity,
		SweetnessNotes:      input.SweetnessNotes,
		BitternessIntensity: input.BitternessIntensity,
		BitternessNotes:     input.BitternessNotes,
		BodyWeight:          input.BodyWeight,
		BodyNotes:           input.BodyNotes,
		FlavorIntensity:     input.FlavorIntensity,
		FlavorNotes:         input.FlavorNotes,
		AftertasteDuration:  input.AftertasteDuration,
		AftertasteIntensity: input.AftertasteIntensity,
		AftertasteNotes:     input.AftertasteNotes,
		OverallScore:        input.OverallScore,
		OverallNotes:        input.OverallNotes,
		ImprovementNotes:    input.ImprovementNotes,
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	query := `
		INSERT INTO experiments (
			id, user_id, coffee_id, brew_date,
			coffee_weight, water_weight, ratio, grind_size, water_temperature, filter_paper_id,
			bloom_water, bloom_time, total_brew_time, drawdown_time, technique_notes,
			serving_temperature, water_bypass, mineral_additions,
			final_weight, tds, extraction_yield,
			aroma_intensity, aroma_notes, acidity_intensity, acidity_notes,
			sweetness_intensity, sweetness_notes, bitterness_intensity, bitterness_notes,
			body_weight, body_notes, flavor_intensity, flavor_notes,
			aftertaste_duration, aftertaste_intensity, aftertaste_notes,
			overall_score, overall_notes, improvement_notes,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15,
			$16, $17, $18,
			$19, $20, $21,
			$22, $23, $24, $25,
			$26, $27, $28, $29,
			$30, $31, $32, $33,
			$34, $35, $36,
			$37, $38, $39,
			$40, $41
		)
	`

	_, err = tx.ExecContext(ctx, query,
		experiment.ID, experiment.UserID, experiment.CoffeeID, experiment.BrewDate,
		experiment.CoffeeWeight, experiment.WaterWeight, experiment.Ratio, experiment.GrindSize, experiment.WaterTemperature, experiment.FilterPaperID,
		experiment.BloomWater, experiment.BloomTime, experiment.TotalBrewTime, experiment.DrawdownTime, experiment.TechniqueNotes,
		experiment.ServingTemperature, experiment.WaterBypass, experiment.MineralAdditions,
		experiment.FinalWeight, experiment.TDS, experiment.ExtractionYield,
		experiment.AromaIntensity, experiment.AromaNotes, experiment.AcidityIntensity, experiment.AcidityNotes,
		experiment.SweetnessIntensity, experiment.SweetnessNotes, experiment.BitternessIntensity, experiment.BitternessNotes,
		experiment.BodyWeight, experiment.BodyNotes, experiment.FlavorIntensity, experiment.FlavorNotes,
		experiment.AftertasteDuration, experiment.AftertasteIntensity, experiment.AftertasteNotes,
		experiment.OverallScore, experiment.OverallNotes, experiment.ImprovementNotes,
		experiment.CreatedAt, experiment.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Insert pours
	if len(input.Pours) > 0 {
		for _, pourInput := range input.Pours {
			pour := ExperimentPour{
				ID:           uuid.New(),
				ExperimentID: experiment.ID,
				PourNumber:   pourInput.PourNumber,
				WaterAmount:  pourInput.WaterAmount,
				PourStyle:    pourInput.PourStyle,
				Notes:        pourInput.Notes,
			}
			_, err = tx.ExecContext(ctx,
				`INSERT INTO experiment_pours (id, experiment_id, pour_number, water_amount, pour_style, notes)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
				pour.ID, pour.ExperimentID, pour.PourNumber, pour.WaterAmount, pour.PourStyle, pour.Notes,
			)
			if err != nil {
				return nil, err
			}
			experiment.Pours = append(experiment.Pours, pour)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Fetch the complete experiment with nested data
	return r.GetByID(ctx, userID, experiment.ID)
}

func (r *PostgresRepository) GetByID(ctx context.Context, userID, experimentID uuid.UUID) (*Experiment, error) {
	query := `
		SELECT
			e.id, e.user_id, e.coffee_id, e.brew_date,
			e.coffee_weight, e.water_weight, e.ratio, e.grind_size, e.water_temperature, e.filter_paper_id,
			e.bloom_water, e.bloom_time, e.total_brew_time, e.drawdown_time, e.technique_notes,
			e.serving_temperature, e.water_bypass, e.mineral_additions,
			e.final_weight, e.tds, e.extraction_yield,
			e.aroma_intensity, e.aroma_notes, e.acidity_intensity, e.acidity_notes,
			e.sweetness_intensity, e.sweetness_notes, e.bitterness_intensity, e.bitterness_notes,
			e.body_weight, e.body_notes, e.flavor_intensity, e.flavor_notes,
			e.aftertaste_duration, e.aftertaste_intensity, e.aftertaste_notes,
			e.overall_score, e.overall_notes, e.improvement_notes,
			e.created_at, e.updated_at,
			c.id, c.roaster, c.name, c.roast_date,
			fp.id, fp.name, fp.brand
		FROM experiments e
		LEFT JOIN coffees c ON e.coffee_id = c.id
		LEFT JOIN filter_papers fp ON e.filter_paper_id = fp.id
		WHERE e.id = $1 AND e.user_id = $2
	`

	exp := &Experiment{}
	var coffee CoffeeSummary
	var filterPaper FilterPaperSummary
	var fpID, fpName, fpBrand sql.NullString

	err := r.db.QueryRowContext(ctx, query, experimentID, userID).Scan(
		&exp.ID, &exp.UserID, &exp.CoffeeID, &exp.BrewDate,
		&exp.CoffeeWeight, &exp.WaterWeight, &exp.Ratio, &exp.GrindSize, &exp.WaterTemperature, &exp.FilterPaperID,
		&exp.BloomWater, &exp.BloomTime, &exp.TotalBrewTime, &exp.DrawdownTime, &exp.TechniqueNotes,
		&exp.ServingTemperature, &exp.WaterBypass, &exp.MineralAdditions,
		&exp.FinalWeight, &exp.TDS, &exp.ExtractionYield,
		&exp.AromaIntensity, &exp.AromaNotes, &exp.AcidityIntensity, &exp.AcidityNotes,
		&exp.SweetnessIntensity, &exp.SweetnessNotes, &exp.BitternessIntensity, &exp.BitternessNotes,
		&exp.BodyWeight, &exp.BodyNotes, &exp.FlavorIntensity, &exp.FlavorNotes,
		&exp.AftertasteDuration, &exp.AftertasteIntensity, &exp.AftertasteNotes,
		&exp.OverallScore, &exp.OverallNotes, &exp.ImprovementNotes,
		&exp.CreatedAt, &exp.UpdatedAt,
		&coffee.ID, &coffee.Roaster, &coffee.Name, &coffee.RoastDate,
		&fpID, &fpName, &fpBrand,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrExperimentNotFound
		}
		return nil, err
	}

	exp.Coffee = &coffee

	if fpID.Valid {
		filterPaper.ID, _ = uuid.Parse(fpID.String)
		filterPaper.Name = fpName.String
		if fpBrand.Valid {
			filterPaper.Brand = &fpBrand.String
		}
		exp.FilterPaper = &filterPaper
	}

	// Fetch pours
	pours, err := r.getPoursByExperimentID(ctx, experimentID)
	if err != nil {
		return nil, err
	}
	exp.Pours = pours

	exp.CalculateComputedFields()
	return exp, nil
}

func (r *PostgresRepository) getPoursByExperimentID(ctx context.Context, experimentID uuid.UUID) ([]ExperimentPour, error) {
	query := `
		SELECT id, experiment_id, pour_number, water_amount, pour_style, notes
		FROM experiment_pours
		WHERE experiment_id = $1
		ORDER BY pour_number
	`

	rows, err := r.db.QueryContext(ctx, query, experimentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pours []ExperimentPour
	for rows.Next() {
		var p ExperimentPour
		if err := rows.Scan(&p.ID, &p.ExperimentID, &p.PourNumber, &p.WaterAmount, &p.PourStyle, &p.Notes); err != nil {
			return nil, err
		}
		pours = append(pours, p)
	}

	if pours == nil {
		pours = []ExperimentPour{}
	}
	return pours, nil
}

func (r *PostgresRepository) List(ctx context.Context, userID uuid.UUID, params ListExperimentsParams) (*ListExperimentsResult, error) {
	params.SetDefaults()

	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("e.user_id = $%d", argIdx))
	args = append(args, userID)
	argIdx++

	if params.CoffeeID != nil {
		conditions = append(conditions, fmt.Sprintf("e.coffee_id = $%d", argIdx))
		args = append(args, *params.CoffeeID)
		argIdx++
	}

	if params.ScoreGTE != nil {
		conditions = append(conditions, fmt.Sprintf("e.overall_score >= $%d", argIdx))
		args = append(args, *params.ScoreGTE)
		argIdx++
	}

	if params.ScoreLTE != nil {
		conditions = append(conditions, fmt.Sprintf("e.overall_score <= $%d", argIdx))
		args = append(args, *params.ScoreLTE)
		argIdx++
	}

	if params.HasTDS {
		conditions = append(conditions, "e.tds IS NOT NULL")
	}

	if params.DateFrom != nil {
		conditions = append(conditions, fmt.Sprintf("e.brew_date >= $%d", argIdx))
		args = append(args, *params.DateFrom)
		argIdx++
	}

	if params.DateTo != nil {
		conditions = append(conditions, fmt.Sprintf("e.brew_date <= $%d", argIdx))
		args = append(args, *params.DateTo)
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM experiments e %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	// Determine sort
	orderBy := "e.brew_date DESC"
	if params.Sort != "" {
		sortField := params.Sort
		sortOrder := "ASC"
		if strings.HasPrefix(sortField, "-") {
			sortField = strings.TrimPrefix(sortField, "-")
			sortOrder = "DESC"
		}
		allowedFields := map[string]string{
			"brew_date":     "e.brew_date",
			"created_at":    "e.created_at",
			"overall_score": "e.overall_score",
		}
		if dbField, ok := allowedFields[sortField]; ok {
			orderBy = fmt.Sprintf("%s %s", dbField, sortOrder)
		}
	}

	offset := (params.Page - 1) * params.PerPage
	listQuery := fmt.Sprintf(`
		SELECT
			e.id, e.user_id, e.coffee_id, e.brew_date,
			e.coffee_weight, e.water_weight, e.ratio, e.grind_size, e.water_temperature, e.filter_paper_id,
			e.bloom_water, e.bloom_time, e.total_brew_time, e.drawdown_time, e.technique_notes,
			e.serving_temperature, e.water_bypass, e.mineral_additions,
			e.final_weight, e.tds, e.extraction_yield,
			e.aroma_intensity, e.aroma_notes, e.acidity_intensity, e.acidity_notes,
			e.sweetness_intensity, e.sweetness_notes, e.bitterness_intensity, e.bitterness_notes,
			e.body_weight, e.body_notes, e.flavor_intensity, e.flavor_notes,
			e.aftertaste_duration, e.aftertaste_intensity, e.aftertaste_notes,
			e.overall_score, e.overall_notes, e.improvement_notes,
			e.created_at, e.updated_at,
			c.id, c.roaster, c.name, c.roast_date,
			fp.id, fp.name, fp.brand
		FROM experiments e
		LEFT JOIN coffees c ON e.coffee_id = c.id
		LEFT JOIN filter_papers fp ON e.filter_paper_id = fp.id
		%s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, argIdx, argIdx+1)

	args = append(args, params.PerPage, offset)

	rows, err := r.db.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var experiments []Experiment
	for rows.Next() {
		var exp Experiment
		var coffee CoffeeSummary
		var fpID, fpName, fpBrand sql.NullString

		err := rows.Scan(
			&exp.ID, &exp.UserID, &exp.CoffeeID, &exp.BrewDate,
			&exp.CoffeeWeight, &exp.WaterWeight, &exp.Ratio, &exp.GrindSize, &exp.WaterTemperature, &exp.FilterPaperID,
			&exp.BloomWater, &exp.BloomTime, &exp.TotalBrewTime, &exp.DrawdownTime, &exp.TechniqueNotes,
			&exp.ServingTemperature, &exp.WaterBypass, &exp.MineralAdditions,
			&exp.FinalWeight, &exp.TDS, &exp.ExtractionYield,
			&exp.AromaIntensity, &exp.AromaNotes, &exp.AcidityIntensity, &exp.AcidityNotes,
			&exp.SweetnessIntensity, &exp.SweetnessNotes, &exp.BitternessIntensity, &exp.BitternessNotes,
			&exp.BodyWeight, &exp.BodyNotes, &exp.FlavorIntensity, &exp.FlavorNotes,
			&exp.AftertasteDuration, &exp.AftertasteIntensity, &exp.AftertasteNotes,
			&exp.OverallScore, &exp.OverallNotes, &exp.ImprovementNotes,
			&exp.CreatedAt, &exp.UpdatedAt,
			&coffee.ID, &coffee.Roaster, &coffee.Name, &coffee.RoastDate,
			&fpID, &fpName, &fpBrand,
		)
		if err != nil {
			return nil, err
		}

		exp.Coffee = &coffee

		if fpID.Valid {
			var filterPaper FilterPaperSummary
			filterPaper.ID, _ = uuid.Parse(fpID.String)
			filterPaper.Name = fpName.String
			if fpBrand.Valid {
				filterPaper.Brand = &fpBrand.String
			}
			exp.FilterPaper = &filterPaper
		}

		exp.CalculateComputedFields()
		experiments = append(experiments, exp)
	}

	if experiments == nil {
		experiments = []Experiment{}
	}

	totalPages := total / params.PerPage
	if total%params.PerPage > 0 {
		totalPages++
	}

	return &ListExperimentsResult{
		Items: experiments,
		Pagination: Pagination{
			Page:       params.Page,
			PerPage:    params.PerPage,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (r *PostgresRepository) Update(ctx context.Context, userID, experimentID uuid.UUID, input UpdateExperimentInput) (*Experiment, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Fetch current experiment
	exp, err := r.GetByID(ctx, userID, experimentID)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if input.CoffeeID != nil {
		// Verify new coffee exists
		var coffeeExists bool
		err = tx.QueryRowContext(ctx,
			"SELECT EXISTS(SELECT 1 FROM coffees WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL)",
			*input.CoffeeID, userID,
		).Scan(&coffeeExists)
		if err != nil {
			return nil, err
		}
		if !coffeeExists {
			return nil, ErrCoffeeNotFound
		}
		exp.CoffeeID = *input.CoffeeID
	}

	if input.BrewDate != nil {
		exp.BrewDate = *input.BrewDate
	}
	if input.CoffeeWeight != nil {
		exp.CoffeeWeight = input.CoffeeWeight
	}
	if input.WaterWeight != nil {
		exp.WaterWeight = input.WaterWeight
	}
	if input.Ratio != nil {
		exp.Ratio = input.Ratio
	}
	if input.GrindSize != nil {
		exp.GrindSize = input.GrindSize
	}
	if input.WaterTemperature != nil {
		exp.WaterTemperature = input.WaterTemperature
	}
	if input.FilterPaperID != nil {
		exp.FilterPaperID = input.FilterPaperID
	}
	if input.BloomWater != nil {
		exp.BloomWater = input.BloomWater
	}
	if input.BloomTime != nil {
		exp.BloomTime = input.BloomTime
	}
	if input.TotalBrewTime != nil {
		exp.TotalBrewTime = input.TotalBrewTime
	}
	if input.DrawdownTime != nil {
		exp.DrawdownTime = input.DrawdownTime
	}
	if input.TechniqueNotes != nil {
		exp.TechniqueNotes = input.TechniqueNotes
	}
	if input.ServingTemperature != nil {
		exp.ServingTemperature = input.ServingTemperature
	}
	if input.WaterBypass != nil {
		exp.WaterBypass = input.WaterBypass
	}
	if input.MineralAdditions != nil {
		exp.MineralAdditions = input.MineralAdditions
	}
	if input.FinalWeight != nil {
		exp.FinalWeight = input.FinalWeight
	}
	if input.TDS != nil {
		exp.TDS = input.TDS
	}
	if input.ExtractionYield != nil {
		exp.ExtractionYield = input.ExtractionYield
	}
	if input.AromaIntensity != nil {
		exp.AromaIntensity = input.AromaIntensity
	}
	if input.AromaNotes != nil {
		exp.AromaNotes = input.AromaNotes
	}
	if input.AcidityIntensity != nil {
		exp.AcidityIntensity = input.AcidityIntensity
	}
	if input.AcidityNotes != nil {
		exp.AcidityNotes = input.AcidityNotes
	}
	if input.SweetnessIntensity != nil {
		exp.SweetnessIntensity = input.SweetnessIntensity
	}
	if input.SweetnessNotes != nil {
		exp.SweetnessNotes = input.SweetnessNotes
	}
	if input.BitternessIntensity != nil {
		exp.BitternessIntensity = input.BitternessIntensity
	}
	if input.BitternessNotes != nil {
		exp.BitternessNotes = input.BitternessNotes
	}
	if input.BodyWeight != nil {
		exp.BodyWeight = input.BodyWeight
	}
	if input.BodyNotes != nil {
		exp.BodyNotes = input.BodyNotes
	}
	if input.FlavorIntensity != nil {
		exp.FlavorIntensity = input.FlavorIntensity
	}
	if input.FlavorNotes != nil {
		exp.FlavorNotes = input.FlavorNotes
	}
	if input.AftertasteDuration != nil {
		exp.AftertasteDuration = input.AftertasteDuration
	}
	if input.AftertasteIntensity != nil {
		exp.AftertasteIntensity = input.AftertasteIntensity
	}
	if input.AftertasteNotes != nil {
		exp.AftertasteNotes = input.AftertasteNotes
	}
	if input.OverallScore != nil {
		exp.OverallScore = input.OverallScore
	}
	if input.OverallNotes != nil {
		exp.OverallNotes = *input.OverallNotes
	}
	if input.ImprovementNotes != nil {
		exp.ImprovementNotes = input.ImprovementNotes
	}

	exp.UpdatedAt = time.Now()

	query := `
		UPDATE experiments SET
			coffee_id = $1, brew_date = $2,
			coffee_weight = $3, water_weight = $4, ratio = $5, grind_size = $6, water_temperature = $7, filter_paper_id = $8,
			bloom_water = $9, bloom_time = $10, total_brew_time = $11, drawdown_time = $12, technique_notes = $13,
			serving_temperature = $14, water_bypass = $15, mineral_additions = $16,
			final_weight = $17, tds = $18, extraction_yield = $19,
			aroma_intensity = $20, aroma_notes = $21, acidity_intensity = $22, acidity_notes = $23,
			sweetness_intensity = $24, sweetness_notes = $25, bitterness_intensity = $26, bitterness_notes = $27,
			body_weight = $28, body_notes = $29, flavor_intensity = $30, flavor_notes = $31,
			aftertaste_duration = $32, aftertaste_intensity = $33, aftertaste_notes = $34,
			overall_score = $35, overall_notes = $36, improvement_notes = $37,
			updated_at = $38
		WHERE id = $39 AND user_id = $40
	`

	result, err := tx.ExecContext(ctx, query,
		exp.CoffeeID, exp.BrewDate,
		exp.CoffeeWeight, exp.WaterWeight, exp.Ratio, exp.GrindSize, exp.WaterTemperature, exp.FilterPaperID,
		exp.BloomWater, exp.BloomTime, exp.TotalBrewTime, exp.DrawdownTime, exp.TechniqueNotes,
		exp.ServingTemperature, exp.WaterBypass, exp.MineralAdditions,
		exp.FinalWeight, exp.TDS, exp.ExtractionYield,
		exp.AromaIntensity, exp.AromaNotes, exp.AcidityIntensity, exp.AcidityNotes,
		exp.SweetnessIntensity, exp.SweetnessNotes, exp.BitternessIntensity, exp.BitternessNotes,
		exp.BodyWeight, exp.BodyNotes, exp.FlavorIntensity, exp.FlavorNotes,
		exp.AftertasteDuration, exp.AftertasteIntensity, exp.AftertasteNotes,
		exp.OverallScore, exp.OverallNotes, exp.ImprovementNotes,
		exp.UpdatedAt, experimentID, userID,
	)
	if err != nil {
		return nil, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rowsAffected == 0 {
		return nil, ErrExperimentNotFound
	}

	// Update pours if provided
	if input.Pours != nil {
		// Delete existing pours
		_, err = tx.ExecContext(ctx, "DELETE FROM experiment_pours WHERE experiment_id = $1", experimentID)
		if err != nil {
			return nil, err
		}

		// Insert new pours
		for _, pourInput := range *input.Pours {
			pour := ExperimentPour{
				ID:           uuid.New(),
				ExperimentID: experimentID,
				PourNumber:   pourInput.PourNumber,
				WaterAmount:  pourInput.WaterAmount,
				PourStyle:    pourInput.PourStyle,
				Notes:        pourInput.Notes,
			}
			_, err = tx.ExecContext(ctx,
				`INSERT INTO experiment_pours (id, experiment_id, pour_number, water_amount, pour_style, notes)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
				pour.ID, pour.ExperimentID, pour.PourNumber, pour.WaterAmount, pour.PourStyle, pour.Notes,
			)
			if err != nil {
				return nil, err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.GetByID(ctx, userID, experimentID)
}

func (r *PostgresRepository) Delete(ctx context.Context, userID, experimentID uuid.UUID) error {
	query := `
		DELETE FROM experiments
		WHERE id = $1 AND user_id = $2
	`

	result, err := r.db.ExecContext(ctx, query, experimentID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrExperimentNotFound
	}

	return nil
}

func (r *PostgresRepository) GetByIDs(ctx context.Context, userID uuid.UUID, experimentIDs []uuid.UUID) ([]Experiment, error) {
	if len(experimentIDs) == 0 {
		return []Experiment{}, nil
	}

	// Build placeholders for IN clause
	placeholders := make([]string, len(experimentIDs))
	args := make([]interface{}, len(experimentIDs)+1)
	args[0] = userID
	for i, id := range experimentIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args[i+1] = id
	}

	query := fmt.Sprintf(`
		SELECT
			e.id, e.user_id, e.coffee_id, e.brew_date,
			e.coffee_weight, e.water_weight, e.ratio, e.grind_size, e.water_temperature, e.filter_paper_id,
			e.bloom_water, e.bloom_time, e.total_brew_time, e.drawdown_time, e.technique_notes,
			e.serving_temperature, e.water_bypass, e.mineral_additions,
			e.final_weight, e.tds, e.extraction_yield,
			e.aroma_intensity, e.aroma_notes, e.acidity_intensity, e.acidity_notes,
			e.sweetness_intensity, e.sweetness_notes, e.bitterness_intensity, e.bitterness_notes,
			e.body_weight, e.body_notes, e.flavor_intensity, e.flavor_notes,
			e.aftertaste_duration, e.aftertaste_intensity, e.aftertaste_notes,
			e.overall_score, e.overall_notes, e.improvement_notes,
			e.created_at, e.updated_at,
			c.id, c.roaster, c.name, c.roast_date,
			fp.id, fp.name, fp.brand
		FROM experiments e
		LEFT JOIN coffees c ON e.coffee_id = c.id
		LEFT JOIN filter_papers fp ON e.filter_paper_id = fp.id
		WHERE e.user_id = $1 AND e.id IN (%s)
		ORDER BY e.brew_date ASC
	`, strings.Join(placeholders, ", "))

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var experiments []Experiment
	for rows.Next() {
		var exp Experiment
		var coffee CoffeeSummary
		var fpID, fpName, fpBrand sql.NullString

		err := rows.Scan(
			&exp.ID, &exp.UserID, &exp.CoffeeID, &exp.BrewDate,
			&exp.CoffeeWeight, &exp.WaterWeight, &exp.Ratio, &exp.GrindSize, &exp.WaterTemperature, &exp.FilterPaperID,
			&exp.BloomWater, &exp.BloomTime, &exp.TotalBrewTime, &exp.DrawdownTime, &exp.TechniqueNotes,
			&exp.ServingTemperature, &exp.WaterBypass, &exp.MineralAdditions,
			&exp.FinalWeight, &exp.TDS, &exp.ExtractionYield,
			&exp.AromaIntensity, &exp.AromaNotes, &exp.AcidityIntensity, &exp.AcidityNotes,
			&exp.SweetnessIntensity, &exp.SweetnessNotes, &exp.BitternessIntensity, &exp.BitternessNotes,
			&exp.BodyWeight, &exp.BodyNotes, &exp.FlavorIntensity, &exp.FlavorNotes,
			&exp.AftertasteDuration, &exp.AftertasteIntensity, &exp.AftertasteNotes,
			&exp.OverallScore, &exp.OverallNotes, &exp.ImprovementNotes,
			&exp.CreatedAt, &exp.UpdatedAt,
			&coffee.ID, &coffee.Roaster, &coffee.Name, &coffee.RoastDate,
			&fpID, &fpName, &fpBrand,
		)
		if err != nil {
			return nil, err
		}

		exp.Coffee = &coffee

		if fpID.Valid {
			var filterPaper FilterPaperSummary
			filterPaper.ID, _ = uuid.Parse(fpID.String)
			filterPaper.Name = fpName.String
			if fpBrand.Valid {
				filterPaper.Brand = &fpBrand.String
			}
			exp.FilterPaper = &filterPaper
		}

		// Fetch pours for this experiment
		pours, err := r.getPoursByExperimentID(ctx, exp.ID)
		if err != nil {
			return nil, err
		}
		exp.Pours = pours

		exp.CalculateComputedFields()
		experiments = append(experiments, exp)
	}

	if experiments == nil {
		experiments = []Experiment{}
	}

	return experiments, nil
}

func (r *PostgresRepository) ListAll(ctx context.Context, userID uuid.UUID, params ListExperimentsParams) ([]Experiment, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("e.user_id = $%d", argIdx))
	args = append(args, userID)
	argIdx++

	if params.CoffeeID != nil {
		conditions = append(conditions, fmt.Sprintf("e.coffee_id = $%d", argIdx))
		args = append(args, *params.CoffeeID)
		argIdx++
	}

	if params.ScoreGTE != nil {
		conditions = append(conditions, fmt.Sprintf("e.overall_score >= $%d", argIdx))
		args = append(args, *params.ScoreGTE)
		argIdx++
	}

	if params.ScoreLTE != nil {
		conditions = append(conditions, fmt.Sprintf("e.overall_score <= $%d", argIdx))
		args = append(args, *params.ScoreLTE)
		argIdx++
	}

	if params.HasTDS {
		conditions = append(conditions, "e.tds IS NOT NULL")
	}

	if params.DateFrom != nil {
		conditions = append(conditions, fmt.Sprintf("e.brew_date >= $%d", argIdx))
		args = append(args, *params.DateFrom)
		argIdx++
	}

	if params.DateTo != nil {
		conditions = append(conditions, fmt.Sprintf("e.brew_date <= $%d", argIdx))
		args = append(args, *params.DateTo)
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Determine sort
	orderBy := "e.brew_date DESC"
	if params.Sort != "" {
		sortField := params.Sort
		sortOrder := "ASC"
		if strings.HasPrefix(sortField, "-") {
			sortField = strings.TrimPrefix(sortField, "-")
			sortOrder = "DESC"
		}
		allowedFields := map[string]string{
			"brew_date":     "e.brew_date",
			"created_at":    "e.created_at",
			"overall_score": "e.overall_score",
		}
		if dbField, ok := allowedFields[sortField]; ok {
			orderBy = fmt.Sprintf("%s %s", dbField, sortOrder)
		}
	}

	listQuery := fmt.Sprintf(`
		SELECT
			e.id, e.user_id, e.coffee_id, e.brew_date,
			e.coffee_weight, e.water_weight, e.ratio, e.grind_size, e.water_temperature, e.filter_paper_id,
			e.bloom_water, e.bloom_time, e.total_brew_time, e.drawdown_time, e.technique_notes,
			e.serving_temperature, e.water_bypass, e.mineral_additions,
			e.final_weight, e.tds, e.extraction_yield,
			e.aroma_intensity, e.aroma_notes, e.acidity_intensity, e.acidity_notes,
			e.sweetness_intensity, e.sweetness_notes, e.bitterness_intensity, e.bitterness_notes,
			e.body_weight, e.body_notes, e.flavor_intensity, e.flavor_notes,
			e.aftertaste_duration, e.aftertaste_intensity, e.aftertaste_notes,
			e.overall_score, e.overall_notes, e.improvement_notes,
			e.created_at, e.updated_at,
			c.id, c.roaster, c.name, c.roast_date,
			fp.id, fp.name, fp.brand
		FROM experiments e
		LEFT JOIN coffees c ON e.coffee_id = c.id
		LEFT JOIN filter_papers fp ON e.filter_paper_id = fp.id
		%s
		ORDER BY %s
	`, whereClause, orderBy)

	rows, err := r.db.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var experiments []Experiment
	for rows.Next() {
		var exp Experiment
		var coffee CoffeeSummary
		var fpID, fpName, fpBrand sql.NullString

		err := rows.Scan(
			&exp.ID, &exp.UserID, &exp.CoffeeID, &exp.BrewDate,
			&exp.CoffeeWeight, &exp.WaterWeight, &exp.Ratio, &exp.GrindSize, &exp.WaterTemperature, &exp.FilterPaperID,
			&exp.BloomWater, &exp.BloomTime, &exp.TotalBrewTime, &exp.DrawdownTime, &exp.TechniqueNotes,
			&exp.ServingTemperature, &exp.WaterBypass, &exp.MineralAdditions,
			&exp.FinalWeight, &exp.TDS, &exp.ExtractionYield,
			&exp.AromaIntensity, &exp.AromaNotes, &exp.AcidityIntensity, &exp.AcidityNotes,
			&exp.SweetnessIntensity, &exp.SweetnessNotes, &exp.BitternessIntensity, &exp.BitternessNotes,
			&exp.BodyWeight, &exp.BodyNotes, &exp.FlavorIntensity, &exp.FlavorNotes,
			&exp.AftertasteDuration, &exp.AftertasteIntensity, &exp.AftertasteNotes,
			&exp.OverallScore, &exp.OverallNotes, &exp.ImprovementNotes,
			&exp.CreatedAt, &exp.UpdatedAt,
			&coffee.ID, &coffee.Roaster, &coffee.Name, &coffee.RoastDate,
			&fpID, &fpName, &fpBrand,
		)
		if err != nil {
			return nil, err
		}

		exp.Coffee = &coffee

		if fpID.Valid {
			var filterPaper FilterPaperSummary
			filterPaper.ID, _ = uuid.Parse(fpID.String)
			filterPaper.Name = fpName.String
			if fpBrand.Valid {
				filterPaper.Brand = &fpBrand.String
			}
			exp.FilterPaper = &filterPaper
		}

		exp.CalculateComputedFields()
		experiments = append(experiments, exp)
	}

	if experiments == nil {
		experiments = []Experiment{}
	}

	return experiments, nil
}

func (r *PostgresRepository) CopyAsTemplate(ctx context.Context, userID, experimentID uuid.UUID) (*Experiment, error) {
	// Fetch the original experiment
	original, err := r.GetByID(ctx, userID, experimentID)
	if err != nil {
		return nil, err
	}

	// Create input with parameters copied, but notes/scores cleared
	input := CreateExperimentInput{
		CoffeeID:           original.CoffeeID,
		CoffeeWeight:       original.CoffeeWeight,
		WaterWeight:        original.WaterWeight,
		Ratio:              original.Ratio,
		GrindSize:          original.GrindSize,
		WaterTemperature:   original.WaterTemperature,
		FilterPaperID:      original.FilterPaperID,
		BloomWater:         original.BloomWater,
		BloomTime:          original.BloomTime,
		TotalBrewTime:      original.TotalBrewTime,
		DrawdownTime:       original.DrawdownTime,
		TechniqueNotes:     original.TechniqueNotes,
		ServingTemperature: original.ServingTemperature,
		WaterBypass:        original.WaterBypass,
		MineralAdditions:   original.MineralAdditions,
		// Clear sensory and overall data - these need to be entered fresh
		OverallNotes: "", // Will be filled in by user
	}

	// Copy pours
	for _, pour := range original.Pours {
		input.Pours = append(input.Pours, CreatePourInput{
			PourNumber:  pour.PourNumber,
			WaterAmount: pour.WaterAmount,
			PourStyle:   pour.PourStyle,
			Notes:       pour.Notes,
		})
	}

	return r.Create(ctx, userID, input)
}
