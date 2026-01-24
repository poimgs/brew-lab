package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
)

var ErrMineralProfileNotFound = errors.New("mineral profile not found")

type MineralProfileRepository struct {
	pool *pgxpool.Pool
}

func NewMineralProfileRepository(pool *pgxpool.Pool) *MineralProfileRepository {
	return &MineralProfileRepository{pool: pool}
}

func (r *MineralProfileRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.MineralProfile, error) {
	mp := &models.MineralProfile{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, brand, hardness, alkalinity, magnesium, calcium, potassium, sodium, chloride, sulfate, bicarbonate, typical_dose, taste_effects, created_at
		FROM mineral_profiles
		WHERE id = $1
	`, id).Scan(
		&mp.ID, &mp.Name, &mp.Brand, &mp.Hardness, &mp.Alkalinity, &mp.Magnesium, &mp.Calcium, &mp.Potassium, &mp.Sodium, &mp.Chloride, &mp.Sulfate, &mp.Bicarbonate, &mp.TypicalDose, &mp.TasteEffects, &mp.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMineralProfileNotFound
		}
		return nil, err
	}

	return mp, nil
}

func (r *MineralProfileRepository) List(ctx context.Context) ([]*models.MineralProfile, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, brand, hardness, alkalinity, magnesium, calcium, potassium, sodium, chloride, sulfate, bicarbonate, typical_dose, taste_effects, created_at
		FROM mineral_profiles
		ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var profiles []*models.MineralProfile
	for rows.Next() {
		mp := &models.MineralProfile{}
		err := rows.Scan(
			&mp.ID, &mp.Name, &mp.Brand, &mp.Hardness, &mp.Alkalinity, &mp.Magnesium, &mp.Calcium, &mp.Potassium, &mp.Sodium, &mp.Chloride, &mp.Sulfate, &mp.Bicarbonate, &mp.TypicalDose, &mp.TasteEffects, &mp.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		profiles = append(profiles, mp)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return profiles, nil
}
