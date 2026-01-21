package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
)

var ErrDefaultNotFound = errors.New("default not found")

type UserDefaultsRepository struct {
	pool *pgxpool.Pool
}

func NewUserDefaultsRepository(pool *pgxpool.Pool) *UserDefaultsRepository {
	return &UserDefaultsRepository{pool: pool}
}

func (r *UserDefaultsRepository) Set(ctx context.Context, userID uuid.UUID, fieldName, fieldValue string) (*models.UserDefault, error) {
	def := &models.UserDefault{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO user_defaults (user_id, field_name, field_value)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, field_name) DO UPDATE
		SET field_value = EXCLUDED.field_value, updated_at = NOW()
		RETURNING id, user_id, field_name, field_value, created_at, updated_at
	`, userID, fieldName, fieldValue).Scan(&def.ID, &def.UserID, &def.FieldName, &def.FieldValue, &def.CreatedAt, &def.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return def, nil
}

func (r *UserDefaultsRepository) Get(ctx context.Context, userID uuid.UUID, fieldName string) (*models.UserDefault, error) {
	def := &models.UserDefault{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, field_name, field_value, created_at, updated_at
		FROM user_defaults
		WHERE user_id = $1 AND field_name = $2
	`, userID, fieldName).Scan(&def.ID, &def.UserID, &def.FieldName, &def.FieldValue, &def.CreatedAt, &def.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDefaultNotFound
		}
		return nil, err
	}

	return def, nil
}

func (r *UserDefaultsRepository) GetAll(ctx context.Context, userID uuid.UUID) ([]*models.UserDefault, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, field_name, field_value, created_at, updated_at
		FROM user_defaults
		WHERE user_id = $1
		ORDER BY field_name
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var defaults []*models.UserDefault
	for rows.Next() {
		def := &models.UserDefault{}
		err := rows.Scan(&def.ID, &def.UserID, &def.FieldName, &def.FieldValue, &def.CreatedAt, &def.UpdatedAt)
		if err != nil {
			return nil, err
		}
		defaults = append(defaults, def)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return defaults, nil
}

func (r *UserDefaultsRepository) Delete(ctx context.Context, userID uuid.UUID, fieldName string) error {
	result, err := r.pool.Exec(ctx, `
		DELETE FROM user_defaults
		WHERE user_id = $1 AND field_name = $2
	`, userID, fieldName)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrDefaultNotFound
	}

	return nil
}

func (r *UserDefaultsRepository) SetMultiple(ctx context.Context, userID uuid.UUID, defaults map[string]string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for fieldName, fieldValue := range defaults {
		_, err := tx.Exec(ctx, `
			INSERT INTO user_defaults (user_id, field_name, field_value)
			VALUES ($1, $2, $3)
			ON CONFLICT (user_id, field_name) DO UPDATE
			SET field_value = EXCLUDED.field_value, updated_at = NOW()
		`, userID, fieldName, fieldValue)

		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
