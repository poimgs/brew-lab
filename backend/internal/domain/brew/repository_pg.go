package brew

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PgRepository struct {
	pool *pgxpool.Pool
}

func NewPgRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{pool: pool}
}

const brewColumns = `b.id, b.user_id, b.coffee_id, b.brew_date, b.days_off_roast,
	b.coffee_weight, b.ratio, b.grind_size, b.water_temperature, b.filter_paper_id,
	b.total_brew_time, b.technique_notes,
	b.coffee_ml, b.tds,
	b.aroma_intensity, b.body_intensity, b.sweetness_intensity,
	b.brightness_intensity, b.complexity_intensity, b.aftertaste_intensity,
	b.overall_score, b.overall_notes, b.improvement_notes,
	b.created_at, b.updated_at,
	c.name AS coffee_name, c.roaster AS coffee_roaster,
	fp.id AS fp_id, fp.name AS fp_name, fp.brand AS fp_brand`

func scanBrew(row pgx.Row) (*Brew, error) {
	var b Brew
	var brewDate time.Time
	var filterPaperID *string
	var fpID *string
	var fpName *string
	var fpBrand *string
	err := row.Scan(
		&b.ID, &b.UserID, &b.CoffeeID, &brewDate, &b.DaysOffRoast,
		&b.CoffeeWeight, &b.Ratio, &b.GrindSize, &b.WaterTemperature, &filterPaperID,
		&b.TotalBrewTime, &b.TechniqueNotes,
		&b.CoffeeMl, &b.TDS,
		&b.AromaIntensity, &b.BodyIntensity, &b.SweetnessIntensity,
		&b.BrightnessIntensity, &b.ComplexityIntensity, &b.AftertasteIntensity,
		&b.OverallScore, &b.OverallNotes, &b.ImprovementNotes,
		&b.CreatedAt, &b.UpdatedAt,
		&b.CoffeeName, &b.CoffeeRoaster,
		&fpID, &fpName, &fpBrand,
	)
	if err != nil {
		return nil, err
	}

	b.BrewDate = brewDate.Format("2006-01-02")

	if fpID != nil && *fpID != "" {
		b.FilterPaper = &FilterPaper{
			ID:    *fpID,
			Name:  derefStr(fpName),
			Brand: fpBrand,
		}
	}

	b.WaterWeight = ComputeWaterWeight(b.CoffeeWeight, b.Ratio)
	b.ExtractionYield = ComputeExtractionYield(b.CoffeeMl, b.TDS, b.CoffeeWeight)

	return &b, nil
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

const brewSelectBase = `SELECT %s
	FROM brews b
	JOIN coffees c ON c.id = b.coffee_id
	LEFT JOIN filter_papers fp ON fp.id = b.filter_paper_id`

func (r *PgRepository) loadPours(ctx context.Context, brewID string) ([]Pour, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT pour_number, water_amount, pour_style, wait_time
		 FROM brew_pours WHERE brew_id = $1 ORDER BY pour_number`, brewID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pours []Pour
	for rows.Next() {
		var p Pour
		if err := rows.Scan(&p.PourNumber, &p.WaterAmount, &p.PourStyle, &p.WaitTime); err != nil {
			return nil, err
		}
		pours = append(pours, p)
	}
	if pours == nil {
		pours = []Pour{}
	}
	return pours, nil
}

func (r *PgRepository) loadPoursForBrews(ctx context.Context, brewIDs []string) (map[string][]Pour, error) {
	if len(brewIDs) == 0 {
		return map[string][]Pour{}, nil
	}

	placeholders := make([]string, len(brewIDs))
	args := make([]interface{}, len(brewIDs))
	for i, id := range brewIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(
		`SELECT brew_id, pour_number, water_amount, pour_style, wait_time
		 FROM brew_pours WHERE brew_id IN (%s) ORDER BY brew_id, pour_number`,
		strings.Join(placeholders, ","),
	)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]Pour)
	for rows.Next() {
		var brewID string
		var p Pour
		if err := rows.Scan(&brewID, &p.PourNumber, &p.WaterAmount, &p.PourStyle, &p.WaitTime); err != nil {
			return nil, err
		}
		result[brewID] = append(result[brewID], p)
	}

	return result, nil
}

func (r *PgRepository) savePours(ctx context.Context, tx pgx.Tx, brewID string, pours []PourRequest) error {
	// Delete existing pours
	if _, err := tx.Exec(ctx, `DELETE FROM brew_pours WHERE brew_id = $1`, brewID); err != nil {
		return err
	}

	for _, p := range pours {
		_, err := tx.Exec(ctx,
			`INSERT INTO brew_pours (brew_id, pour_number, water_amount, pour_style, wait_time)
			 VALUES ($1, $2, $3, $4, $5)`,
			brewID, p.PourNumber, p.WaterAmount, p.PourStyle, p.WaitTime,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func parseSort(sort string) string {
	if sort == "" {
		return "b.brew_date DESC, b.created_at DESC"
	}
	desc := false
	field := sort
	if strings.HasPrefix(sort, "-") {
		desc = true
		field = sort[1:]
	}

	allowed := map[string]string{
		"brew_date":     "b.brew_date",
		"overall_score": "b.overall_score",
		"created_at":    "b.created_at",
	}

	col, ok := allowed[field]
	if !ok {
		return "b.brew_date DESC, b.created_at DESC"
	}

	dir := "ASC"
	if desc {
		dir = "DESC"
	}
	return fmt.Sprintf("%s %s", col, dir)
}

func (r *PgRepository) List(ctx context.Context, userID string, params ListParams) ([]Brew, int, error) {
	conditions := []string{"b.user_id = $1"}
	args := []interface{}{userID}
	argIdx := 2

	if params.CoffeeID != "" {
		conditions = append(conditions, fmt.Sprintf("b.coffee_id = $%d", argIdx))
		args = append(args, params.CoffeeID)
		argIdx++
	}
	if params.ScoreGTE != nil {
		conditions = append(conditions, fmt.Sprintf("b.overall_score >= $%d", argIdx))
		args = append(args, *params.ScoreGTE)
		argIdx++
	}
	if params.ScoreLTE != nil {
		conditions = append(conditions, fmt.Sprintf("b.overall_score <= $%d", argIdx))
		args = append(args, *params.ScoreLTE)
		argIdx++
	}
	if params.HasTDS != nil && *params.HasTDS {
		conditions = append(conditions, "b.tds IS NOT NULL")
	}
	if params.DateFrom != nil {
		conditions = append(conditions, fmt.Sprintf("b.brew_date >= $%d", argIdx))
		args = append(args, *params.DateFrom)
		argIdx++
	}
	if params.DateTo != nil {
		conditions = append(conditions, fmt.Sprintf("b.brew_date <= $%d", argIdx))
		args = append(args, *params.DateTo)
		argIdx++
	}

	where := strings.Join(conditions, " AND ")

	// Count
	countQuery := fmt.Sprintf(
		`SELECT COUNT(*) FROM brews b WHERE %s`,
		strings.Join(conditions[:], " AND "),
	)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data
	orderBy := parseSort(params.Sort)
	query := fmt.Sprintf(
		`%s WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`,
		fmt.Sprintf(brewSelectBase, brewColumns),
		where, orderBy, argIdx, argIdx+1,
	)
	args = append(args, params.PerPage, (params.Page-1)*params.PerPage)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var brews []Brew
	var brewIDs []string
	for rows.Next() {
		b, err := scanBrewFromRows(rows)
		if err != nil {
			return nil, 0, err
		}
		brewIDs = append(brewIDs, b.ID)
		brews = append(brews, *b)
	}

	// Load pours
	poursMap, err := r.loadPoursForBrews(ctx, brewIDs)
	if err != nil {
		return nil, 0, err
	}
	for i := range brews {
		if pours, ok := poursMap[brews[i].ID]; ok {
			brews[i].Pours = pours
		} else {
			brews[i].Pours = []Pour{}
		}
	}

	if brews == nil {
		brews = []Brew{}
	}

	return brews, total, nil
}

func scanBrewFromRows(rows pgx.Rows) (*Brew, error) {
	var b Brew
	var brewDate time.Time
	var filterPaperID *string
	var fpID *string
	var fpName *string
	var fpBrand *string
	err := rows.Scan(
		&b.ID, &b.UserID, &b.CoffeeID, &brewDate, &b.DaysOffRoast,
		&b.CoffeeWeight, &b.Ratio, &b.GrindSize, &b.WaterTemperature, &filterPaperID,
		&b.TotalBrewTime, &b.TechniqueNotes,
		&b.CoffeeMl, &b.TDS,
		&b.AromaIntensity, &b.BodyIntensity, &b.SweetnessIntensity,
		&b.BrightnessIntensity, &b.ComplexityIntensity, &b.AftertasteIntensity,
		&b.OverallScore, &b.OverallNotes, &b.ImprovementNotes,
		&b.CreatedAt, &b.UpdatedAt,
		&b.CoffeeName, &b.CoffeeRoaster,
		&fpID, &fpName, &fpBrand,
	)
	if err != nil {
		return nil, err
	}

	b.BrewDate = brewDate.Format("2006-01-02")

	if fpID != nil && *fpID != "" {
		b.FilterPaper = &FilterPaper{
			ID:    *fpID,
			Name:  derefStr(fpName),
			Brand: fpBrand,
		}
	}

	b.WaterWeight = ComputeWaterWeight(b.CoffeeWeight, b.Ratio)
	b.ExtractionYield = ComputeExtractionYield(b.CoffeeMl, b.TDS, b.CoffeeWeight)

	return &b, nil
}

func (r *PgRepository) Recent(ctx context.Context, userID string, limit int) ([]Brew, error) {
	query := fmt.Sprintf(
		`%s WHERE b.user_id = $1 ORDER BY b.brew_date DESC, b.created_at DESC LIMIT $2`,
		fmt.Sprintf(brewSelectBase, brewColumns),
	)

	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var brews []Brew
	var brewIDs []string
	for rows.Next() {
		b, err := scanBrewFromRows(rows)
		if err != nil {
			return nil, err
		}
		brewIDs = append(brewIDs, b.ID)
		brews = append(brews, *b)
	}

	poursMap, err := r.loadPoursForBrews(ctx, brewIDs)
	if err != nil {
		return nil, err
	}
	for i := range brews {
		if pours, ok := poursMap[brews[i].ID]; ok {
			brews[i].Pours = pours
		} else {
			brews[i].Pours = []Pour{}
		}
	}

	if brews == nil {
		brews = []Brew{}
	}

	return brews, nil
}

func (r *PgRepository) GetByID(ctx context.Context, userID, id string) (*Brew, error) {
	query := fmt.Sprintf(
		`%s WHERE b.id = $1 AND b.user_id = $2`,
		fmt.Sprintf(brewSelectBase, brewColumns),
	)

	b, err := scanBrew(r.pool.QueryRow(ctx, query, id, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	pours, err := r.loadPours(ctx, b.ID)
	if err != nil {
		return nil, err
	}
	b.Pours = pours

	return b, nil
}

func (r *PgRepository) Create(ctx context.Context, userID string, req CreateRequest) (*Brew, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Compute days_off_roast
	var daysOffRoast *int
	if req.BrewDate != nil {
		var roastDate *string
		err := tx.QueryRow(ctx,
			`SELECT roast_date::text FROM coffees WHERE id = $1 AND user_id = $2`,
			req.CoffeeID, userID,
		).Scan(&roastDate)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("coffee not found")
		}
		if err != nil {
			return nil, err
		}
		if roastDate != nil {
			var days int
			err = tx.QueryRow(ctx,
				`SELECT ($1::date - $2::date)::integer`, *req.BrewDate, *roastDate,
			).Scan(&days)
			if err == nil {
				daysOffRoast = &days
			}
		}
	} else {
		// brew_date defaults to today; compute days_off_roast with CURRENT_DATE
		var days *int
		err := tx.QueryRow(ctx,
			`SELECT (CURRENT_DATE - c.roast_date)::integer
			 FROM coffees c WHERE c.id = $1 AND c.user_id = $2 AND c.roast_date IS NOT NULL`,
			req.CoffeeID, userID,
		).Scan(&days)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		daysOffRoast = days
	}

	// Verify coffee exists and belongs to user
	var coffeeExists bool
	err = tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM coffees WHERE id = $1 AND user_id = $2)`,
		req.CoffeeID, userID,
	).Scan(&coffeeExists)
	if err != nil {
		return nil, err
	}
	if !coffeeExists {
		return nil, fmt.Errorf("coffee not found")
	}

	// Insert brew
	var brewID string
	brewDate := req.BrewDate
	if brewDate == nil {
		err = tx.QueryRow(ctx,
			`INSERT INTO brews (user_id, coffee_id, days_off_roast,
				coffee_weight, ratio, grind_size, water_temperature, filter_paper_id,
				total_brew_time, technique_notes, coffee_ml, tds,
				aroma_intensity, body_intensity, sweetness_intensity,
				brightness_intensity, complexity_intensity, aftertaste_intensity,
				overall_score, overall_notes, improvement_notes)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
			 RETURNING id`,
			userID, req.CoffeeID, daysOffRoast,
			req.CoffeeWeight, req.Ratio, req.GrindSize, req.WaterTemperature, req.FilterPaperID,
			req.TotalBrewTime, req.TechniqueNotes, req.CoffeeMl, req.TDS,
			req.AromaIntensity, req.BodyIntensity, req.SweetnessIntensity,
			req.BrightnessIntensity, req.ComplexityIntensity, req.AftertasteIntensity,
			req.OverallScore, req.OverallNotes, req.ImprovementNotes,
		).Scan(&brewID)
	} else {
		err = tx.QueryRow(ctx,
			`INSERT INTO brews (user_id, coffee_id, brew_date, days_off_roast,
				coffee_weight, ratio, grind_size, water_temperature, filter_paper_id,
				total_brew_time, technique_notes, coffee_ml, tds,
				aroma_intensity, body_intensity, sweetness_intensity,
				brightness_intensity, complexity_intensity, aftertaste_intensity,
				overall_score, overall_notes, improvement_notes)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
			 RETURNING id`,
			userID, req.CoffeeID, *brewDate, daysOffRoast,
			req.CoffeeWeight, req.Ratio, req.GrindSize, req.WaterTemperature, req.FilterPaperID,
			req.TotalBrewTime, req.TechniqueNotes, req.CoffeeMl, req.TDS,
			req.AromaIntensity, req.BodyIntensity, req.SweetnessIntensity,
			req.BrightnessIntensity, req.ComplexityIntensity, req.AftertasteIntensity,
			req.OverallScore, req.OverallNotes, req.ImprovementNotes,
		).Scan(&brewID)
	}
	if err != nil {
		return nil, err
	}

	// Save pours
	if err := r.savePours(ctx, tx, brewID, req.Pours); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetByID(ctx, userID, brewID)
}

