package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
)

var ErrTagNotFound = errors.New("tag not found")
var ErrTagAlreadyExists = errors.New("tag already exists")

type IssueTagsRepository struct {
	pool *pgxpool.Pool
}

func NewIssueTagsRepository(pool *pgxpool.Pool) *IssueTagsRepository {
	return &IssueTagsRepository{pool: pool}
}

func (r *IssueTagsRepository) Create(ctx context.Context, userID uuid.UUID, name string) (*models.IssueTag, error) {
	tag := &models.IssueTag{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO issue_tags (user_id, name, is_system)
		VALUES ($1, $2, FALSE)
		RETURNING id, user_id, name, is_system, created_at
	`, userID, name).Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.IsSystem, &tag.CreatedAt)

	if err != nil {
		if err.Error() == `ERROR: duplicate key value violates unique constraint "idx_issue_tags_user_name" (SQLSTATE 23505)` {
			return nil, ErrTagAlreadyExists
		}
		return nil, err
	}

	return tag, nil
}

func (r *IssueTagsRepository) GetByID(ctx context.Context, tagID uuid.UUID) (*models.IssueTag, error) {
	tag := &models.IssueTag{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, name, is_system, created_at
		FROM issue_tags
		WHERE id = $1
	`, tagID).Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.IsSystem, &tag.CreatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTagNotFound
		}
		return nil, err
	}

	return tag, nil
}

func (r *IssueTagsRepository) List(ctx context.Context, userID uuid.UUID) ([]*models.IssueTag, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, name, is_system, created_at
		FROM issue_tags
		WHERE user_id IS NULL OR user_id = $1
		ORDER BY is_system DESC, name ASC
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []*models.IssueTag
	for rows.Next() {
		tag := &models.IssueTag{}
		err := rows.Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.IsSystem, &tag.CreatedAt)
		if err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return tags, nil
}

func (r *IssueTagsRepository) Delete(ctx context.Context, userID, tagID uuid.UUID) error {
	result, err := r.pool.Exec(ctx, `
		DELETE FROM issue_tags
		WHERE id = $1 AND user_id = $2 AND is_system = FALSE
	`, tagID, userID)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrTagNotFound
	}

	return nil
}

func (r *IssueTagsRepository) GetByName(ctx context.Context, userID uuid.UUID, name string) (*models.IssueTag, error) {
	tag := &models.IssueTag{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, name, is_system, created_at
		FROM issue_tags
		WHERE name = $1 AND (user_id IS NULL OR user_id = $2)
	`, name, userID).Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.IsSystem, &tag.CreatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTagNotFound
		}
		return nil, err
	}

	return tag, nil
}
