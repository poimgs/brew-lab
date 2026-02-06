package coffee_goal

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrCoffeeGoalNotFound = errors.New("coffee goal not found")
	ErrCoffeeNotFound     = errors.New("coffee not found")
)

type PostgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) GetByCoffeeID(ctx context.Context, userID, coffeeID uuid.UUID) (*CoffeeGoal, error) {
	// First verify the coffee exists and belongs to user
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(SELECT 1 FROM coffees WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL)
	`, coffeeID, userID).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrCoffeeNotFound
	}

	query := `
		SELECT id, coffee_id, user_id, tds, extraction_yield,
			aroma_intensity, sweetness_intensity, body_intensity, flavor_intensity,
			brightness_intensity, cleanliness_intensity, complexity_intensity,
			balance_intensity, aftertaste_intensity,
			overall_score, notes, created_at, updated_at
		FROM coffee_goals
		WHERE coffee_id = $1 AND user_id = $2
	`

	goal := &CoffeeGoal{}
	err = r.db.QueryRowContext(ctx, query, coffeeID, userID).Scan(
		&goal.ID, &goal.CoffeeID, &goal.UserID, &goal.TDS, &goal.ExtractionYield,
		&goal.AromaIntensity, &goal.SweetnessIntensity, &goal.BodyIntensity, &goal.FlavorIntensity,
		&goal.BrightnessIntensity, &goal.CleanlinessIntensity, &goal.ComplexityIntensity,
		&goal.BalanceIntensity, &goal.AftertasteIntensity,
		&goal.OverallScore, &goal.Notes, &goal.CreatedAt, &goal.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCoffeeGoalNotFound
		}
		return nil, err
	}

	return goal, nil
}

func (r *PostgresRepository) Upsert(ctx context.Context, userID, coffeeID uuid.UUID, input UpsertInput) (*CoffeeGoal, error) {
	// First verify the coffee exists and belongs to user
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(SELECT 1 FROM coffees WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL)
	`, coffeeID, userID).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrCoffeeNotFound
	}

	now := time.Now()

	// Use INSERT ... ON CONFLICT for upsert
	query := `
		INSERT INTO coffee_goals (
			id, coffee_id, user_id, tds, extraction_yield,
			aroma_intensity, sweetness_intensity, body_intensity, flavor_intensity,
			brightness_intensity, cleanliness_intensity, complexity_intensity,
			balance_intensity, aftertaste_intensity,
			overall_score, notes, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		ON CONFLICT (coffee_id) DO UPDATE SET
			tds = EXCLUDED.tds,
			extraction_yield = EXCLUDED.extraction_yield,
			aroma_intensity = EXCLUDED.aroma_intensity,
			sweetness_intensity = EXCLUDED.sweetness_intensity,
			body_intensity = EXCLUDED.body_intensity,
			flavor_intensity = EXCLUDED.flavor_intensity,
			brightness_intensity = EXCLUDED.brightness_intensity,
			cleanliness_intensity = EXCLUDED.cleanliness_intensity,
			complexity_intensity = EXCLUDED.complexity_intensity,
			balance_intensity = EXCLUDED.balance_intensity,
			aftertaste_intensity = EXCLUDED.aftertaste_intensity,
			overall_score = EXCLUDED.overall_score,
			notes = EXCLUDED.notes,
			updated_at = EXCLUDED.updated_at
		RETURNING id, coffee_id, user_id, tds, extraction_yield,
			aroma_intensity, sweetness_intensity, body_intensity, flavor_intensity,
			brightness_intensity, cleanliness_intensity, complexity_intensity,
			balance_intensity, aftertaste_intensity,
			overall_score, notes, created_at, updated_at
	`

	goal := &CoffeeGoal{}
	err = r.db.QueryRowContext(ctx, query,
		uuid.New(), coffeeID, userID, input.TDS, input.ExtractionYield,
		input.AromaIntensity, input.SweetnessIntensity, input.BodyIntensity, input.FlavorIntensity,
		input.BrightnessIntensity, input.CleanlinessIntensity, input.ComplexityIntensity,
		input.BalanceIntensity, input.AftertasteIntensity,
		input.OverallScore, input.Notes, now, now,
	).Scan(
		&goal.ID, &goal.CoffeeID, &goal.UserID, &goal.TDS, &goal.ExtractionYield,
		&goal.AromaIntensity, &goal.SweetnessIntensity, &goal.BodyIntensity, &goal.FlavorIntensity,
		&goal.BrightnessIntensity, &goal.CleanlinessIntensity, &goal.ComplexityIntensity,
		&goal.BalanceIntensity, &goal.AftertasteIntensity,
		&goal.OverallScore, &goal.Notes, &goal.CreatedAt, &goal.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return goal, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, userID, coffeeID uuid.UUID) error {
	// First verify the coffee exists and belongs to user
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(SELECT 1 FROM coffees WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL)
	`, coffeeID, userID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return ErrCoffeeNotFound
	}

	query := `DELETE FROM coffee_goals WHERE coffee_id = $1 AND user_id = $2`
	result, err := r.db.ExecContext(ctx, query, coffeeID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrCoffeeGoalNotFound
	}

	return nil
}
