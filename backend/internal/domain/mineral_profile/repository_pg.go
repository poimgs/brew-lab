package mineral_profile

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
)

var ErrMineralProfileNotFound = errors.New("mineral profile not found")

type PostgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) List(ctx context.Context) (*ListMineralProfilesResult, error) {
	query := `
		SELECT id, name, brand, hardness, alkalinity, magnesium, calcium, potassium,
		       sodium, chloride, sulfate, bicarbonate, typical_dose, taste_effects,
		       created_at, updated_at
		FROM mineral_profiles
		ORDER BY name ASC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var profiles []MineralProfile
	for rows.Next() {
		var mp MineralProfile
		err := rows.Scan(
			&mp.ID, &mp.Name, &mp.Brand, &mp.Hardness, &mp.Alkalinity,
			&mp.Magnesium, &mp.Calcium, &mp.Potassium, &mp.Sodium,
			&mp.Chloride, &mp.Sulfate, &mp.Bicarbonate, &mp.TypicalDose,
			&mp.TasteEffects, &mp.CreatedAt, &mp.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		profiles = append(profiles, mp)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	if profiles == nil {
		profiles = []MineralProfile{}
	}

	return &ListMineralProfilesResult{
		Items: profiles,
	}, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id uuid.UUID) (*MineralProfile, error) {
	query := `
		SELECT id, name, brand, hardness, alkalinity, magnesium, calcium, potassium,
		       sodium, chloride, sulfate, bicarbonate, typical_dose, taste_effects,
		       created_at, updated_at
		FROM mineral_profiles
		WHERE id = $1
	`

	mp := &MineralProfile{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&mp.ID, &mp.Name, &mp.Brand, &mp.Hardness, &mp.Alkalinity,
		&mp.Magnesium, &mp.Calcium, &mp.Potassium, &mp.Sodium,
		&mp.Chloride, &mp.Sulfate, &mp.Bicarbonate, &mp.TypicalDose,
		&mp.TasteEffects, &mp.CreatedAt, &mp.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrMineralProfileNotFound
		}
		return nil, err
	}

	return mp, nil
}
