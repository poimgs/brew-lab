package defaults

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrDefaultNotFound = errors.New("default not found")
)

type PostgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) GetAll(ctx context.Context, userID uuid.UUID) (Defaults, error) {
	query := `
		SELECT field_name, default_value
		FROM user_defaults
		WHERE user_id = $1
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	defaults := make(Defaults)
	for rows.Next() {
		var fieldName, defaultValue string
		if err := rows.Scan(&fieldName, &defaultValue); err != nil {
			return nil, err
		}
		defaults[fieldName] = defaultValue
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return defaults, nil
}

func (r *PostgresRepository) Upsert(ctx context.Context, userID uuid.UUID, input UpdateDefaultsInput) (Defaults, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO user_defaults (id, user_id, field_name, default_value, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $5)
		ON CONFLICT (user_id, field_name)
		DO UPDATE SET default_value = $4, updated_at = $5
	`

	now := time.Now()
	for fieldName, defaultValue := range input {
		if !IsValidField(fieldName) {
			continue
		}
		_, err := tx.ExecContext(ctx, query,
			uuid.New(), userID, fieldName, defaultValue, now,
		)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.GetAll(ctx, userID)
}

func (r *PostgresRepository) DeleteField(ctx context.Context, userID uuid.UUID, fieldName string) error {
	query := `
		DELETE FROM user_defaults
		WHERE user_id = $1 AND field_name = $2
	`

	result, err := r.db.ExecContext(ctx, query, userID, fieldName)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrDefaultNotFound
	}

	return nil
}
