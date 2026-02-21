package sharelink

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PgRepository struct {
	pool *pgxpool.Pool
}

func NewPgRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{pool: pool}
}

func (r *PgRepository) GetShareToken(ctx context.Context, userID string) (*string, *time.Time, error) {
	var token *string
	var createdAt *time.Time
	err := r.pool.QueryRow(ctx,
		`SELECT share_token, share_token_created_at FROM users WHERE id = $1`,
		userID,
	).Scan(&token, &createdAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	return token, createdAt, nil
}

func (r *PgRepository) SetShareToken(ctx context.Context, userID, token string) (*time.Time, error) {
	var createdAt time.Time
	err := r.pool.QueryRow(ctx,
		`UPDATE users SET share_token = $1, share_token_created_at = NOW() WHERE id = $2 RETURNING share_token_created_at`,
		token, userID,
	).Scan(&createdAt)
	if err != nil {
		return nil, err
	}
	return &createdAt, nil
}

func (r *PgRepository) ClearShareToken(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET share_token = NULL, share_token_created_at = NULL WHERE id = $1`,
		userID,
	)
	return err
}

func (r *PgRepository) GetUserIDByToken(ctx context.Context, token string) (*string, error) {
	var userID string
	err := r.pool.QueryRow(ctx,
		`SELECT id FROM users WHERE share_token = $1`,
		token,
	).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &userID, nil
}

func (r *PgRepository) GetSharedCoffees(ctx context.Context, userID string) ([]ShareCoffee, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			c.roaster, c.name, c.country, c.region, c.process,
			c.roast_level, c.tasting_notes, c.roast_date,
			ref.overall_score,
			ref.aroma_intensity, ref.body_intensity, ref.sweetness_intensity,
			ref.brightness_intensity, ref.complexity_intensity, ref.aftertaste_intensity
		FROM coffees c
		LEFT JOIN LATERAL (
			SELECT b.overall_score,
				   b.aroma_intensity, b.body_intensity, b.sweetness_intensity,
				   b.brightness_intensity, b.complexity_intensity, b.aftertaste_intensity
			FROM brews b
			WHERE b.coffee_id = c.id
			ORDER BY
				CASE WHEN b.id = c.reference_brew_id THEN 0 ELSE 1 END,
				b.brew_date DESC, b.created_at DESC
			LIMIT 1
		) ref ON true
		WHERE c.user_id = $1 AND c.archived_at IS NULL
		ORDER BY c.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var coffees []ShareCoffee
	for rows.Next() {
		var sc ShareCoffee
		var roastDate *time.Time
		var overallScore, aroma, body, sweetness, brightness, complexity, aftertaste *int

		err := rows.Scan(
			&sc.Roaster, &sc.Name, &sc.Country, &sc.Region, &sc.Process,
			&sc.RoastLevel, &sc.TastingNotes, &roastDate,
			&overallScore,
			&aroma, &body, &sweetness,
			&brightness, &complexity, &aftertaste,
		)
		if err != nil {
			return nil, err
		}

		if roastDate != nil {
			s := roastDate.Format("2006-01-02")
			sc.RoastDate = &s
		}

		if overallScore != nil || aroma != nil || body != nil || sweetness != nil ||
			brightness != nil || complexity != nil || aftertaste != nil {
			sc.ReferenceBrew = &ShareReferenceBrew{
				OverallScore:        overallScore,
				AromaIntensity:      aroma,
				BodyIntensity:       body,
				SweetnessIntensity:  sweetness,
				BrightnessIntensity: brightness,
				ComplexityIntensity: complexity,
				AftertasteIntensity: aftertaste,
			}
		}

		coffees = append(coffees, sc)
	}

	if coffees == nil {
		coffees = []ShareCoffee{}
	}

	return coffees, nil
}
