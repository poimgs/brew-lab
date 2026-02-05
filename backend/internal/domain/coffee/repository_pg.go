package coffee

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
		Region:       input.Region,
		Process:      input.Process,
		RoastLevel:   input.RoastLevel,
		TastingNotes: input.TastingNotes,
		RoastDate:    input.RoastDate,
		PurchaseDate: input.PurchaseDate,
		Notes:        input.Notes,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	query := `
		INSERT INTO coffees (
			id, user_id, roaster, name, country, region, process, roast_level,
			tasting_notes, roast_date, purchase_date, notes, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	_, err := r.db.ExecContext(ctx, query,
		coffee.ID, coffee.UserID, coffee.Roaster, coffee.Name,
		coffee.Country, coffee.Region, coffee.Process, coffee.RoastLevel,
		coffee.TastingNotes, coffee.RoastDate, coffee.PurchaseDate, coffee.Notes,
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
		SELECT id, user_id, roaster, name, country, region, process, roast_level,
			tasting_notes, roast_date, purchase_date, notes, archived_at, deleted_at,
			created_at, updated_at
		FROM coffees
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	coffee := &Coffee{}
	err := r.db.QueryRowContext(ctx, query, coffeeID, userID).Scan(
		&coffee.ID, &coffee.UserID, &coffee.Roaster, &coffee.Name,
		&coffee.Country, &coffee.Region, &coffee.Process, &coffee.RoastLevel,
		&coffee.TastingNotes, &coffee.RoastDate, &coffee.PurchaseDate, &coffee.Notes,
		&coffee.ArchivedAt, &coffee.DeletedAt, &coffee.CreatedAt, &coffee.UpdatedAt,
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
		SELECT id, user_id, roaster, name, country, region, process, roast_level,
			tasting_notes, roast_date, purchase_date, notes, archived_at, deleted_at,
			created_at, updated_at
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
			&c.Country, &c.Region, &c.Process, &c.RoastLevel,
			&c.TastingNotes, &c.RoastDate, &c.PurchaseDate, &c.Notes,
			&c.ArchivedAt, &c.DeletedAt, &c.CreatedAt, &c.UpdatedAt,
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
	if input.Region != nil {
		coffee.Region = input.Region
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
	if input.PurchaseDate != nil {
		coffee.PurchaseDate = input.PurchaseDate
	}
	if input.Notes != nil {
		coffee.Notes = input.Notes
	}

	coffee.UpdatedAt = time.Now()

	query := `
		UPDATE coffees SET
			roaster = $1, name = $2, country = $3, region = $4, process = $5,
			roast_level = $6, tasting_notes = $7, roast_date = $8, purchase_date = $9,
			notes = $10, updated_at = $11
		WHERE id = $12 AND user_id = $13 AND deleted_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query,
		coffee.Roaster, coffee.Name, coffee.Country, coffee.Region, coffee.Process,
		coffee.RoastLevel, coffee.TastingNotes, coffee.RoastDate, coffee.PurchaseDate,
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
