package coffee

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

const coffeeColumns = `c.id, c.user_id, c.roaster, c.name, c.country, c.farm, c.process,
	c.roast_level, c.tasting_notes, c.roast_date, c.notes, c.reference_brew_id,
	c.archived_at, c.created_at, c.updated_at`

func scanCoffee(row pgx.Row) (*Coffee, error) {
	var c Coffee
	var roastDate *time.Time
	err := row.Scan(
		&c.ID, &c.UserID, &c.Roaster, &c.Name, &c.Country, &c.Farm, &c.Process,
		&c.RoastLevel, &c.TastingNotes, &roastDate, &c.Notes, &c.ReferenceBrewID,
		&c.ArchivedAt, &c.CreatedAt, &c.UpdatedAt,
		&c.BrewCount, &c.LastBrewed,
	)
	if err != nil {
		return nil, err
	}
	if roastDate != nil {
		s := roastDate.Format("2006-01-02")
		c.RoastDate = &s
	}
	return &c, nil
}

const brewCountSubquery = `(SELECT COUNT(*) FROM brews WHERE brews.coffee_id = c.id)`
const lastBrewedSubquery = `(SELECT MAX(brew_date) FROM brews WHERE brews.coffee_id = c.id)`

func (r *PgRepository) List(ctx context.Context, userID string, params ListParams) ([]Coffee, int, error) {
	conditions := []string{"c.user_id = $1"}
	args := []interface{}{userID}
	argIdx := 2

	if params.ArchivedOnly {
		conditions = append(conditions, "c.archived_at IS NOT NULL")
	} else {
		conditions = append(conditions, "c.archived_at IS NULL")
	}

	if params.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(c.roaster ILIKE $%d OR c.name ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+params.Search+"%")
		argIdx++
	}

	if params.Roaster != "" {
		conditions = append(conditions, fmt.Sprintf("c.roaster = $%d", argIdx))
		args = append(args, params.Roaster)
		argIdx++
	}

	if params.Country != "" {
		conditions = append(conditions, fmt.Sprintf("c.country = $%d", argIdx))
		args = append(args, params.Country)
		argIdx++
	}

	if params.Process != "" {
		conditions = append(conditions, fmt.Sprintf("c.process = $%d", argIdx))
		args = append(args, params.Process)
		argIdx++
	}

	where := strings.Join(conditions, " AND ")

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM coffees c WHERE %s", where)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data query
	query := fmt.Sprintf(
		`SELECT %s, %s AS brew_count, %s AS last_brewed
		 FROM coffees c
		 WHERE %s
		 ORDER BY c.created_at DESC
		 LIMIT $%d OFFSET $%d`,
		coffeeColumns, brewCountSubquery, lastBrewedSubquery,
		where, argIdx, argIdx+1,
	)
	args = append(args, params.PerPage, (params.Page-1)*params.PerPage)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var coffees []Coffee
	for rows.Next() {
		var c Coffee
		var roastDate *time.Time
		if err := rows.Scan(
			&c.ID, &c.UserID, &c.Roaster, &c.Name, &c.Country, &c.Farm, &c.Process,
			&c.RoastLevel, &c.TastingNotes, &roastDate, &c.Notes, &c.ReferenceBrewID,
			&c.ArchivedAt, &c.CreatedAt, &c.UpdatedAt,
			&c.BrewCount, &c.LastBrewed,
		); err != nil {
			return nil, 0, err
		}
		if roastDate != nil {
			s := roastDate.Format("2006-01-02")
			c.RoastDate = &s
		}
		coffees = append(coffees, c)
	}

	if coffees == nil {
		coffees = []Coffee{}
	}

	return coffees, total, nil
}

