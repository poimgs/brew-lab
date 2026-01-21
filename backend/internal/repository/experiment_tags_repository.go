package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
)

type ExperimentTagsRepository struct {
	pool *pgxpool.Pool
}

func NewExperimentTagsRepository(pool *pgxpool.Pool) *ExperimentTagsRepository {
	return &ExperimentTagsRepository{pool: pool}
}

func (r *ExperimentTagsRepository) AddTag(ctx context.Context, experimentID, tagID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO experiment_tags (experiment_id, tag_id)
		VALUES ($1, $2)
		ON CONFLICT (experiment_id, tag_id) DO NOTHING
	`, experimentID, tagID)

	return err
}

func (r *ExperimentTagsRepository) RemoveTag(ctx context.Context, experimentID, tagID uuid.UUID) error {
	result, err := r.pool.Exec(ctx, `
		DELETE FROM experiment_tags
		WHERE experiment_id = $1 AND tag_id = $2
	`, experimentID, tagID)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrTagNotFound
	}

	return nil
}

func (r *ExperimentTagsRepository) GetTagsForExperiment(ctx context.Context, experimentID uuid.UUID) ([]*models.IssueTag, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT t.id, t.user_id, t.name, t.is_system, t.created_at
		FROM issue_tags t
		INNER JOIN experiment_tags et ON t.id = et.tag_id
		WHERE et.experiment_id = $1
		ORDER BY t.is_system DESC, t.name ASC
	`, experimentID)

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

func (r *ExperimentTagsRepository) SetTags(ctx context.Context, experimentID uuid.UUID, tagIDs []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Remove existing tags
	_, err = tx.Exec(ctx, `DELETE FROM experiment_tags WHERE experiment_id = $1`, experimentID)
	if err != nil {
		return err
	}

	// Add new tags
	for _, tagID := range tagIDs {
		_, err := tx.Exec(ctx, `
			INSERT INTO experiment_tags (experiment_id, tag_id)
			VALUES ($1, $2)
		`, experimentID, tagID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *ExperimentTagsRepository) GetTagsForExperiments(ctx context.Context, experimentIDs []uuid.UUID) (map[uuid.UUID][]*models.IssueTag, error) {
	if len(experimentIDs) == 0 {
		return make(map[uuid.UUID][]*models.IssueTag), nil
	}

	rows, err := r.pool.Query(ctx, `
		SELECT et.experiment_id, t.id, t.user_id, t.name, t.is_system, t.created_at
		FROM issue_tags t
		INNER JOIN experiment_tags et ON t.id = et.tag_id
		WHERE et.experiment_id = ANY($1)
		ORDER BY et.experiment_id, t.is_system DESC, t.name ASC
	`, experimentIDs)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[uuid.UUID][]*models.IssueTag)
	for rows.Next() {
		var experimentID uuid.UUID
		tag := &models.IssueTag{}
		err := rows.Scan(&experimentID, &tag.ID, &tag.UserID, &tag.Name, &tag.IsSystem, &tag.CreatedAt)
		if err != nil {
			return nil, err
		}
		result[experimentID] = append(result[experimentID], tag)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}
