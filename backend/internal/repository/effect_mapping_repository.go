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

func (r *EffectMappingRepository) Create(ctx context.Context, mapping *models.EffectMapping) (*models.EffectMapping, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Insert the parent effect mapping
	result := &models.EffectMapping{}
	err = tx.QueryRow(ctx, `
		INSERT INTO effect_mappings (user_id, name, variable, direction, tick_description, source, notes, active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, name, variable, direction, tick_description, source, notes, active, created_at, updated_at
	`, mapping.UserID, mapping.Name, mapping.Variable, mapping.Direction, mapping.TickDescription, mapping.Source, mapping.Notes, mapping.Active).Scan(
		&result.ID, &result.UserID, &result.Name, &result.Variable, &result.Direction, &result.TickDescription, &result.Source, &result.Notes, &result.Active, &result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Insert effects
	effects, err := r.insertEffects(ctx, tx, result.ID, mapping.Effects)
	if err != nil {
		return nil, err
	}
	result.Effects = effects

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *EffectMappingRepository) insertEffects(ctx context.Context, tx pgx.Tx, mappingID uuid.UUID, effects []models.Effect) ([]models.Effect, error) {
	if len(effects) == 0 {
		return []models.Effect{}, nil
	}

	var result []models.Effect
	for _, effect := range effects {
		var inserted models.Effect
		err := tx.QueryRow(ctx, `
			INSERT INTO effect_mapping_effects (effect_mapping_id, output_variable, direction, range_min, range_max, confidence)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, effect_mapping_id, output_variable, direction, range_min, range_max, confidence, created_at
		`, mappingID, effect.OutputVariable, effect.Direction, effect.RangeMin, effect.RangeMax, effect.Confidence).Scan(
			&inserted.ID, &inserted.EffectMappingID, &inserted.OutputVariable, &inserted.Direction, &inserted.RangeMin, &inserted.RangeMax, &inserted.Confidence, &inserted.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, inserted)
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
		&mapping.ID, &mapping.UserID, &mapping.Name, &mapping.Variable, &mapping.Direction, &mapping.TickDescription, &mapping.Source, &mapping.Notes, &mapping.Active, &mapping.CreatedAt, &mapping.UpdatedAt,
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
		SELECT id, effect_mapping_id, output_variable, direction, range_min, range_max, confidence, created_at
		FROM effect_mapping_effects
		WHERE effect_mapping_id = $1
		ORDER BY created_at
	`, mappingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var effects []models.Effect
	for rows.Next() {
		var effect models.Effect
		err := rows.Scan(
			&effect.ID, &effect.EffectMappingID, &effect.OutputVariable, &effect.Direction, &effect.RangeMin, &effect.RangeMax, &effect.Confidence, &effect.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		effects = append(effects, effect)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return effects, nil
}

func (r *EffectMappingRepository) getEffectsForMappings(ctx context.Context, mappingIDs []uuid.UUID) (map[uuid.UUID][]models.Effect, error) {
	if len(mappingIDs) == 0 {
		return make(map[uuid.UUID][]models.Effect), nil
	}

	// Build placeholders for IN clause
	placeholders := make([]string, len(mappingIDs))
	args := make([]interface{}, len(mappingIDs))
	for i, id := range mappingIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT id, effect_mapping_id, output_variable, direction, range_min, range_max, confidence, created_at
		FROM effect_mapping_effects
		WHERE effect_mapping_id IN (%s)
		ORDER BY effect_mapping_id, created_at
	`, strings.Join(placeholders, ", "))

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[uuid.UUID][]models.Effect)
	for rows.Next() {
		var effect models.Effect
		err := rows.Scan(
			&effect.ID, &effect.EffectMappingID, &effect.OutputVariable, &effect.Direction, &effect.RangeMin, &effect.RangeMax, &effect.Confidence, &effect.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		result[effect.EffectMappingID] = append(result[effect.EffectMappingID], effect)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *EffectMappingRepository) List(ctx context.Context, params models.EffectMappingListParams) (*models.EffectMappingListResult, error) {
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

	if params.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR tick_description ILIKE $%d)", argCount, argCount))
		args = append(args, "%"+params.Search+"%")
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

	// Validate and set sort
	sortBy := "created_at"
	validSortFields := map[string]bool{"created_at": true, "updated_at": true, "name": true, "variable": true}
	if params.SortBy != "" && validSortFields[params.SortBy] {
		sortBy = params.SortBy
	}

	sortDir := "DESC"
	if params.SortDir == "asc" {
		sortDir = "ASC"
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

	// Build main query
	query := fmt.Sprintf(`
		SELECT id, user_id, name, variable, direction, tick_description, source, notes, active, created_at, updated_at
		FROM effect_mappings
		WHERE %s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortBy, sortDir, argCount, argCount+1)

	args = append(args, pageSize, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mappings []*models.EffectMapping
	var mappingIDs []uuid.UUID
	for rows.Next() {
		mapping := &models.EffectMapping{}
		err := rows.Scan(
			&mapping.ID, &mapping.UserID, &mapping.Name, &mapping.Variable, &mapping.Direction, &mapping.TickDescription, &mapping.Source, &mapping.Notes, &mapping.Active, &mapping.CreatedAt, &mapping.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		mappings = append(mappings, mapping)
		mappingIDs = append(mappingIDs, mapping.ID)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Batch fetch effects
	effectsMap, err := r.getEffectsForMappings(ctx, mappingIDs)
	if err != nil {
		return nil, err
	}

	// Attach effects to mappings
	for _, mapping := range mappings {
		if effects, ok := effectsMap[mapping.ID]; ok {
			mapping.Effects = effects
		} else {
			mapping.Effects = []models.Effect{}
		}
	}

	totalPages := (totalCount + pageSize - 1) / pageSize

	return &models.EffectMappingListResult{
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
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Update the parent effect mapping
	result := &models.EffectMapping{}
	err = tx.QueryRow(ctx, `
		UPDATE effect_mappings
		SET name = $1, variable = $2, direction = $3, tick_description = $4, source = $5, notes = $6, active = $7, updated_at = NOW()
		WHERE id = $8 AND user_id = $9
		RETURNING id, user_id, name, variable, direction, tick_description, source, notes, active, created_at, updated_at
	`, mapping.Name, mapping.Variable, mapping.Direction, mapping.TickDescription, mapping.Source, mapping.Notes, mapping.Active, mapping.ID, mapping.UserID).Scan(
		&result.ID, &result.UserID, &result.Name, &result.Variable, &result.Direction, &result.TickDescription, &result.Source, &result.Notes, &result.Active, &result.CreatedAt, &result.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrEffectMappingNotFound
		}
		return nil, err
	}

	// Delete old effects and insert new ones
	_, err = tx.Exec(ctx, "DELETE FROM effect_mapping_effects WHERE effect_mapping_id = $1", result.ID)
	if err != nil {
		return nil, err
	}

	effects, err := r.insertEffectsTx(ctx, tx, result.ID, mapping.Effects)
	if err != nil {
		return nil, err
	}
	result.Effects = effects

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *EffectMappingRepository) insertEffectsTx(ctx context.Context, tx pgx.Tx, mappingID uuid.UUID, effects []models.Effect) ([]models.Effect, error) {
	if len(effects) == 0 {
		return []models.Effect{}, nil
	}

	var result []models.Effect
	for _, effect := range effects {
		var inserted models.Effect
		err := tx.QueryRow(ctx, `
			INSERT INTO effect_mapping_effects (effect_mapping_id, output_variable, direction, range_min, range_max, confidence)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, effect_mapping_id, output_variable, direction, range_min, range_max, confidence, created_at
		`, mappingID, effect.OutputVariable, effect.Direction, effect.RangeMin, effect.RangeMax, effect.Confidence).Scan(
			&inserted.ID, &inserted.EffectMappingID, &inserted.OutputVariable, &inserted.Direction, &inserted.RangeMin, &inserted.RangeMax, &inserted.Confidence, &inserted.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, inserted)
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
		&mapping.ID, &mapping.UserID, &mapping.Name, &mapping.Variable, &mapping.Direction, &mapping.TickDescription, &mapping.Source, &mapping.Notes, &mapping.Active, &mapping.CreatedAt, &mapping.UpdatedAt,
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

func (r *EffectMappingRepository) ListActive(ctx context.Context, userID uuid.UUID) ([]*models.EffectMapping, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, name, variable, direction, tick_description, source, notes, active, created_at, updated_at
		FROM effect_mappings
		WHERE user_id = $1 AND active = true
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mappings []*models.EffectMapping
	var mappingIDs []uuid.UUID
	for rows.Next() {
		mapping := &models.EffectMapping{}
		err := rows.Scan(
			&mapping.ID, &mapping.UserID, &mapping.Name, &mapping.Variable, &mapping.Direction, &mapping.TickDescription, &mapping.Source, &mapping.Notes, &mapping.Active, &mapping.CreatedAt, &mapping.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		mappings = append(mappings, mapping)
		mappingIDs = append(mappingIDs, mapping.ID)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Batch fetch effects
	effectsMap, err := r.getEffectsForMappings(ctx, mappingIDs)
	if err != nil {
		return nil, err
	}

	// Attach effects to mappings
	for _, mapping := range mappings {
		if effects, ok := effectsMap[mapping.ID]; ok {
			mapping.Effects = effects
		} else {
			mapping.Effects = []models.Effect{}
		}
	}

	return mappings, nil
}
