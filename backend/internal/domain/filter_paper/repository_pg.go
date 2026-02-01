package filter_paper

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
	ErrFilterPaperNotFound  = errors.New("filter paper not found")
	ErrFilterPaperDuplicate = errors.New("filter paper with this name already exists")
)

type PostgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, userID uuid.UUID, input CreateFilterPaperInput) (*FilterPaper, error) {
	fp := &FilterPaper{
		ID:        uuid.New(),
		UserID:    userID,
		Name:      input.Name,
		Brand:     input.Brand,
		Notes:     input.Notes,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	query := `
		INSERT INTO filter_papers (id, user_id, name, brand, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.ExecContext(ctx, query,
		fp.ID, fp.UserID, fp.Name, fp.Brand, fp.Notes, fp.CreatedAt, fp.UpdatedAt,
	)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, ErrFilterPaperDuplicate
		}
		return nil, err
	}

	return fp, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, userID, filterPaperID uuid.UUID) (*FilterPaper, error) {
	query := `
		SELECT id, user_id, name, brand, notes, deleted_at, created_at, updated_at
		FROM filter_papers
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	fp := &FilterPaper{}
	err := r.db.QueryRowContext(ctx, query, filterPaperID, userID).Scan(
		&fp.ID, &fp.UserID, &fp.Name, &fp.Brand, &fp.Notes,
		&fp.DeletedAt, &fp.CreatedAt, &fp.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrFilterPaperNotFound
		}
		return nil, err
	}

	return fp, nil
}

func (r *PostgresRepository) List(ctx context.Context, userID uuid.UUID, params ListFilterPapersParams) (*ListFilterPapersResult, error) {
	params.SetDefaults()

	whereClause := "WHERE user_id = $1 AND deleted_at IS NULL"

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM filter_papers %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, userID).Scan(&total); err != nil {
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
			"created_at": true, "updated_at": true, "name": true, "brand": true,
		}
		if allowedFields[sortField] {
			orderBy = fmt.Sprintf("%s %s", sortField, sortOrder)
		}
	}

	offset := (params.Page - 1) * params.PerPage
	listQuery := fmt.Sprintf(`
		SELECT id, user_id, name, brand, notes, deleted_at, created_at, updated_at
		FROM filter_papers
		%s
		ORDER BY %s
		LIMIT $2 OFFSET $3
	`, whereClause, orderBy)

	rows, err := r.db.QueryContext(ctx, listQuery, userID, params.PerPage, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var filterPapers []FilterPaper
	for rows.Next() {
		var fp FilterPaper
		err := rows.Scan(
			&fp.ID, &fp.UserID, &fp.Name, &fp.Brand, &fp.Notes,
			&fp.DeletedAt, &fp.CreatedAt, &fp.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		filterPapers = append(filterPapers, fp)
	}

	if filterPapers == nil {
		filterPapers = []FilterPaper{}
	}

	totalPages := total / params.PerPage
	if total%params.PerPage > 0 {
		totalPages++
	}

	return &ListFilterPapersResult{
		Items: filterPapers,
		Pagination: Pagination{
			Page:       params.Page,
			PerPage:    params.PerPage,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (r *PostgresRepository) Update(ctx context.Context, userID, filterPaperID uuid.UUID, input UpdateFilterPaperInput) (*FilterPaper, error) {
	// First fetch the current filter paper
	fp, err := r.GetByID(ctx, userID, filterPaperID)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if input.Name != nil {
		fp.Name = *input.Name
	}
	if input.Brand != nil {
		fp.Brand = input.Brand
	}
	if input.Notes != nil {
		fp.Notes = input.Notes
	}

	fp.UpdatedAt = time.Now()

	query := `
		UPDATE filter_papers SET
			name = $1, brand = $2, notes = $3, updated_at = $4
		WHERE id = $5 AND user_id = $6 AND deleted_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query,
		fp.Name, fp.Brand, fp.Notes, fp.UpdatedAt, filterPaperID, userID,
	)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, ErrFilterPaperDuplicate
		}
		return nil, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rowsAffected == 0 {
		return nil, ErrFilterPaperNotFound
	}

	return fp, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, userID, filterPaperID uuid.UUID) error {
	query := `
		UPDATE filter_papers SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query, filterPaperID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrFilterPaperNotFound
	}

	return nil
}
