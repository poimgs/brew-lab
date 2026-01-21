package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
)

var ErrCoffeeNotFound = errors.New("coffee not found")
var ErrCoffeeHasExperiments = errors.New("coffee has associated experiments")

type CoffeeRepository struct {
	pool *pgxpool.Pool
}

func NewCoffeeRepository(pool *pgxpool.Pool) *CoffeeRepository {
	return &CoffeeRepository{pool: pool}
}

type CoffeeListParams struct {
	UserID   uuid.UUID
	Roaster  *string
	Country  *string
	Process  *string
	Search   *string
	SortBy   string
	SortDir  string
	Page     int
	PageSize int
}

type CoffeeListResult struct {
	Coffees    []*models.Coffee
	TotalCount int
	Page       int
	PageSize   int
	TotalPages int
}

func (r *CoffeeRepository) Create(ctx context.Context, coffee *models.Coffee) (*models.Coffee, error) {
	result := &models.Coffee{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO coffees (user_id, roaster, name, country, region, process, roast_level, tasting_notes, roast_date, purchase_date, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, user_id, roaster, name, country, region, process, roast_level, tasting_notes, roast_date, purchase_date, notes, created_at, updated_at
	`, coffee.UserID, coffee.Roaster, coffee.Name, coffee.Country, coffee.Region, coffee.Process, coffee.RoastLevel, coffee.TastingNotes, coffee.RoastDate, coffee.PurchaseDate, coffee.Notes).Scan(
		&result.ID, &result.UserID, &result.Roaster, &result.Name, &result.Country, &result.Region, &result.Process, &result.RoastLevel, &result.TastingNotes, &result.RoastDate, &result.PurchaseDate, &result.Notes, &result.CreatedAt, &result.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *CoffeeRepository) GetByID(ctx context.Context, userID, coffeeID uuid.UUID) (*models.Coffee, error) {
	coffee := &models.Coffee{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, roaster, name, country, region, process, roast_level, tasting_notes, roast_date, purchase_date, notes, created_at, updated_at
		FROM coffees
		WHERE id = $1 AND user_id = $2
	`, coffeeID, userID).Scan(
		&coffee.ID, &coffee.UserID, &coffee.Roaster, &coffee.Name, &coffee.Country, &coffee.Region, &coffee.Process, &coffee.RoastLevel, &coffee.TastingNotes, &coffee.RoastDate, &coffee.PurchaseDate, &coffee.Notes, &coffee.CreatedAt, &coffee.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCoffeeNotFound
		}
		return nil, err
	}

	return coffee, nil
}

func (r *CoffeeRepository) List(ctx context.Context, params CoffeeListParams) (*CoffeeListResult, error) {
	var conditions []string
	var args []interface{}
	argCount := 1

	conditions = append(conditions, fmt.Sprintf("user_id = $%d", argCount))
	args = append(args, params.UserID)
	argCount++

	if params.Roaster != nil {
		conditions = append(conditions, fmt.Sprintf("roaster = $%d", argCount))
		args = append(args, *params.Roaster)
		argCount++
	}

	if params.Country != nil {
		conditions = append(conditions, fmt.Sprintf("country = $%d", argCount))
		args = append(args, *params.Country)
		argCount++
	}

	if params.Process != nil {
		conditions = append(conditions, fmt.Sprintf("process = $%d", argCount))
		args = append(args, *params.Process)
		argCount++
	}

	if params.Search != nil && *params.Search != "" {
		conditions = append(conditions, fmt.Sprintf("to_tsvector('english', coalesce(roaster, '') || ' ' || coalesce(name, '')) @@ plainto_tsquery('english', $%d)", argCount))
		args = append(args, *params.Search)
		argCount++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count total
	var totalCount int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM coffees WHERE %s", whereClause)
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, err
	}

	// Validate and set sort
	sortBy := "created_at"
	validSortFields := map[string]bool{"created_at": true, "roast_date": true, "roaster": true, "name": true}
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
		SELECT id, user_id, roaster, name, country, region, process, roast_level, tasting_notes, roast_date, purchase_date, notes, created_at, updated_at
		FROM coffees
		WHERE %s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortBy, sortDir, argCount, argCount+1)

	args = append(args, pageSize, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var coffees []*models.Coffee
	for rows.Next() {
		coffee := &models.Coffee{}
		err := rows.Scan(
			&coffee.ID, &coffee.UserID, &coffee.Roaster, &coffee.Name, &coffee.Country, &coffee.Region, &coffee.Process, &coffee.RoastLevel, &coffee.TastingNotes, &coffee.RoastDate, &coffee.PurchaseDate, &coffee.Notes, &coffee.CreatedAt, &coffee.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		coffees = append(coffees, coffee)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	totalPages := (totalCount + pageSize - 1) / pageSize

	return &CoffeeListResult{
		Coffees:    coffees,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (r *CoffeeRepository) Update(ctx context.Context, coffee *models.Coffee) (*models.Coffee, error) {
	result := &models.Coffee{}
	err := r.pool.QueryRow(ctx, `
		UPDATE coffees
		SET roaster = $1, name = $2, country = $3, region = $4, process = $5, roast_level = $6, tasting_notes = $7, roast_date = $8, purchase_date = $9, notes = $10, updated_at = NOW()
		WHERE id = $11 AND user_id = $12
		RETURNING id, user_id, roaster, name, country, region, process, roast_level, tasting_notes, roast_date, purchase_date, notes, created_at, updated_at
	`, coffee.Roaster, coffee.Name, coffee.Country, coffee.Region, coffee.Process, coffee.RoastLevel, coffee.TastingNotes, coffee.RoastDate, coffee.PurchaseDate, coffee.Notes, coffee.ID, coffee.UserID).Scan(
		&result.ID, &result.UserID, &result.Roaster, &result.Name, &result.Country, &result.Region, &result.Process, &result.RoastLevel, &result.TastingNotes, &result.RoastDate, &result.PurchaseDate, &result.Notes, &result.CreatedAt, &result.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCoffeeNotFound
		}
		return nil, err
	}

	return result, nil
}

func (r *CoffeeRepository) Delete(ctx context.Context, userID, coffeeID uuid.UUID) error {
	result, err := r.pool.Exec(ctx, `
		DELETE FROM coffees
		WHERE id = $1 AND user_id = $2
	`, coffeeID, userID)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrCoffeeNotFound
	}

	return nil
}

func (r *CoffeeRepository) HasExperiments(ctx context.Context, coffeeID uuid.UUID) (bool, error) {
	// Stub - will be implemented when experiments feature is added
	return false, nil
}

func (r *CoffeeRepository) GetDistinctValues(ctx context.Context, userID uuid.UUID, field string, query string) ([]string, error) {
	validFields := map[string]bool{"roaster": true, "country": true, "region": true, "process": true}
	if !validFields[field] {
		return nil, fmt.Errorf("invalid field: %s", field)
	}

	var rows pgx.Rows
	var err error

	if query != "" {
		rows, err = r.pool.Query(ctx, fmt.Sprintf(`
			SELECT DISTINCT %s
			FROM coffees
			WHERE user_id = $1 AND %s IS NOT NULL AND %s ILIKE $2
			ORDER BY %s
			LIMIT 10
		`, field, field, field, field), userID, query+"%")
	} else {
		rows, err = r.pool.Query(ctx, fmt.Sprintf(`
			SELECT DISTINCT %s
			FROM coffees
			WHERE user_id = $1 AND %s IS NOT NULL
			ORDER BY %s
			LIMIT 10
		`, field, field, field), userID)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var values []string
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, err
		}
		values = append(values, value)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return values, nil
}
