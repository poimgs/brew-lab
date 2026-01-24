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

var ErrEffectMappingNotFound = errors.New("effect mapping not found")

type EffectMappingRepository struct {
	pool *pgxpool.Pool
}

func NewEffectMappingRepository(pool *pgxpool.Pool) *EffectMappingRepository {
	return &EffectMappingRepository{pool: pool}
}

type EffectMappingListParams struct {
	UserID   uuid.UUID
	Variable *string
	Active   *bool
	Search   *string
	Page     int
	PageSize int
}

type EffectMappingListResult struct {
	Mappings   []*models.EffectMapping
	TotalCount int
	Page       int
	PageSize   int
	TotalPages int
}

func (r *EffectMappingRepository) Create(ctx context.Context, mapping *models.EffectMapping) (*models.EffectMapping, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Insert the mapping
	result := &models.EffectMapping{}
	err = tx.QueryRow(ctx, `
		INSERT INTO effect_mappings (user_id, name, variable, direction, tick_description, source, notes, active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, name, variable, direction, tick_description, source, notes, active, created_at, updated_at
	`, mapping.UserID, mapping.Name, mapping.Variable, mapping.Direction, mapping.TickDescription,
		mapping.Source, mapping.Notes, mapping.Active).Scan(
		&result.ID, &result.UserID, &result.Name, &result.Variable, &result.Direction,
		&result.TickDescription, &result.Source, &result.Notes, &result.Active,
		&result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert mapping: %w", err)
	}

	// Insert effects
	for _, effect := range mapping.Effects {
		var effectResult models.Effect
		err = tx.QueryRow(ctx, `
			INSERT INTO effect_mapping_effects (effect_mapping_id, output_variable, direction, range_min, range_max, confidence)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, effect_mapping_id, output_variable, direction, range_min, range_max, confidence
		`, result.ID, effect.OutputVariable, effect.Direction, effect.RangeMin, effect.RangeMax, effect.Confidence).Scan(
			&effectResult.ID, &effectResult.EffectMappingID, &effectResult.OutputVariable,
			&effectResult.Direction, &effectResult.RangeMin, &effectResult.RangeMax, &effectResult.Confidence,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to insert effect: %w", err)
		}
		result.Effects = append(result.Effects, effectResult)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return result, nil
}

func (r *EffectMappingRepository) GetByID(ctx context.Context, userID, mappingID uuid.UUID) (*models.EffectMapping, error) {
	mapping := &models.EffectMapping{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, name, variable, direction, tick_description, source, notes, active, created_at, updated_at
		FROM effect_mappings
		WHERE id = $1 AND user_id = $2
	`, mappingID, userID).Scan(
		&mapping.ID, &mapping.UserID, &mapping.Name, &mapping.Variable, &mapping.Direction,
		&mapping.TickDescription, &mapping.Source, &mapping.Notes, &mapping.Active,
		&mapping.CreatedAt, &mapping.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrEffectMappingNotFound
		}
		return nil, err
	}

	// Fetch effects
	effects, err := r.getEffectsForMapping(ctx, mapping.ID)
	if err != nil {
		return nil, err
	}
	mapping.Effects = effects

	return mapping, nil
}

func (r *EffectMappingRepository) getEffectsForMapping(ctx context.Context, mappingID uuid.UUID) ([]models.Effect, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, effect_mapping_id, output_variable, direction, range_min, range_max, confidence
		FROM effect_mapping_effects
		WHERE effect_mapping_id = $1
		ORDER BY output_variable
	`, mappingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var effects []models.Effect
	for rows.Next() {
		var e models.Effect
		err := rows.Scan(&e.ID, &e.EffectMappingID, &e.OutputVariable, &e.Direction, &e.RangeMin, &e.RangeMax, &e.Confidence)
		if err != nil {
			return nil, err
		}
		effects = append(effects, e)
	}

	return effects, rows.Err()
}

func (r *EffectMappingRepository) getEffectsForMappings(ctx context.Context, mappingIDs []uuid.UUID) (map[uuid.UUID][]models.Effect, error) {
	if len(mappingIDs) == 0 {
		return make(map[uuid.UUID][]models.Effect), nil
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id, effect_mapping_id, output_variable, direction, range_min, range_max, confidence
		FROM effect_mapping_effects
		WHERE effect_mapping_id = ANY($1)
		ORDER BY effect_mapping_id, output_variable
	`, mappingIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[uuid.UUID][]models.Effect)
	for rows.Next() {
		var e models.Effect
		err := rows.Scan(&e.ID, &e.EffectMappingID, &e.OutputVariable, &e.Direction, &e.RangeMin, &e.RangeMax, &e.Confidence)
		if err != nil {
			return nil, err
		}
		result[e.EffectMappingID] = append(result[e.EffectMappingID], e)
	}

	return result, rows.Err()
}

func (r *EffectMappingRepository) List(ctx context.Context, params EffectMappingListParams) (*EffectMappingListResult, error) {
	var conditions []string
	var args []interface{}
	argCount := 1

	conditions = append(conditions, fmt.Sprintf("user_id = $%d", argCount))
	args = append(args, params.UserID)
	argCount++

	if params.Variable != nil {
		conditions = append(conditions, fmt.Sprintf("variable = $%d", argCount))
		args = append(args, *params.Variable)
		argCount++
	}

	if params.Active != nil {
		conditions = append(conditions, fmt.Sprintf("active = $%d", argCount))
		args = append(args, *params.Active)
		argCount++
	}

	if params.Search != nil && *params.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(name ILIKE $%d OR notes ILIKE $%d)", argCount, argCount))
		args = append(args, "%"+*params.Search+"%")
		argCount++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count total
	var totalCount int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM effect_mappings WHERE %s", whereClause)
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, err
	}

	// Pagination
	page := params.Page
	if page < 1 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	// Main query
	query := fmt.Sprintf(`
		SELECT id, user_id, name, variable, direction, tick_description, source, notes, active, created_at, updated_at
		FROM effect_mappings
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argCount, argCount+1)

	args = append(args, pageSize, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mappings []*models.EffectMapping
	var mappingIDs []uuid.UUID
	for rows.Next() {
		m := &models.EffectMapping{}
		err := rows.Scan(
			&m.ID, &m.UserID, &m.Name, &m.Variable, &m.Direction,
			&m.TickDescription, &m.Source, &m.Notes, &m.Active,
			&m.CreatedAt, &m.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		mappings = append(mappings, m)
		mappingIDs = append(mappingIDs, m.ID)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Fetch all effects in one query
	effectsMap, err := r.getEffectsForMappings(ctx, mappingIDs)
	if err != nil {
		return nil, err
	}

	// Attach effects to mappings
	for _, m := range mappings {
		m.Effects = effectsMap[m.ID]
		if m.Effects == nil {
			m.Effects = []models.Effect{}
		}
	}

	totalPages := (totalCount + pageSize - 1) / pageSize

	return &EffectMappingListResult{
		Mappings:   mappings,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (r *EffectMappingRepository) Update(ctx context.Context, mapping *models.EffectMapping) (*models.EffectMapping, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Update the mapping
	result := &models.EffectMapping{}
	err = tx.QueryRow(ctx, `
		UPDATE effect_mappings
		SET name = $1, variable = $2, direction = $3, tick_description = $4, source = $5, notes = $6, updated_at = NOW()
		WHERE id = $7 AND user_id = $8
		RETURNING id, user_id, name, variable, direction, tick_description, source, notes, active, created_at, updated_at
	`, mapping.Name, mapping.Variable, mapping.Direction, mapping.TickDescription,
		mapping.Source, mapping.Notes, mapping.ID, mapping.UserID).Scan(
		&result.ID, &result.UserID, &result.Name, &result.Variable, &result.Direction,
		&result.TickDescription, &result.Source, &result.Notes, &result.Active,
		&result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrEffectMappingNotFound
		}
		return nil, fmt.Errorf("failed to update mapping: %w", err)
	}

	// Delete existing effects
	_, err = tx.Exec(ctx, `DELETE FROM effect_mapping_effects WHERE effect_mapping_id = $1`, result.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to delete existing effects: %w", err)
	}

	// Insert new effects
	for _, effect := range mapping.Effects {
		var effectResult models.Effect
		err = tx.QueryRow(ctx, `
			INSERT INTO effect_mapping_effects (effect_mapping_id, output_variable, direction, range_min, range_max, confidence)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, effect_mapping_id, output_variable, direction, range_min, range_max, confidence
		`, result.ID, effect.OutputVariable, effect.Direction, effect.RangeMin, effect.RangeMax, effect.Confidence).Scan(
			&effectResult.ID, &effectResult.EffectMappingID, &effectResult.OutputVariable,
			&effectResult.Direction, &effectResult.RangeMin, &effectResult.RangeMax, &effectResult.Confidence,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to insert effect: %w", err)
		}
		result.Effects = append(result.Effects, effectResult)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return result, nil
}

func (r *EffectMappingRepository) Delete(ctx context.Context, userID, mappingID uuid.UUID) error {
	result, err := r.pool.Exec(ctx, `
		DELETE FROM effect_mappings
		WHERE id = $1 AND user_id = $2
	`, mappingID, userID)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrEffectMappingNotFound
	}

	return nil
}

func (r *EffectMappingRepository) ToggleActive(ctx context.Context, userID, mappingID uuid.UUID) (*models.EffectMapping, error) {
	mapping := &models.EffectMapping{}
	err := r.pool.QueryRow(ctx, `
		UPDATE effect_mappings
		SET active = NOT active, updated_at = NOW()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, name, variable, direction, tick_description, source, notes, active, created_at, updated_at
	`, mappingID, userID).Scan(
		&mapping.ID, &mapping.UserID, &mapping.Name, &mapping.Variable, &mapping.Direction,
		&mapping.TickDescription, &mapping.Source, &mapping.Notes, &mapping.Active,
		&mapping.CreatedAt, &mapping.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrEffectMappingNotFound
		}
		return nil, err
	}

	// Fetch effects
	effects, err := r.getEffectsForMapping(ctx, mapping.ID)
	if err != nil {
		return nil, err
	}
	mapping.Effects = effects

	return mapping, nil
}

func (r *EffectMappingRepository) GetActiveMappings(ctx context.Context, userID uuid.UUID) ([]*models.EffectMapping, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, name, variable, direction, tick_description, source, notes, active, created_at, updated_at
		FROM effect_mappings
		WHERE user_id = $1 AND active = TRUE
		ORDER BY variable, direction
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mappings []*models.EffectMapping
	var mappingIDs []uuid.UUID
	for rows.Next() {
		m := &models.EffectMapping{}
		err := rows.Scan(
			&m.ID, &m.UserID, &m.Name, &m.Variable, &m.Direction,
			&m.TickDescription, &m.Source, &m.Notes, &m.Active,
			&m.CreatedAt, &m.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		mappings = append(mappings, m)
		mappingIDs = append(mappingIDs, m.ID)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Fetch all effects
	effectsMap, err := r.getEffectsForMappings(ctx, mappingIDs)
	if err != nil {
		return nil, err
	}

	for _, m := range mappings {
		m.Effects = effectsMap[m.ID]
		if m.Effects == nil {
			m.Effects = []models.Effect{}
		}
	}

	return mappings, nil
}
