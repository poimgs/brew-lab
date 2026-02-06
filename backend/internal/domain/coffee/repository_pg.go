package coffee

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

var (
	ErrCoffeeNotFound = errors.New("coffee not found")
)

type PostgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, userID uuid.UUID, input CreateCoffeeInput) (*Coffee, error) {
	coffee := &Coffee{
		ID:           uuid.New(),
		UserID:       userID,
		Roaster:      input.Roaster,
		Name:         input.Name,
		Country:      input.Country,
		Farm:         input.Farm,
		Process:      input.Process,
		RoastLevel:   input.RoastLevel,
		TastingNotes: input.TastingNotes,
		RoastDate:    input.RoastDate,
		Notes:        input.Notes,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	query := `
		INSERT INTO coffees (
			id, user_id, roaster, name, country, farm, process, roast_level,
			tasting_notes, roast_date, notes, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	_, err := r.db.ExecContext(ctx, query,
		coffee.ID, coffee.UserID, coffee.Roaster, coffee.Name,
		coffee.Country, coffee.Farm, coffee.Process, coffee.RoastLevel,
		coffee.TastingNotes, coffee.RoastDate, coffee.Notes,
		coffee.CreatedAt, coffee.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	coffee.CalculateDaysOffRoast()
	return coffee, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, userID, coffeeID uuid.UUID) (*Coffee, error) {
	query := `
		SELECT id, user_id, roaster, name, country, farm, process, roast_level,
			tasting_notes, roast_date, notes, best_experiment_id,
			archived_at, deleted_at, created_at, updated_at
		FROM coffees
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	coffee := &Coffee{}
	err := r.db.QueryRowContext(ctx, query, coffeeID, userID).Scan(
		&coffee.ID, &coffee.UserID, &coffee.Roaster, &coffee.Name,
		&coffee.Country, &coffee.Farm, &coffee.Process, &coffee.RoastLevel,
		&coffee.TastingNotes, &coffee.RoastDate, &coffee.Notes,
		&coffee.BestExperimentID, &coffee.ArchivedAt, &coffee.DeletedAt,
		&coffee.CreatedAt, &coffee.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCoffeeNotFound
		}
		return nil, err
	}

	coffee.CalculateDaysOffRoast()
	return coffee, nil
}

