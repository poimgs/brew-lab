package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
)

var ErrFilterPaperNotFound = errors.New("filter paper not found")
var ErrFilterPaperNameExists = errors.New("filter paper with this name already exists")

type FilterPaperRepository struct {
	pool *pgxpool.Pool
}

func NewFilterPaperRepository(pool *pgxpool.Pool) *FilterPaperRepository {
	return &FilterPaperRepository{pool: pool}
}

func (r *FilterPaperRepository) Create(ctx context.Context, userID uuid.UUID, input models.CreateFilterPaperInput) (*models.FilterPaper, error) {
	fp := &models.FilterPaper{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO filter_papers (user_id, name, brand, notes)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, name, brand, notes, created_at, updated_at
	`, userID, input.Name, input.Brand, input.Notes).Scan(
		&fp.ID, &fp.UserID, &fp.Name, &fp.Brand, &fp.Notes, &fp.CreatedAt, &fp.UpdatedAt,
	)

	if err != nil {
		if err.Error() == "ERROR: duplicate key value violates unique constraint \"idx_filter_papers_user_name\" (SQLSTATE 23505)" {
			return nil, ErrFilterPaperNameExists
		}
		return nil, err
	}

	return fp, nil
}

func (r *FilterPaperRepository) GetByID(ctx context.Context, userID, filterPaperID uuid.UUID) (*models.FilterPaper, error) {
	fp := &models.FilterPaper{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, name, brand, notes, created_at, updated_at
		FROM filter_papers
		WHERE id = $1 AND user_id = $2
	`, filterPaperID, userID).Scan(
		&fp.ID, &fp.UserID, &fp.Name, &fp.Brand, &fp.Notes, &fp.CreatedAt, &fp.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrFilterPaperNotFound
		}
		return nil, err
	}

	return fp, nil
}

func (r *FilterPaperRepository) List(ctx context.Context, userID uuid.UUID) ([]*models.FilterPaper, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, name, brand, notes, created_at, updated_at
		FROM filter_papers
		WHERE user_id = $1
		ORDER BY name ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var filterPapers []*models.FilterPaper
	for rows.Next() {
		fp := &models.FilterPaper{}
		err := rows.Scan(
			&fp.ID, &fp.UserID, &fp.Name, &fp.Brand, &fp.Notes, &fp.CreatedAt, &fp.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		filterPapers = append(filterPapers, fp)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return filterPapers, nil
}

func (r *FilterPaperRepository) Update(ctx context.Context, userID, filterPaperID uuid.UUID, input models.UpdateFilterPaperInput) (*models.FilterPaper, error) {
	// Get existing filter paper first
	existing, err := r.GetByID(ctx, userID, filterPaperID)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if input.Name != nil {
		existing.Name = *input.Name
	}
	if input.Brand != nil {
		existing.Brand = input.Brand
	}
	if input.Notes != nil {
		existing.Notes = input.Notes
	}

	fp := &models.FilterPaper{}
	err = r.pool.QueryRow(ctx, `
		UPDATE filter_papers
		SET name = $1, brand = $2, notes = $3, updated_at = NOW()
		WHERE id = $4 AND user_id = $5
		RETURNING id, user_id, name, brand, notes, created_at, updated_at
	`, existing.Name, existing.Brand, existing.Notes, filterPaperID, userID).Scan(
		&fp.ID, &fp.UserID, &fp.Name, &fp.Brand, &fp.Notes, &fp.CreatedAt, &fp.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrFilterPaperNotFound
		}
		if err.Error() == "ERROR: duplicate key value violates unique constraint \"idx_filter_papers_user_name\" (SQLSTATE 23505)" {
			return nil, ErrFilterPaperNameExists
		}
		return nil, err
	}

	return fp, nil
}

func (r *FilterPaperRepository) Delete(ctx context.Context, userID, filterPaperID uuid.UUID) error {
	result, err := r.pool.Exec(ctx, `
		DELETE FROM filter_papers
		WHERE id = $1 AND user_id = $2
	`, filterPaperID, userID)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrFilterPaperNotFound
	}

	return nil
}