func (r *PgRepository) Update(ctx context.Context, userID, id string, req UpdateRequest) (*Brew, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Verify brew exists and belongs to user
	var exists bool
	err = tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM brews WHERE id = $1 AND user_id = $2)`,
		id, userID,
	).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, nil
	}

	// Compute days_off_roast
	var daysOffRoast *int
	if req.BrewDate != nil {
		var roastDate *string
		err := tx.QueryRow(ctx,
			`SELECT roast_date::text FROM coffees WHERE id = $1 AND user_id = $2`,
			req.CoffeeID, userID,
		).Scan(&roastDate)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if roastDate != nil {
			var days int
			err = tx.QueryRow(ctx,
				`SELECT ($1::date - $2::date)::integer`, *req.BrewDate, *roastDate,
			).Scan(&days)
			if err == nil {
				daysOffRoast = &days
			}
		}
	}

	// Update brew
	var tag string
	if req.BrewDate != nil {
		tag = `UPDATE brews SET coffee_id = $1, brew_date = $2, days_off_roast = $3,
			coffee_weight = $4, ratio = $5, grind_size = $6, water_temperature = $7, filter_paper_id = $8,
			total_brew_time = $9, technique_notes = $10, coffee_ml = $11, tds = $12,
			aroma_intensity = $13, body_intensity = $14, sweetness_intensity = $15,
			brightness_intensity = $16, complexity_intensity = $17, aftertaste_intensity = $18,
			overall_score = $19, overall_notes = $20, improvement_notes = $21,
			updated_at = NOW()
			WHERE id = $22 AND user_id = $23`
		_, err = tx.Exec(ctx, tag,
			req.CoffeeID, *req.BrewDate, daysOffRoast,
			req.CoffeeWeight, req.Ratio, req.GrindSize, req.WaterTemperature, req.FilterPaperID,
			req.TotalBrewTime, req.TechniqueNotes, req.CoffeeMl, req.TDS,
			req.AromaIntensity, req.BodyIntensity, req.SweetnessIntensity,
			req.BrightnessIntensity, req.ComplexityIntensity, req.AftertasteIntensity,
			req.OverallScore, req.OverallNotes, req.ImprovementNotes,
			id, userID,
		)
	} else {
		tag = `UPDATE brews SET coffee_id = $1, days_off_roast = $2,
			coffee_weight = $3, ratio = $4, grind_size = $5, water_temperature = $6, filter_paper_id = $7,
			total_brew_time = $8, technique_notes = $9, coffee_ml = $10, tds = $11,
			aroma_intensity = $12, body_intensity = $13, sweetness_intensity = $14,
			brightness_intensity = $15, complexity_intensity = $16, aftertaste_intensity = $17,
			overall_score = $18, overall_notes = $19, improvement_notes = $20,
			updated_at = NOW()
			WHERE id = $21 AND user_id = $22`
		_, err = tx.Exec(ctx, tag,
			req.CoffeeID, daysOffRoast,
			req.CoffeeWeight, req.Ratio, req.GrindSize, req.WaterTemperature, req.FilterPaperID,
			req.TotalBrewTime, req.TechniqueNotes, req.CoffeeMl, req.TDS,
			req.AromaIntensity, req.BodyIntensity, req.SweetnessIntensity,
			req.BrightnessIntensity, req.ComplexityIntensity, req.AftertasteIntensity,
			req.OverallScore, req.OverallNotes, req.ImprovementNotes,
			id, userID,
		)
	}
	if err != nil {
		return nil, err
	}

	// Replace pours
	if err := r.savePours(ctx, tx, id, req.Pours); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetByID(ctx, userID, id)
}

func (r *PgRepository) Delete(ctx context.Context, userID, id string) error {
	result, err := r.pool.Exec(ctx,
		`DELETE FROM brews WHERE id = $1 AND user_id = $2`,
		id, userID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *PgRepository) GetReference(ctx context.Context, userID, coffeeID string) (*Brew, string, error) {
	// Check if coffee has a starred reference
	var refBrewID *string
	err := r.pool.QueryRow(ctx,
		`SELECT reference_brew_id FROM coffees WHERE id = $1 AND user_id = $2`,
		coffeeID, userID,
	).Scan(&refBrewID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, "", fmt.Errorf("coffee not found")
	}
	if err != nil {
		return nil, "", err
	}

	if refBrewID != nil {
		b, err := r.GetByID(ctx, userID, *refBrewID)
		if err != nil {
			return nil, "", err
		}
		if b != nil {
			return b, "starred", nil
		}
	}

	// Fall back to latest brew
	query := fmt.Sprintf(
		`%s WHERE b.coffee_id = $1 AND b.user_id = $2 ORDER BY b.brew_date DESC, b.created_at DESC LIMIT 1`,
		fmt.Sprintf(brewSelectBase, brewColumns),
	)
	b, err := scanBrew(r.pool.QueryRow(ctx, query, coffeeID, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", err
	}

	pours, err := r.loadPours(ctx, b.ID)
	if err != nil {
		return nil, "", err
	}
	b.Pours = pours

	return b, "latest", nil
}