func (r *PostgresRepository) List(ctx context.Context, userID uuid.UUID, params ListCoffeesParams) (*ListCoffeesResult, error) {
	params.SetDefaults()

	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("user_id = $%d", argIdx))
	args = append(args, userID)
	argIdx++

	if !params.IncludeDeleted {
		conditions = append(conditions, "deleted_at IS NULL")
	}

	if !params.IncludeArchived {
		conditions = append(conditions, "archived_at IS NULL")
	}

	if params.Roaster != "" {
		conditions = append(conditions, fmt.Sprintf("roaster = $%d", argIdx))
		args = append(args, params.Roaster)
		argIdx++
	}

	if params.Country != "" {
		conditions = append(conditions, fmt.Sprintf("country = $%d", argIdx))
		args = append(args, params.Country)
		argIdx++
	}

	if params.Process != "" {
		conditions = append(conditions, fmt.Sprintf("process = $%d", argIdx))
		args = append(args, params.Process)
		argIdx++
	}

	if params.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(roaster ILIKE $%d OR name ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+params.Search+"%")
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM coffees %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	// Determine sort
	orderBy := "created_at DESC"
	if params.Sort != "" {
		sortField := params.Sort
		sortOrder := "ASC"
		if strings.HasPrefix(sortField, "-") {
			sortField = strings.TrimPrefix(sortField, "-")
			sortOrder = "DESC"
		}
		allowedFields := map[string]bool{
			"created_at": true, "updated_at": true, "roaster": true,
			"name": true, "country": true, "roast_date": true,
		}
		if allowedFields[sortField] {
			orderBy = fmt.Sprintf("%s %s", sortField, sortOrder)
		}
	}

	offset := (params.Page - 1) * params.PerPage
	listQuery := fmt.Sprintf(`
		SELECT id, user_id, roaster, name, country, farm, process, roast_level,
			tasting_notes, roast_date, notes, best_experiment_id,
			archived_at, deleted_at, created_at, updated_at
		FROM coffees
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

	var coffees []Coffee
	for rows.Next() {
		var c Coffee
		err := rows.Scan(
			&c.ID, &c.UserID, &c.Roaster, &c.Name,
			&c.Country, &c.Farm, &c.Process, &c.RoastLevel,
			&c.TastingNotes, &c.RoastDate, &c.Notes,
			&c.BestExperimentID, &c.ArchivedAt, &c.DeletedAt, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		c.CalculateDaysOffRoast()
		coffees = append(coffees, c)
	}

	if coffees == nil {
		coffees = []Coffee{}
	}

	// Enrich coffees with best experiment data and improvement notes
	if len(coffees) > 0 {
		coffeeMap := make(map[uuid.UUID]*Coffee, len(coffees))
		for i := range coffees {
			coffeeMap[coffees[i].ID] = &coffees[i]
		}

		if err := r.populateBestExperiments(ctx, userID, coffeeMap); err != nil {
			return nil, err
		}
		if err := r.populateImprovementNotes(ctx, userID, coffeeMap); err != nil {
			return nil, err
		}
	}

	totalPages := total / params.PerPage
	if total%params.PerPage > 0 {
		totalPages++
	}

	return &ListCoffeesResult{
		Items: coffees,
		Pagination: Pagination{
			Page:       params.Page,
			PerPage:    params.PerPage,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (r *PostgresRepository) Update(ctx context.Context, userID, coffeeID uuid.UUID, input UpdateCoffeeInput) (*Coffee, error) {
	// First fetch the current coffee
	coffee, err := r.GetByID(ctx, userID, coffeeID)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if input.Roaster != nil {
		coffee.Roaster = *input.Roaster
	}
	if input.Name != nil {
		coffee.Name = *input.Name
	}
	if input.Country != nil {
		coffee.Country = input.Country
	}
	if input.Farm != nil {
		coffee.Farm = input.Farm
	}
	if input.Process != nil {
		coffee.Process = input.Process
	}
	if input.RoastLevel != nil {
		coffee.RoastLevel = input.RoastLevel
	}
	if input.TastingNotes != nil {
		coffee.TastingNotes = input.TastingNotes
	}
	if input.RoastDate != nil {
		coffee.RoastDate = input.RoastDate
	}
	if input.Notes != nil {
		coffee.Notes = input.Notes
	}

	coffee.UpdatedAt = time.Now()

	query := `
		UPDATE coffees SET
			roaster = $1, name = $2, country = $3, farm = $4, process = $5,
			roast_level = $6, tasting_notes = $7, roast_date = $8,
			notes = $9, updated_at = $10
		WHERE id = $11 AND user_id = $12 AND deleted_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query,
		coffee.Roaster, coffee.Name, coffee.Country, coffee.Farm, coffee.Process,
		coffee.RoastLevel, coffee.TastingNotes, coffee.RoastDate,
		coffee.Notes, coffee.UpdatedAt, coffeeID, userID,
	)
	if err != nil {
		return nil, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rowsAffected == 0 {
		return nil, ErrCoffeeNotFound
	}

	coffee.CalculateDaysOffRoast()
	return coffee, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, userID, coffeeID uuid.UUID) error {
	query := `
		UPDATE coffees SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query, coffeeID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrCoffeeNotFound
	}

	return nil
}

func (r *PostgresRepository) Archive(ctx context.Context, userID, coffeeID uuid.UUID) (*Coffee, error) {
	query := `
		UPDATE coffees SET archived_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL AND archived_at IS NULL
		RETURNING id
	`

	var id uuid.UUID
	err := r.db.QueryRowContext(ctx, query, coffeeID, userID).Scan(&id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCoffeeNotFound
		}
		return nil, err
	}

	return r.GetByID(ctx, userID, coffeeID)
}

func (r *PostgresRepository) Unarchive(ctx context.Context, userID, coffeeID uuid.UUID) (*Coffee, error) {
	query := `
		UPDATE coffees SET archived_at = NULL, updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL AND archived_at IS NOT NULL
		RETURNING id
	`

	var id uuid.UUID
	err := r.db.QueryRowContext(ctx, query, coffeeID, userID).Scan(&id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCoffeeNotFound
		}
		return nil, err
	}

	return r.GetByID(ctx, userID, coffeeID)
}

func (r *PostgresRepository) GetSuggestions(ctx context.Context, userID uuid.UUID, field, query string) ([]string, error) {
	allowedFields := map[string]bool{
		"roaster": true,
		"country": true,
		"process": true,
	}

	if !allowedFields[field] {
		return []string{}, nil
	}

	sqlQuery := fmt.Sprintf(`
		SELECT DISTINCT %s
		FROM coffees
		WHERE user_id = $1 AND deleted_at IS NULL AND %s IS NOT NULL AND %s ILIKE $2
		ORDER BY %s
		LIMIT 10
	`, field, field, field, field)

	rows, err := r.db.QueryContext(ctx, sqlQuery, userID, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var suggestions []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		suggestions = append(suggestions, s)
	}

	if suggestions == nil {
		suggestions = []string{}
	}

	return suggestions, nil
}

var (
	ErrExperimentNotFound     = errors.New("experiment not found")
	ErrExperimentWrongCoffee  = errors.New("experiment does not belong to this coffee")
)

func (r *PostgresRepository) SetBestExperiment(ctx context.Context, userID, coffeeID uuid.UUID, experimentID *uuid.UUID) (*Coffee, error) {
	// First verify the coffee exists and belongs to user
	coffee, err := r.GetByID(ctx, userID, coffeeID)
	if err != nil {
		return nil, err
	}

	// If experimentID is provided, verify it belongs to this coffee
	if experimentID != nil {
		var expCoffeeID uuid.UUID
		var expUserID uuid.UUID
		err := r.db.QueryRowContext(ctx, `
			SELECT coffee_id, user_id FROM experiments WHERE id = $1
		`, *experimentID).Scan(&expCoffeeID, &expUserID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, ErrExperimentNotFound
			}
			return nil, err
		}
		if expCoffeeID != coffeeID {
			return nil, ErrExperimentWrongCoffee
		}
		if expUserID != userID {
			return nil, ErrExperimentNotFound
		}
	}

	// Update the coffee's best_experiment_id
	query := `
		UPDATE coffees SET best_experiment_id = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
	`
	_, err = r.db.ExecContext(ctx, query, experimentID, coffeeID, userID)
	if err != nil {
		return nil, err
	}

	coffee.BestExperimentID = experimentID
	coffee.UpdatedAt = time.Now()
	return coffee, nil
}

func (r *PostgresRepository) GetReference(ctx context.Context, userID, coffeeID uuid.UUID) (*CoffeeReference, error) {
	// First verify the coffee exists
	coffee, err := r.GetByID(ctx, userID, coffeeID)
	if err != nil {
		return nil, err
	}

	ref := &CoffeeReference{}

	// Get the best experiment (or latest if none marked)
	var experimentQuery string
	var experimentID uuid.UUID

	if coffee.BestExperimentID != nil {
		experimentID = *coffee.BestExperimentID
		experimentQuery = `
			SELECT e.id, e.brew_date, e.coffee_weight, e.water_weight, e.ratio,
				e.grind_size, e.water_temperature, e.filter_paper_id,
				e.bloom_water, e.bloom_time, e.total_brew_time,
				e.tds, e.extraction_yield, e.overall_score,
				fp.id, fp.name, fp.brand
			FROM experiments e
			LEFT JOIN filter_papers fp ON e.filter_paper_id = fp.id
			WHERE e.id = $1 AND e.user_id = $2
		`
	} else {
		// Get latest experiment by brew_date
		experimentQuery = `
			SELECT e.id, e.brew_date, e.coffee_weight, e.water_weight, e.ratio,
				e.grind_size, e.water_temperature, e.filter_paper_id,
				e.bloom_water, e.bloom_time, e.total_brew_time,
				e.tds, e.extraction_yield, e.overall_score,
				fp.id, fp.name, fp.brand
			FROM experiments e
			LEFT JOIN filter_papers fp ON e.filter_paper_id = fp.id
			WHERE e.coffee_id = $1 AND e.user_id = $2
			ORDER BY e.brew_date DESC
			LIMIT 1
		`
	}

	var exp ReferenceExperiment
	var fpID *uuid.UUID
	var fpName *string
	var fpBrand *string

	var queryArgs []interface{}
	if coffee.BestExperimentID != nil {
		queryArgs = []interface{}{experimentID, userID}
	} else {
		queryArgs = []interface{}{coffeeID, userID}
	}

	err = r.db.QueryRowContext(ctx, experimentQuery, queryArgs...).Scan(
		&exp.ID, &exp.BrewDate, &exp.CoffeeWeight, &exp.WaterWeight, &exp.Ratio,
		&exp.GrindSize, &exp.WaterTemperature, &fpID,
		&exp.BloomWater, &exp.BloomTime, &exp.TotalBrewTime,
		&exp.TDS, &exp.ExtractionYield, &exp.OverallScore,
		&fpID, &fpName, &fpBrand,
	)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		exp.IsBest = coffee.BestExperimentID != nil
		if fpID != nil && fpName != nil {
			exp.FilterPaper = &FilterPaperSummary{
				ID:    *fpID,
				Name:  *fpName,
				Brand: fpBrand,
			}
		}
		ref.Experiment = &exp
	}

	// Get coffee goals
	goalsQuery := `
		SELECT id, coffee_id, user_id, tds, extraction_yield,
			aroma_intensity, sweetness_intensity, body_intensity, flavor_intensity,
			brightness_intensity, cleanliness_intensity, complexity_intensity,
			balance_intensity, aftertaste_intensity,
			overall_score, notes, created_at, updated_at
		FROM coffee_goals
		WHERE coffee_id = $1 AND user_id = $2
	`
	var goals CoffeeGoal
	err = r.db.QueryRowContext(ctx, goalsQuery, coffeeID, userID).Scan(
		&goals.ID, &goals.CoffeeID, &goals.UserID, &goals.TDS, &goals.ExtractionYield,
		&goals.AromaIntensity, &goals.SweetnessIntensity, &goals.BodyIntensity, &goals.FlavorIntensity,
		&goals.BrightnessIntensity, &goals.CleanlinessIntensity, &goals.ComplexityIntensity,
		&goals.BalanceIntensity, &goals.AftertasteIntensity,
		&goals.OverallScore, &goals.Notes, &goals.CreatedAt, &goals.UpdatedAt,
	)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		ref.Goals = &goals
	}

	return ref, nil
}

func (r *PostgresRepository) populateBestExperiments(ctx context.Context, userID uuid.UUID, coffeeMap map[uuid.UUID]*Coffee) error {
	if len(coffeeMap) == 0 {
		return nil
	}

	coffeeIDs := make([]uuid.UUID, 0, len(coffeeMap))
	for id := range coffeeMap {
		coffeeIDs = append(coffeeIDs, id)
	}

	query := `
		WITH best_or_latest AS (
			SELECT DISTINCT ON (c.id)
				c.id as coffee_id,
				COALESCE(best.id, latest.id) as experiment_id,
				COALESCE(best.brew_date, latest.brew_date) as brew_date,
				COALESCE(best.overall_score, latest.overall_score) as overall_score,
				COALESCE(best.ratio, latest.ratio) as ratio,
				COALESCE(best.water_temperature, latest.water_temperature) as water_temperature,
				COALESCE(best.bloom_time, latest.bloom_time) as bloom_time,
				COALESCE(best_mp.name, latest_mp.name) as mineral_profile_name,
				COALESCE(best_fp.name, latest_fp.name) as filter_paper_name
			FROM coffees c
			LEFT JOIN experiments best ON best.id = c.best_experiment_id AND best.user_id = $1
			LEFT JOIN filter_papers best_fp ON best_fp.id = best.filter_paper_id
			LEFT JOIN mineral_profiles best_mp ON best_mp.id = best.mineral_profile_id
			LEFT JOIN LATERAL (
				SELECT e.*
				FROM experiments e
				WHERE e.coffee_id = c.id AND e.user_id = $1
				ORDER BY e.brew_date DESC
				LIMIT 1
			) latest ON c.best_experiment_id IS NULL
			LEFT JOIN filter_papers latest_fp ON latest_fp.id = latest.filter_paper_id
			LEFT JOIN mineral_profiles latest_mp ON latest_mp.id = latest.mineral_profile_id
			WHERE c.id = ANY($2) AND c.user_id = $1
		)
		SELECT coffee_id, experiment_id, brew_date, overall_score, ratio, water_temperature, bloom_time, mineral_profile_name, filter_paper_name
		FROM best_or_latest
		WHERE experiment_id IS NOT NULL
	`

	rows, err := r.db.QueryContext(ctx, query, userID, pq.Array(coffeeIDs))
	if err != nil {
		return err
	}
	defer rows.Close()

	experimentIDs := make([]uuid.UUID, 0)
	experimentToCoffee := make(map[uuid.UUID]uuid.UUID)

	for rows.Next() {
		var coffeeID uuid.UUID
		var be BestExperimentSummary

		err := rows.Scan(
			&coffeeID,
			&be.ID,
			&be.BrewDate,
			&be.OverallScore,
			&be.Ratio,
			&be.WaterTemperature,
			&be.BloomTime,
			&be.MineralProfileName,
			&be.FilterPaperName,
		)
		if err != nil {
			return err
		}

		be.PourStyles = []string{}

		if coffee, ok := coffeeMap[coffeeID]; ok {
			coffee.BestExperiment = &be
			experimentIDs = append(experimentIDs, be.ID)
			experimentToCoffee[be.ID] = coffeeID
		}
	}

	if err := rows.Err(); err != nil {
		return err
	}

	// Fetch pour information for experiments
	if len(experimentIDs) > 0 {
		pourQuery := `
			SELECT experiment_id, pour_style
			FROM experiment_pours
			WHERE experiment_id = ANY($1)
			ORDER BY experiment_id, pour_number
		`

		pourRows, err := r.db.QueryContext(ctx, pourQuery, pq.Array(experimentIDs))
		if err != nil {
			return err
		}
		defer pourRows.Close()

		poursByExp := make(map[uuid.UUID][]string)
		for pourRows.Next() {
			var expID uuid.UUID
			var pourStyle *string

			if err := pourRows.Scan(&expID, &pourStyle); err != nil {
				return err
			}

			if pourStyle != nil && *pourStyle != "" {
				poursByExp[expID] = append(poursByExp[expID], *pourStyle)
			} else {
				poursByExp[expID] = append(poursByExp[expID], "")
			}
		}

		if err := pourRows.Err(); err != nil {
			return err
		}

		for expID, pours := range poursByExp {
			if coffeeID, ok := experimentToCoffee[expID]; ok {
				if coffee, ok := coffeeMap[coffeeID]; ok && coffee.BestExperiment != nil {
					coffee.BestExperiment.PourCount = len(pours)
					styles := make([]string, 0)
					for _, s := range pours {
						if s != "" {
							styles = append(styles, s)
						}
					}
					coffee.BestExperiment.PourStyles = styles
				}
			}
		}
	}

	return nil
}

func (r *PostgresRepository) populateImprovementNotes(ctx context.Context, userID uuid.UUID, coffeeMap map[uuid.UUID]*Coffee) error {
	if len(coffeeMap) == 0 {
		return nil
	}

	coffeeIDs := make([]uuid.UUID, 0, len(coffeeMap))
	for id := range coffeeMap {
		coffeeIDs = append(coffeeIDs, id)
	}

	query := `
		SELECT coffee_id, notes
		FROM coffee_goals
		WHERE coffee_id = ANY($1) AND user_id = $2 AND notes IS NOT NULL AND notes != ''
	`

	rows, err := r.db.QueryContext(ctx, query, pq.Array(coffeeIDs), userID)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var coffeeID uuid.UUID
		var notes string

		if err := rows.Scan(&coffeeID, &notes); err != nil {
			return err
		}

		if coffee, ok := coffeeMap[coffeeID]; ok {
			coffee.ImprovementNote = &notes
		}
	}

	return rows.Err()
}
