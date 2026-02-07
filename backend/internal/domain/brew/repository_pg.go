package brew

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
	ErrBrewNotFound = errors.New("brew not found")
	ErrCoffeeNotFound     = errors.New("coffee not found")
)

type PostgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, userID uuid.UUID, input CreateBrewInput) (*Brew, error) {
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

	isDraft := false
	if input.IsDraft != nil {
		isDraft = *input.IsDraft
	}

	brew := &Brew{
		ID:                   uuid.New(),
		UserID:               userID,
		CoffeeID:             input.CoffeeID,
		BrewDate:             brewDate,
		RoastDate:            input.RoastDate,
		CoffeeWeight:         input.CoffeeWeight,
		WaterWeight:          waterWeight,
		Ratio:                input.Ratio,
		GrindSize:            input.GrindSize,
		WaterTemperature:     input.WaterTemperature,
		FilterPaperID:        input.FilterPaperID,
		BloomWater:           input.BloomWater,
		BloomTime:            input.BloomTime,
		TotalBrewTime:        input.TotalBrewTime,
		DrawdownTime:         input.DrawdownTime,
		TechniqueNotes:       input.TechniqueNotes,
		WaterBypassML:        input.WaterBypassML,
		MineralProfileID:     input.MineralProfileID,
		CoffeeMl:             input.CoffeeMl,
		TDS:                  input.TDS,
		ExtractionYield:      input.ExtractionYield,
		IsDraft:              isDraft,
		AromaIntensity:       input.AromaIntensity,
		AromaNotes:           input.AromaNotes,
		BodyIntensity:        input.BodyIntensity,
		BodyNotes:            input.BodyNotes,
		FlavorIntensity:      input.FlavorIntensity,
		FlavorNotes:          input.FlavorNotes,
		BrightnessIntensity:  input.BrightnessIntensity,
		BrightnessNotes:      input.BrightnessNotes,
		SweetnessIntensity:   input.SweetnessIntensity,
		SweetnessNotes:       input.SweetnessNotes,
		CleanlinessIntensity: input.CleanlinessIntensity,
		CleanlinessNotes:     input.CleanlinessNotes,
		ComplexityIntensity:  input.ComplexityIntensity,
		ComplexityNotes:      input.ComplexityNotes,
		BalanceIntensity:     input.BalanceIntensity,
		BalanceNotes:         input.BalanceNotes,
		AftertasteIntensity:  input.AftertasteIntensity,
		AftertasteNotes:      input.AftertasteNotes,
		OverallScore:         input.OverallScore,
		OverallNotes:         input.OverallNotes,
		ImprovementNotes:     input.ImprovementNotes,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	query := `
		INSERT INTO brews (
			id, user_id, coffee_id, brew_date, roast_date,
			coffee_weight, water_weight, ratio, grind_size, water_temperature, filter_paper_id,
			bloom_water, bloom_time, total_brew_time, drawdown_time, technique_notes,
			water_bypass_ml, mineral_profile_id,
			coffee_ml, tds, extraction_yield, is_draft,
			aroma_intensity, aroma_notes, body_intensity, body_notes,
			flavor_intensity, flavor_notes, brightness_intensity, brightness_notes,
			sweetness_intensity, sweetness_notes, cleanliness_intensity, cleanliness_notes,
			complexity_intensity, complexity_notes, balance_intensity, balance_notes,
			aftertaste_intensity, aftertaste_notes,
			overall_score, overall_notes, improvement_notes,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, $11,
			$12, $13, $14, $15, $16,
			$17, $18,
			$19, $20, $21, $22,
			$23, $24, $25, $26,
			$27, $28, $29, $30,
			$31, $32, $33, $34,
			$35, $36, $37, $38,
			$39, $40,
			$41, $42, $43,
			$44, $45
		)
	`

	_, err = tx.ExecContext(ctx, query,
		brew.ID, brew.UserID, brew.CoffeeID, brew.BrewDate, brew.RoastDate,
		brew.CoffeeWeight, brew.WaterWeight, brew.Ratio, brew.GrindSize, brew.WaterTemperature, brew.FilterPaperID,
		brew.BloomWater, brew.BloomTime, brew.TotalBrewTime, brew.DrawdownTime, brew.TechniqueNotes,
		brew.WaterBypassML, brew.MineralProfileID,
		brew.CoffeeMl, brew.TDS, brew.ExtractionYield, brew.IsDraft,
		brew.AromaIntensity, brew.AromaNotes, brew.BodyIntensity, brew.BodyNotes,
		brew.FlavorIntensity, brew.FlavorNotes, brew.BrightnessIntensity, brew.BrightnessNotes,
		brew.SweetnessIntensity, brew.SweetnessNotes, brew.CleanlinessIntensity, brew.CleanlinessNotes,
		brew.ComplexityIntensity, brew.ComplexityNotes, brew.BalanceIntensity, brew.BalanceNotes,
		brew.AftertasteIntensity, brew.AftertasteNotes,
		brew.OverallScore, brew.OverallNotes, brew.ImprovementNotes,
		brew.CreatedAt, brew.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Insert pours
	if len(input.Pours) > 0 {
		for _, pourInput := range input.Pours {
			pour := BrewPour{
				ID:           uuid.New(),
				BrewID: brew.ID,
				PourNumber:   pourInput.PourNumber,
				WaterAmount:  pourInput.WaterAmount,
				PourStyle:    pourInput.PourStyle,
				Notes:        pourInput.Notes,
			}
			_, err = tx.ExecContext(ctx,
				`INSERT INTO brew_pours (id, brew_id, pour_number, water_amount, pour_style, notes)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
				pour.ID, pour.BrewID, pour.PourNumber, pour.WaterAmount, pour.PourStyle, pour.Notes,
			)
			if err != nil {
				return nil, err
			}
			brew.Pours = append(brew.Pours, pour)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Fetch the complete brew with nested data
	return r.GetByID(ctx, userID, brew.ID)
}

func (r *PostgresRepository) GetByID(ctx context.Context, userID, brewID uuid.UUID) (*Brew, error) {
	query := `
		SELECT
			e.id, e.user_id, e.coffee_id, e.brew_date, e.roast_date,
			e.coffee_weight, e.water_weight, e.ratio, e.grind_size, e.water_temperature, e.filter_paper_id,
			e.bloom_water, e.bloom_time, e.total_brew_time, e.drawdown_time, e.technique_notes,
			e.water_bypass_ml, e.mineral_profile_id,
			e.coffee_ml, e.tds, e.extraction_yield, e.is_draft,
			e.aroma_intensity, e.aroma_notes, e.body_intensity, e.body_notes,
			e.flavor_intensity, e.flavor_notes, e.brightness_intensity, e.brightness_notes,
			e.sweetness_intensity, e.sweetness_notes, e.cleanliness_intensity, e.cleanliness_notes,
			e.complexity_intensity, e.complexity_notes, e.balance_intensity, e.balance_notes,
			e.aftertaste_intensity, e.aftertaste_notes,
			e.overall_score, e.overall_notes, e.improvement_notes,
			e.created_at, e.updated_at,
			c.id, c.roaster, c.name, c.roast_date,
			fp.id, fp.name, fp.brand
		FROM brews e
		LEFT JOIN coffees c ON e.coffee_id = c.id
		LEFT JOIN filter_papers fp ON e.filter_paper_id = fp.id
		WHERE e.id = $1 AND e.user_id = $2
	`

	exp := &Brew{}
	var coffee CoffeeSummary
	var filterPaper FilterPaperSummary
	var fpID, fpName, fpBrand sql.NullString

	err := r.db.QueryRowContext(ctx, query, brewID, userID).Scan(
		&exp.ID, &exp.UserID, &exp.CoffeeID, &exp.BrewDate, &exp.RoastDate,
		&exp.CoffeeWeight, &exp.WaterWeight, &exp.Ratio, &exp.GrindSize, &exp.WaterTemperature, &exp.FilterPaperID,
		&exp.BloomWater, &exp.BloomTime, &exp.TotalBrewTime, &exp.DrawdownTime, &exp.TechniqueNotes,
		&exp.WaterBypassML, &exp.MineralProfileID,
		&exp.CoffeeMl, &exp.TDS, &exp.ExtractionYield, &exp.IsDraft,
		&exp.AromaIntensity, &exp.AromaNotes, &exp.BodyIntensity, &exp.BodyNotes,
		&exp.FlavorIntensity, &exp.FlavorNotes, &exp.BrightnessIntensity, &exp.BrightnessNotes,
		&exp.SweetnessIntensity, &exp.SweetnessNotes, &exp.CleanlinessIntensity, &exp.CleanlinessNotes,
		&exp.ComplexityIntensity, &exp.ComplexityNotes, &exp.BalanceIntensity, &exp.BalanceNotes,
		&exp.AftertasteIntensity, &exp.AftertasteNotes,
		&exp.OverallScore, &exp.OverallNotes, &exp.ImprovementNotes,
		&exp.CreatedAt, &exp.UpdatedAt,
		&coffee.ID, &coffee.Roaster, &coffee.Name, &coffee.RoastDate,
		&fpID, &fpName, &fpBrand,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrBrewNotFound
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
	pours, err := r.getPoursByBrewID(ctx, brewID)
	if err != nil {
		return nil, err
	}
	exp.Pours = pours

	exp.CalculateComputedFields()
	return exp, nil
}

func (r *PostgresRepository) getPoursByBrewID(ctx context.Context, brewID uuid.UUID) ([]BrewPour, error) {
	query := `
		SELECT id, brew_id, pour_number, water_amount, pour_style, notes
		FROM brew_pours
		WHERE brew_id = $1
		ORDER BY pour_number
	`

	rows, err := r.db.QueryContext(ctx, query, brewID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pours []BrewPour
	for rows.Next() {
		var p BrewPour
		if err := rows.Scan(&p.ID, &p.BrewID, &p.PourNumber, &p.WaterAmount, &p.PourStyle, &p.Notes); err != nil {
			return nil, err
		}
		pours = append(pours, p)
	}

	if pours == nil {
		pours = []BrewPour{}
	}
	return pours, nil
}

func (r *PostgresRepository) List(ctx context.Context, userID uuid.UUID, params ListBrewsParams) (*ListBrewsResult, error) {
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
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM brews e %s", whereClause)
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
			e.id, e.user_id, e.coffee_id, e.brew_date, e.roast_date,
			e.coffee_weight, e.water_weight, e.ratio, e.grind_size, e.water_temperature, e.filter_paper_id,
			e.bloom_water, e.bloom_time, e.total_brew_time, e.drawdown_time, e.technique_notes,
			e.water_bypass_ml, e.mineral_profile_id,
			e.coffee_ml, e.tds, e.extraction_yield, e.is_draft,
			e.aroma_intensity, e.aroma_notes, e.body_intensity, e.body_notes,
			e.flavor_intensity, e.flavor_notes, e.brightness_intensity, e.brightness_notes,
			e.sweetness_intensity, e.sweetness_notes, e.cleanliness_intensity, e.cleanliness_notes,
			e.complexity_intensity, e.complexity_notes, e.balance_intensity, e.balance_notes,
			e.aftertaste_intensity, e.aftertaste_notes,
			e.overall_score, e.overall_notes, e.improvement_notes,
			e.created_at, e.updated_at,
			c.id, c.roaster, c.name, c.roast_date,
			fp.id, fp.name, fp.brand
		FROM brews e
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

	var brews []Brew
	for rows.Next() {
		var exp Brew
		var coffee CoffeeSummary
		var fpID, fpName, fpBrand sql.NullString

		err := rows.Scan(
			&exp.ID, &exp.UserID, &exp.CoffeeID, &exp.BrewDate, &exp.RoastDate,
			&exp.CoffeeWeight, &exp.WaterWeight, &exp.Ratio, &exp.GrindSize, &exp.WaterTemperature, &exp.FilterPaperID,
			&exp.BloomWater, &exp.BloomTime, &exp.TotalBrewTime, &exp.DrawdownTime, &exp.TechniqueNotes,
			&exp.WaterBypassML, &exp.MineralProfileID,
			&exp.CoffeeMl, &exp.TDS, &exp.ExtractionYield, &exp.IsDraft,
			&exp.AromaIntensity, &exp.AromaNotes, &exp.BodyIntensity, &exp.BodyNotes,
			&exp.FlavorIntensity, &exp.FlavorNotes, &exp.BrightnessIntensity, &exp.BrightnessNotes,
			&exp.SweetnessIntensity, &exp.SweetnessNotes, &exp.CleanlinessIntensity, &exp.CleanlinessNotes,
			&exp.ComplexityIntensity, &exp.ComplexityNotes, &exp.BalanceIntensity, &exp.BalanceNotes,
			&exp.AftertasteIntensity, &exp.AftertasteNotes,
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
		brews = append(brews, exp)
	}

	if brews == nil {
		brews = []Brew{}
	}

	totalPages := total / params.PerPage
	if total%params.PerPage > 0 {
		totalPages++
	}

	return &ListBrewsResult{
		Items: brews,
		Pagination: Pagination{
			Page:       params.Page,
			PerPage:    params.PerPage,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (r *PostgresRepository) Update(ctx context.Context, userID, brewID uuid.UUID, input UpdateBrewInput) (*Brew, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Fetch current brew
	exp, err := r.GetByID(ctx, userID, brewID)
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
	if input.RoastDate != nil {
		exp.RoastDate = input.RoastDate
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
	if input.WaterBypassML != nil {
		exp.WaterBypassML = input.WaterBypassML
	}
	if input.MineralProfileID != nil {
		exp.MineralProfileID = input.MineralProfileID
	}
	if input.CoffeeMl != nil {
		exp.CoffeeMl = input.CoffeeMl
	}
	if input.TDS != nil {
		exp.TDS = input.TDS
	}
	if input.ExtractionYield != nil {
		exp.ExtractionYield = input.ExtractionYield
	}
	if input.IsDraft != nil {
		exp.IsDraft = *input.IsDraft
	}
	if input.AromaIntensity != nil {
		exp.AromaIntensity = input.AromaIntensity
	}
	if input.AromaNotes != nil {
		exp.AromaNotes = input.AromaNotes
	}
	if input.BodyIntensity != nil {
		exp.BodyIntensity = input.BodyIntensity
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
	if input.BrightnessIntensity != nil {
		exp.BrightnessIntensity = input.BrightnessIntensity
	}
	if input.BrightnessNotes != nil {
		exp.BrightnessNotes = input.BrightnessNotes
	}
	if input.SweetnessIntensity != nil {
		exp.SweetnessIntensity = input.SweetnessIntensity
	}
	if input.SweetnessNotes != nil {
		exp.SweetnessNotes = input.SweetnessNotes
	}
	if input.CleanlinessIntensity != nil {
		exp.CleanlinessIntensity = input.CleanlinessIntensity
	}
	if input.CleanlinessNotes != nil {
		exp.CleanlinessNotes = input.CleanlinessNotes
	}
	if input.ComplexityIntensity != nil {
		exp.ComplexityIntensity = input.ComplexityIntensity
	}
	if input.ComplexityNotes != nil {
		exp.ComplexityNotes = input.ComplexityNotes
	}
	if input.BalanceIntensity != nil {
		exp.BalanceIntensity = input.BalanceIntensity
	}
	if input.BalanceNotes != nil {
		exp.BalanceNotes = input.BalanceNotes
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
		UPDATE brews SET
			coffee_id = $1, brew_date = $2, roast_date = $3,
			coffee_weight = $4, water_weight = $5, ratio = $6, grind_size = $7, water_temperature = $8, filter_paper_id = $9,
			bloom_water = $10, bloom_time = $11, total_brew_time = $12, drawdown_time = $13, technique_notes = $14,
			water_bypass_ml = $15, mineral_profile_id = $16,
			coffee_ml = $17, tds = $18, extraction_yield = $19, is_draft = $20,
			aroma_intensity = $21, aroma_notes = $22, body_intensity = $23, body_notes = $24,
			flavor_intensity = $25, flavor_notes = $26, brightness_intensity = $27, brightness_notes = $28,
			sweetness_intensity = $29, sweetness_notes = $30, cleanliness_intensity = $31, cleanliness_notes = $32,
			complexity_intensity = $33, complexity_notes = $34, balance_intensity = $35, balance_notes = $36,
			aftertaste_intensity = $37, aftertaste_notes = $38,
			overall_score = $39, overall_notes = $40, improvement_notes = $41,
			updated_at = $42
		WHERE id = $43 AND user_id = $44
	`

	result, err := tx.ExecContext(ctx, query,
		exp.CoffeeID, exp.BrewDate, exp.RoastDate,
		exp.CoffeeWeight, exp.WaterWeight, exp.Ratio, exp.GrindSize, exp.WaterTemperature, exp.FilterPaperID,
		exp.BloomWater, exp.BloomTime, exp.TotalBrewTime, exp.DrawdownTime, exp.TechniqueNotes,
		exp.WaterBypassML, exp.MineralProfileID,
		exp.CoffeeMl, exp.TDS, exp.ExtractionYield, exp.IsDraft,
		exp.AromaIntensity, exp.AromaNotes, exp.BodyIntensity, exp.BodyNotes,
		exp.FlavorIntensity, exp.FlavorNotes, exp.BrightnessIntensity, exp.BrightnessNotes,
		exp.SweetnessIntensity, exp.SweetnessNotes, exp.CleanlinessIntensity, exp.CleanlinessNotes,
		exp.ComplexityIntensity, exp.ComplexityNotes, exp.BalanceIntensity, exp.BalanceNotes,
		exp.AftertasteIntensity, exp.AftertasteNotes,
		exp.OverallScore, exp.OverallNotes, exp.ImprovementNotes,
		exp.UpdatedAt, brewID, userID,
	)
	if err != nil {
		return nil, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rowsAffected == 0 {
		return nil, ErrBrewNotFound
	}

	// Update pours if provided
	if input.Pours != nil {
		// Delete existing pours
		_, err = tx.ExecContext(ctx, "DELETE FROM brew_pours WHERE brew_id = $1", brewID)
		if err != nil {
			return nil, err
		}

		// Insert new pours
		for _, pourInput := range *input.Pours {
			pour := BrewPour{
				ID:           uuid.New(),
				BrewID: brewID,
				PourNumber:   pourInput.PourNumber,
				WaterAmount:  pourInput.WaterAmount,
				PourStyle:    pourInput.PourStyle,
				Notes:        pourInput.Notes,
			}
			_, err = tx.ExecContext(ctx,
				`INSERT INTO brew_pours (id, brew_id, pour_number, water_amount, pour_style, notes)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
				pour.ID, pour.BrewID, pour.PourNumber, pour.WaterAmount, pour.PourStyle, pour.Notes,
			)
			if err != nil {
				return nil, err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.GetByID(ctx, userID, brewID)
}

func (r *PostgresRepository) Delete(ctx context.Context, userID, brewID uuid.UUID) error {
	query := `
		DELETE FROM brews
		WHERE id = $1 AND user_id = $2
	`

	result, err := r.db.ExecContext(ctx, query, brewID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrBrewNotFound
	}

	return nil
}

func (r *PostgresRepository) GetByIDs(ctx context.Context, userID uuid.UUID, brewIDs []uuid.UUID) ([]Brew, error) {
	if len(brewIDs) == 0 {
		return []Brew{}, nil
	}

	// Build placeholders for IN clause
	placeholders := make([]string, len(brewIDs))
	args := make([]interface{}, len(brewIDs)+1)
	args[0] = userID
	for i, id := range brewIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args[i+1] = id
	}

	query := fmt.Sprintf(`
		SELECT
			e.id, e.user_id, e.coffee_id, e.brew_date, e.roast_date,
			e.coffee_weight, e.water_weight, e.ratio, e.grind_size, e.water_temperature, e.filter_paper_id,
			e.bloom_water, e.bloom_time, e.total_brew_time, e.drawdown_time, e.technique_notes,
			e.water_bypass_ml, e.mineral_profile_id,
			e.coffee_ml, e.tds, e.extraction_yield, e.is_draft,
			e.aroma_intensity, e.aroma_notes, e.body_intensity, e.body_notes,
			e.flavor_intensity, e.flavor_notes, e.brightness_intensity, e.brightness_notes,
			e.sweetness_intensity, e.sweetness_notes, e.cleanliness_intensity, e.cleanliness_notes,
			e.complexity_intensity, e.complexity_notes, e.balance_intensity, e.balance_notes,
			e.aftertaste_intensity, e.aftertaste_notes,
			e.overall_score, e.overall_notes, e.improvement_notes,
			e.created_at, e.updated_at,
			c.id, c.roaster, c.name, c.roast_date,
			fp.id, fp.name, fp.brand
		FROM brews e
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

	var brews []Brew
	for rows.Next() {
		var exp Brew
		var coffee CoffeeSummary
		var fpID, fpName, fpBrand sql.NullString

		err := rows.Scan(
			&exp.ID, &exp.UserID, &exp.CoffeeID, &exp.BrewDate, &exp.RoastDate,
			&exp.CoffeeWeight, &exp.WaterWeight, &exp.Ratio, &exp.GrindSize, &exp.WaterTemperature, &exp.FilterPaperID,
			&exp.BloomWater, &exp.BloomTime, &exp.TotalBrewTime, &exp.DrawdownTime, &exp.TechniqueNotes,
			&exp.WaterBypassML, &exp.MineralProfileID,
			&exp.CoffeeMl, &exp.TDS, &exp.ExtractionYield, &exp.IsDraft,
			&exp.AromaIntensity, &exp.AromaNotes, &exp.BodyIntensity, &exp.BodyNotes,
			&exp.FlavorIntensity, &exp.FlavorNotes, &exp.BrightnessIntensity, &exp.BrightnessNotes,
			&exp.SweetnessIntensity, &exp.SweetnessNotes, &exp.CleanlinessIntensity, &exp.CleanlinessNotes,
			&exp.ComplexityIntensity, &exp.ComplexityNotes, &exp.BalanceIntensity, &exp.BalanceNotes,
			&exp.AftertasteIntensity, &exp.AftertasteNotes,
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

		// Fetch pours for this brew
		pours, err := r.getPoursByBrewID(ctx, exp.ID)
		if err != nil {
			return nil, err
		}
		exp.Pours = pours

		exp.CalculateComputedFields()
		brews = append(brews, exp)
	}

	if brews == nil {
		brews = []Brew{}
	}

	return brews, nil
}

func (r *PostgresRepository) ListAll(ctx context.Context, userID uuid.UUID, params ListBrewsParams) ([]Brew, error) {
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
	} else if len(params.CoffeeIDs) > 0 {
		// Support multiple coffee IDs for filter-based analysis
		placeholders := make([]string, len(params.CoffeeIDs))
		for i, id := range params.CoffeeIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIdx)
			args = append(args, id)
			argIdx++
		}
		conditions = append(conditions, fmt.Sprintf("e.coffee_id IN (%s)", strings.Join(placeholders, ", ")))
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
			e.id, e.user_id, e.coffee_id, e.brew_date, e.roast_date,
			e.coffee_weight, e.water_weight, e.ratio, e.grind_size, e.water_temperature, e.filter_paper_id,
			e.bloom_water, e.bloom_time, e.total_brew_time, e.drawdown_time, e.technique_notes,
			e.water_bypass_ml, e.mineral_profile_id,
			e.coffee_ml, e.tds, e.extraction_yield, e.is_draft,
			e.aroma_intensity, e.aroma_notes, e.body_intensity, e.body_notes,
			e.flavor_intensity, e.flavor_notes, e.brightness_intensity, e.brightness_notes,
			e.sweetness_intensity, e.sweetness_notes, e.cleanliness_intensity, e.cleanliness_notes,
			e.complexity_intensity, e.complexity_notes, e.balance_intensity, e.balance_notes,
			e.aftertaste_intensity, e.aftertaste_notes,
			e.overall_score, e.overall_notes, e.improvement_notes,
			e.created_at, e.updated_at,
			c.id, c.roaster, c.name, c.roast_date,
			fp.id, fp.name, fp.brand
		FROM brews e
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

	var brews []Brew
	for rows.Next() {
		var exp Brew
		var coffee CoffeeSummary
		var fpID, fpName, fpBrand sql.NullString

		err := rows.Scan(
			&exp.ID, &exp.UserID, &exp.CoffeeID, &exp.BrewDate, &exp.RoastDate,
			&exp.CoffeeWeight, &exp.WaterWeight, &exp.Ratio, &exp.GrindSize, &exp.WaterTemperature, &exp.FilterPaperID,
			&exp.BloomWater, &exp.BloomTime, &exp.TotalBrewTime, &exp.DrawdownTime, &exp.TechniqueNotes,
			&exp.WaterBypassML, &exp.MineralProfileID,
			&exp.CoffeeMl, &exp.TDS, &exp.ExtractionYield, &exp.IsDraft,
			&exp.AromaIntensity, &exp.AromaNotes, &exp.BodyIntensity, &exp.BodyNotes,
			&exp.FlavorIntensity, &exp.FlavorNotes, &exp.BrightnessIntensity, &exp.BrightnessNotes,
			&exp.SweetnessIntensity, &exp.SweetnessNotes, &exp.CleanlinessIntensity, &exp.CleanlinessNotes,
			&exp.ComplexityIntensity, &exp.ComplexityNotes, &exp.BalanceIntensity, &exp.BalanceNotes,
			&exp.AftertasteIntensity, &exp.AftertasteNotes,
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
		brews = append(brews, exp)
	}

	if brews == nil {
		brews = []Brew{}
	}

	return brews, nil
}

func (r *PostgresRepository) CopyAsTemplate(ctx context.Context, userID, brewID uuid.UUID) (*Brew, error) {
	// Fetch the original brew
	original, err := r.GetByID(ctx, userID, brewID)
	if err != nil {
		return nil, err
	}

	// Create input with parameters copied, but notes/scores cleared
	input := CreateBrewInput{
		CoffeeID:         original.CoffeeID,
		RoastDate:        original.RoastDate,
		CoffeeWeight:     original.CoffeeWeight,
		WaterWeight:      original.WaterWeight,
		Ratio:            original.Ratio,
		GrindSize:        original.GrindSize,
		WaterTemperature: original.WaterTemperature,
		FilterPaperID:    original.FilterPaperID,
		BloomWater:       original.BloomWater,
		BloomTime:        original.BloomTime,
		TotalBrewTime:    original.TotalBrewTime,
		DrawdownTime:     original.DrawdownTime,
		TechniqueNotes:   original.TechniqueNotes,
		WaterBypassML:    original.WaterBypassML,
		MineralProfileID: original.MineralProfileID,
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
