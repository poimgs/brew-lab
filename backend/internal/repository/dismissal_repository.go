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

var ErrDismissalNotFound = errors.New("dismissal not found")

type DismissalRepository struct {
	pool *pgxpool.Pool
}

func NewDismissalRepository(pool *pgxpool.Pool) *DismissalRepository {
	return &DismissalRepository{pool: pool}
}

// Create adds a new dismissal for an experiment-mapping pair
func (r *DismissalRepository) Create(ctx context.Context, experimentID, mappingID, userID uuid.UUID) (*models.ExperimentMappingDismissal, error) {
	dismissal := &models.ExperimentMappingDismissal{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO experiment_mapping_dismissals (experiment_id, mapping_id, user_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (experiment_id, mapping_id) DO UPDATE SET dismissed_at = NOW()
		RETURNING id, experiment_id, mapping_id, user_id, dismissed_at
	`, experimentID, mappingID, userID).Scan(
		&dismissal.ID, &dismissal.ExperimentID, &dismissal.MappingID, &dismissal.UserID, &dismissal.DismissedAt,
	)

	if err != nil {
		return nil, err
	}

	return dismissal, nil
}

// Delete removes a dismissal for an experiment-mapping pair
func (r *DismissalRepository) Delete(ctx context.Context, experimentID, mappingID, userID uuid.UUID) error {
	result, err := r.pool.Exec(ctx, `
		DELETE FROM experiment_mapping_dismissals
		WHERE experiment_id = $1 AND mapping_id = $2 AND user_id = $3
	`, experimentID, mappingID, userID)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrDismissalNotFound
	}

	return nil
}

// GetForExperiment returns all dismissed mapping IDs for an experiment
func (r *DismissalRepository) GetForExperiment(ctx context.Context, experimentID, userID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT mapping_id
		FROM experiment_mapping_dismissals
		WHERE experiment_id = $1 AND user_id = $2
	`, experimentID, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mappingIDs []uuid.UUID
	for rows.Next() {
		var mappingID uuid.UUID
		if err := rows.Scan(&mappingID); err != nil {
			return nil, err
		}
		mappingIDs = append(mappingIDs, mappingID)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	if mappingIDs == nil {
		mappingIDs = []uuid.UUID{}
	}

	return mappingIDs, nil
}

// Exists checks if a dismissal exists for an experiment-mapping pair
func (r *DismissalRepository) Exists(ctx context.Context, experimentID, mappingID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM experiment_mapping_dismissals
			WHERE experiment_id = $1 AND mapping_id = $2 AND user_id = $3
		)
	`, experimentID, mappingID, userID).Scan(&exists)

	if err != nil {
		return false, err
	}

	return exists, nil
}

// GetDismissedMappingsForExperiments returns a map of experiment IDs to their dismissed mapping IDs
func (r *DismissalRepository) GetDismissedMappingsForExperiments(ctx context.Context, experimentIDs []uuid.UUID, userID uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	if len(experimentIDs) == 0 {
		return make(map[uuid.UUID][]uuid.UUID), nil
	}

	// Build placeholders for IN clause
	placeholders := make([]string, len(experimentIDs))
	args := make([]interface{}, len(experimentIDs)+1)
	for i, id := range experimentIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	args[len(experimentIDs)] = userID

	query := fmt.Sprintf(`
		SELECT experiment_id, mapping_id
		FROM experiment_mapping_dismissals
		WHERE experiment_id IN (%s) AND user_id = $%d
	`, strings.Join(placeholders, ", "), len(experimentIDs)+1)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[uuid.UUID][]uuid.UUID)
	for rows.Next() {
		var experimentID, mappingID uuid.UUID
		if err := rows.Scan(&experimentID, &mappingID); err != nil {
			return nil, err
		}
		result[experimentID] = append(result[experimentID], mappingID)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// GetByID retrieves a dismissal by its ID
func (r *DismissalRepository) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.ExperimentMappingDismissal, error) {
	dismissal := &models.ExperimentMappingDismissal{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, experiment_id, mapping_id, user_id, dismissed_at
		FROM experiment_mapping_dismissals
		WHERE id = $1 AND user_id = $2
	`, id, userID).Scan(
		&dismissal.ID, &dismissal.ExperimentID, &dismissal.MappingID, &dismissal.UserID, &dismissal.DismissedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDismissalNotFound
		}
		return nil, err
	}

	return dismissal, nil
}