func (r *PgRepository) GetByID(ctx context.Context, userID, id string) (*Coffee, error) {
	query := fmt.Sprintf(
		`SELECT %s, %s AS brew_count, %s AS last_brewed
		 FROM coffees c
		 WHERE c.id = $1 AND c.user_id = $2`,
		coffeeColumns, brewCountSubquery, lastBrewedSubquery,
	)
	c, err := scanCoffee(r.pool.QueryRow(ctx, query, id, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *PgRepository) Create(ctx context.Context, userID string, req CreateRequest) (*Coffee, error) {
	query := fmt.Sprintf(
		`WITH inserted AS (
			INSERT INTO coffees (user_id, roaster, name, country, farm, process, roast_level, tasting_notes, roast_date, notes)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING *
		)
		SELECT %s, %s AS brew_count, %s AS last_brewed
		FROM inserted c`,
		coffeeColumns, brewCountSubquery, lastBrewedSubquery,
	)

	c, err := scanCoffee(r.pool.QueryRow(ctx, query,
		userID, req.Roaster, req.Name, req.Country, req.Farm,
		req.Process, req.RoastLevel, req.TastingNotes, req.RoastDate, req.Notes,
	))
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *PgRepository) Update(ctx context.Context, userID, id string, req UpdateRequest) (*Coffee, error) {
	query := fmt.Sprintf(
		`WITH updated AS (
			UPDATE coffees
			SET roaster = $1, name = $2, country = $3, farm = $4, process = $5,
				roast_level = $6, tasting_notes = $7, roast_date = $8, notes = $9,
				updated_at = NOW()
			WHERE id = $10 AND user_id = $11
			RETURNING *
		)
		SELECT %s, %s AS brew_count, %s AS last_brewed
		FROM updated c`,
		coffeeColumns, brewCountSubquery, lastBrewedSubquery,
	)

	c, err := scanCoffee(r.pool.QueryRow(ctx, query,
		req.Roaster, req.Name, req.Country, req.Farm, req.Process,
		req.RoastLevel, req.TastingNotes, req.RoastDate, req.Notes,
		id, userID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *PgRepository) Delete(ctx context.Context, userID, id string) error {
	result, err := r.pool.Exec(ctx,
		`DELETE FROM coffees WHERE id = $1 AND user_id = $2`,
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

func (r *PgRepository) Archive(ctx context.Context, userID, id string) (*Coffee, error) {
	query := fmt.Sprintf(
		`WITH updated AS (
			UPDATE coffees SET archived_at = NOW(), updated_at = NOW()
			WHERE id = $1 AND user_id = $2 AND archived_at IS NULL
			RETURNING *
		)
		SELECT %s, %s AS brew_count, %s AS last_brewed
		FROM updated c`,
		coffeeColumns, brewCountSubquery, lastBrewedSubquery,
	)

	c, err := scanCoffee(r.pool.QueryRow(ctx, query, id, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *PgRepository) Unarchive(ctx context.Context, userID, id string) (*Coffee, error) {
	query := fmt.Sprintf(
		`WITH updated AS (
			UPDATE coffees SET archived_at = NULL, updated_at = NOW()
			WHERE id = $1 AND user_id = $2 AND archived_at IS NOT NULL
			RETURNING *
		)
		SELECT %s, %s AS brew_count, %s AS last_brewed
		FROM updated c`,
		coffeeColumns, brewCountSubquery, lastBrewedSubquery,
	)

	c, err := scanCoffee(r.pool.QueryRow(ctx, query, id, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *PgRepository) SetReferenceBrew(ctx context.Context, userID, id string, brewID *string) (*Coffee, error) {
	query := fmt.Sprintf(
		`WITH updated AS (
			UPDATE coffees SET reference_brew_id = $1, updated_at = NOW()
			WHERE id = $2 AND user_id = $3
			RETURNING *
		)
		SELECT %s, %s AS brew_count, %s AS last_brewed
		FROM updated c`,
		coffeeColumns, brewCountSubquery, lastBrewedSubquery,
	)

	c, err := scanCoffee(r.pool.QueryRow(ctx, query, brewID, id, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

var allowedSuggestionFields = map[string]string{
	"roaster": "roaster",
	"country": "country",
	"process": "process",
}

func (r *PgRepository) Suggestions(ctx context.Context, userID, field, query string) ([]string, error) {
	col, ok := allowedSuggestionFields[field]
	if !ok {
		return nil, fmt.Errorf("invalid suggestion field: %s", field)
	}

	sqlQuery := fmt.Sprintf(
		`SELECT DISTINCT %s FROM coffees
		 WHERE user_id = $1 AND %s ILIKE $2 AND %s IS NOT NULL
		 ORDER BY %s ASC
		 LIMIT 20`,
		col, col, col, col,
	)

	rows, err := r.pool.Query(ctx, sqlQuery, userID, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []string
	for rows.Next() {
		var val string
		if err := rows.Scan(&val); err != nil {
			return nil, err
		}
		items = append(items, val)
	}

	if items == nil {
		items = []string{}
	}

	return items, nil
}
