package defaults

import (
	"context"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PgRepository struct {
	pool *pgxpool.Pool
}

func NewPgRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{pool: pool}
}

func (r *PgRepository) Get(ctx context.Context, userID string) (*DefaultsResponse, error) {
	resp := &DefaultsResponse{
		PourDefaults: []PourDefault{},
	}

	// Load key-value defaults
	rows, err := r.pool.Query(ctx,
		`SELECT field_name, default_value FROM user_defaults WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var fieldName, defaultValue string
		if err := rows.Scan(&fieldName, &defaultValue); err != nil {
			return nil, err
		}
		applyFieldToResponse(resp, fieldName, defaultValue)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Load pour defaults
	pourRows, err := r.pool.Query(ctx,
		`SELECT pour_number, water_amount, pour_style, wait_time
		 FROM user_pour_defaults
		 WHERE user_id = $1
		 ORDER BY pour_number`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer pourRows.Close()

	for pourRows.Next() {
		var pd PourDefault
		if err := pourRows.Scan(&pd.PourNumber, &pd.WaterAmount, &pd.PourStyle, &pd.WaitTime); err != nil {
			return nil, err
		}
		resp.PourDefaults = append(resp.PourDefaults, pd)
	}
	if err := pourRows.Err(); err != nil {
		return nil, err
	}

	return resp, nil
}

func (r *PgRepository) Put(ctx context.Context, userID string, req UpdateRequest) (*DefaultsResponse, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Delete all existing key-value defaults
	if _, err := tx.Exec(ctx, `DELETE FROM user_defaults WHERE user_id = $1`, userID); err != nil {
		return nil, err
	}

	// Insert new key-value defaults
	fields := buildFieldMap(req)
	for fieldName, value := range fields {
		if _, err := tx.Exec(ctx,
			`INSERT INTO user_defaults (user_id, field_name, default_value) VALUES ($1, $2, $3)`,
			userID, fieldName, value,
		); err != nil {
			return nil, err
		}
	}

	// Delete all existing pour defaults
	if _, err := tx.Exec(ctx, `DELETE FROM user_pour_defaults WHERE user_id = $1`, userID); err != nil {
		return nil, err
	}

	// Insert new pour defaults
	for _, pd := range req.PourDefaults {
		if _, err := tx.Exec(ctx,
			`INSERT INTO user_pour_defaults (user_id, pour_number, water_amount, pour_style, wait_time)
			 VALUES ($1, $2, $3, $4, $5)`,
			userID, pd.PourNumber, pd.WaterAmount, pd.PourStyle, pd.WaitTime,
		); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.Get(ctx, userID)
}

func (r *PgRepository) DeleteField(ctx context.Context, userID, fieldName string) error {
	result, err := r.pool.Exec(ctx,
		`DELETE FROM user_defaults WHERE user_id = $1 AND field_name = $2`,
		userID, fieldName,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// buildFieldMap converts the request fields into a map of field_name -> string value.
// Only non-nil fields are included.
func buildFieldMap(req UpdateRequest) map[string]string {
	fields := make(map[string]string)
	if req.CoffeeWeight != nil {
		fields["coffee_weight"] = strconv.FormatFloat(*req.CoffeeWeight, 'f', -1, 64)
	}
	if req.Ratio != nil {
		fields["ratio"] = strconv.FormatFloat(*req.Ratio, 'f', -1, 64)
	}
	if req.GrindSize != nil {
		fields["grind_size"] = strconv.FormatFloat(*req.GrindSize, 'f', -1, 64)
	}
	if req.WaterTemperature != nil {
		fields["water_temperature"] = strconv.FormatFloat(*req.WaterTemperature, 'f', -1, 64)
	}
	if req.FilterPaperID != nil {
		fields["filter_paper_id"] = *req.FilterPaperID
	}
	if req.DripperID != nil {
		fields["dripper_id"] = *req.DripperID
	}
	return fields
}

// applyFieldToResponse sets the appropriate response field from a key-value pair.
func applyFieldToResponse(resp *DefaultsResponse, fieldName, value string) {
	switch fieldName {
	case "coffee_weight":
		if v, err := strconv.ParseFloat(value, 64); err == nil {
			resp.CoffeeWeight = &v
		}
	case "ratio":
		if v, err := strconv.ParseFloat(value, 64); err == nil {
			resp.Ratio = &v
		}
	case "grind_size":
		if v, err := strconv.ParseFloat(value, 64); err == nil {
			resp.GrindSize = &v
		}
	case "water_temperature":
		if v, err := strconv.ParseFloat(value, 64); err == nil {
			resp.WaterTemperature = &v
		}
	case "filter_paper_id":
		resp.FilterPaperID = &value
	case "dripper_id":
		resp.DripperID = &value
	}
}
