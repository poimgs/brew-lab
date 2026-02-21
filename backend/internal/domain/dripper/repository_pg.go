package dripper

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PgRepository struct {
	pool *pgxpool.Pool
}

func NewPgRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{pool: pool}
}

var allowedSortFields = map[string]string{
	"name":       "name",
	"brand":      "brand",
	"created_at": "created_at",
	"updated_at": "updated_at",
}

func parseSortParam(sort string) string {
	if sort == "" {
		sort = "-created_at"
	}

	desc := false
	field := sort
	if strings.HasPrefix(sort, "-") {
		desc = true
		field = sort[1:]
	}

	col, ok := allowedSortFields[field]
	if !ok {
		col = "created_at"
		desc = true
	}

	if desc {
		return col + " DESC"
	}
	return col + " ASC"
}

func (r *PgRepository) List(ctx context.Context, userID string, page, perPage int, sort string) ([]Dripper, int, error) {
	orderBy := parseSortParam(sort)
	offset := (page - 1) * perPage

	var total int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM drippers WHERE user_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(
		`SELECT id, user_id, name, brand, notes, created_at, updated_at
		 FROM drippers
		 WHERE user_id = $1 AND deleted_at IS NULL
		 ORDER BY %s
		 LIMIT $2 OFFSET $3`,
		orderBy,
	)

	rows, err := r.pool.Query(ctx, query, userID, perPage, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var drippers []Dripper
	for rows.Next() {
		var d Dripper
		if err := rows.Scan(&d.ID, &d.UserID, &d.Name, &d.Brand, &d.Notes, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, 0, err
		}
		drippers = append(drippers, d)
	}

	if drippers == nil {
		drippers = []Dripper{}
	}

	return drippers, total, nil
}

func (r *PgRepository) GetByID(ctx context.Context, userID, id string) (*Dripper, error) {
	var d Dripper
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, name, brand, notes, deleted_at, created_at, updated_at
		 FROM drippers
		 WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
		id, userID,
	).Scan(&d.ID, &d.UserID, &d.Name, &d.Brand, &d.Notes, &d.DeletedAt, &d.CreatedAt, &d.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *PgRepository) Create(ctx context.Context, userID string, req CreateRequest) (*Dripper, error) {
	var d Dripper
	err := r.pool.QueryRow(ctx,
		`INSERT INTO drippers (user_id, name, brand, notes)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, name, brand, notes, created_at, updated_at`,
		userID, req.Name, req.Brand, req.Notes,
	).Scan(&d.ID, &d.UserID, &d.Name, &d.Brand, &d.Notes, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *PgRepository) Update(ctx context.Context, userID, id string, req UpdateRequest) (*Dripper, error) {
	var d Dripper
	err := r.pool.QueryRow(ctx,
		`UPDATE drippers
		 SET name = $1, brand = $2, notes = $3, updated_at = NOW()
		 WHERE id = $4 AND user_id = $5 AND deleted_at IS NULL
		 RETURNING id, user_id, name, brand, notes, created_at, updated_at`,
		req.Name, req.Brand, req.Notes, id, userID,
	).Scan(&d.ID, &d.UserID, &d.Name, &d.Brand, &d.Notes, &d.CreatedAt, &d.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *PgRepository) SoftDelete(ctx context.Context, userID, id string) error {
	result, err := r.pool.Exec(ctx,
		`UPDATE drippers SET deleted_at = NOW(), updated_at = NOW()
		 WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
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
