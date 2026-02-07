package session

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrSessionNotFound        = errors.New("session not found")
	ErrCoffeeNotFound         = errors.New("coffee not found")
	ErrBrewWrongCoffee  = errors.New("brew does not belong to this coffee")
	ErrBrewNotFound     = errors.New("brew not found")
)

type PostgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, userID uuid.UUID, input CreateSessionInput) (*Session, error) {
	// Validate coffee exists and belongs to user
	var coffeeExists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM coffees WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL)`,
		input.CoffeeID, userID,
	).Scan(&coffeeExists)
	if err != nil {
		return nil, err
	}
	if !coffeeExists {
		return nil, ErrCoffeeNotFound
	}

	session := &Session{
		ID:             uuid.New(),
		UserID:         userID,
		CoffeeID:       input.CoffeeID,
		Name:           input.Name,
		VariableTested: input.VariableTested,
		Hypothesis:     input.Hypothesis,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO sessions (id, user_id, coffee_id, name, variable_tested, hypothesis, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, session.ID, session.UserID, session.CoffeeID, session.Name, session.VariableTested,
		session.Hypothesis, session.CreatedAt, session.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Link brews if provided
	if len(input.BrewIDs) > 0 {
		if err := r.linkBrewsInTx(ctx, tx, userID, session.ID, input.CoffeeID, input.BrewIDs); err != nil {
			return nil, err
		}
		session.BrewCount = len(input.BrewIDs)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return session, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error) {
	session := &Session{}
	err := r.db.QueryRowContext(ctx, `
		SELECT s.id, s.user_id, s.coffee_id, s.name, s.variable_tested, s.hypothesis, s.conclusion,
			s.created_at, s.updated_at,
			(SELECT COUNT(*) FROM session_brews WHERE session_id = s.id) AS brew_count
		FROM sessions s
		WHERE s.id = $1 AND s.user_id = $2
	`, sessionID, userID).Scan(
		&session.ID, &session.UserID, &session.CoffeeID, &session.Name,
		&session.VariableTested, &session.Hypothesis, &session.Conclusion,
		&session.CreatedAt, &session.UpdatedAt, &session.BrewCount,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, err
	}

	// Fetch linked brews
	rows, err := r.db.QueryContext(ctx, `
		SELECT e.id, e.brew_date, e.grind_size, e.overall_score, e.overall_notes
		FROM brews e
		JOIN session_brews sb ON sb.brew_id = e.id
		WHERE sb.session_id = $1
		ORDER BY e.brew_date ASC
	`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var b BrewSummary
		if err := rows.Scan(&b.ID, &b.BrewDate, &b.GrindSize, &b.OverallScore, &b.OverallNotes); err != nil {
			return nil, err
		}
		session.Brews = append(session.Brews, b)
	}

	return session, nil
}

func (r *PostgresRepository) List(ctx context.Context, userID uuid.UUID, params ListSessionsParams) (*ListSessionsResult, error) {
	params.SetDefaults()

	// Count total
	var total int
	countQuery := `SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND coffee_id = $2`
	if err := r.db.QueryRowContext(ctx, countQuery, userID, params.CoffeeID).Scan(&total); err != nil {
		return nil, err
	}

	offset := (params.Page - 1) * params.PerPage
	totalPages := (total + params.PerPage - 1) / params.PerPage

	rows, err := r.db.QueryContext(ctx, `
		SELECT s.id, s.user_id, s.coffee_id, s.name, s.variable_tested, s.hypothesis, s.conclusion,
			s.created_at, s.updated_at,
			(SELECT COUNT(*) FROM session_brews WHERE session_id = s.id) AS brew_count
		FROM sessions s
		WHERE s.user_id = $1 AND s.coffee_id = $2
		ORDER BY s.created_at DESC
		LIMIT $3 OFFSET $4
	`, userID, params.CoffeeID, params.PerPage, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Session
	for rows.Next() {
		var s Session
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.CoffeeID, &s.Name, &s.VariableTested,
			&s.Hypothesis, &s.Conclusion, &s.CreatedAt, &s.UpdatedAt, &s.BrewCount,
		); err != nil {
			return nil, err
		}
		items = append(items, s)
	}

	if items == nil {
		items = []Session{}
	}

	return &ListSessionsResult{
		Items: items,
		Pagination: Pagination{
			Page:       params.Page,
			PerPage:    params.PerPage,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (r *PostgresRepository) Update(ctx context.Context, userID, sessionID uuid.UUID, input UpdateSessionInput) (*Session, error) {
	// Check session exists and belongs to user
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM sessions WHERE id = $1 AND user_id = $2)`,
		sessionID, userID,
	).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrSessionNotFound
	}

	setClauses := []string{"updated_at = NOW()"}
	args := []interface{}{sessionID, userID}
	argIdx := 3

	if input.Name != nil {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, *input.Name)
		argIdx++
	}
	if input.VariableTested != nil {
		setClauses = append(setClauses, fmt.Sprintf("variable_tested = $%d", argIdx))
		args = append(args, *input.VariableTested)
		argIdx++
	}
	if input.Hypothesis != nil {
		setClauses = append(setClauses, fmt.Sprintf("hypothesis = $%d", argIdx))
		args = append(args, *input.Hypothesis)
		argIdx++
	}
	if input.Conclusion != nil {
		setClauses = append(setClauses, fmt.Sprintf("conclusion = $%d", argIdx))
		args = append(args, *input.Conclusion)
		argIdx++
	}

	query := fmt.Sprintf(`
		UPDATE sessions SET %s
		WHERE id = $1 AND user_id = $2
	`, strings.Join(setClauses, ", "))

	_, err = r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	return r.GetByID(ctx, userID, sessionID)
}

func (r *PostgresRepository) Delete(ctx context.Context, userID, sessionID uuid.UUID) error {
	result, err := r.db.ExecContext(ctx,
		`DELETE FROM sessions WHERE id = $1 AND user_id = $2`,
		sessionID, userID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrSessionNotFound
	}

	return nil
}

func (r *PostgresRepository) LinkBrews(ctx context.Context, userID, sessionID uuid.UUID, brewIDs []uuid.UUID) (*Session, error) {
	// Get session to verify ownership and get coffee_id
	session, err := r.GetByID(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if err := r.linkBrewsInTx(ctx, tx, userID, sessionID, session.CoffeeID, brewIDs); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.GetByID(ctx, userID, sessionID)
}

func (r *PostgresRepository) UnlinkBrew(ctx context.Context, userID, sessionID, brewID uuid.UUID) error {
	// Verify session belongs to user
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM sessions WHERE id = $1 AND user_id = $2)`,
		sessionID, userID,
	).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return ErrSessionNotFound
	}

	_, err = r.db.ExecContext(ctx,
		`DELETE FROM session_brews WHERE session_id = $1 AND brew_id = $2`,
		sessionID, brewID,
	)
	return err
}

// linkBrewsInTx links brews to a session within a transaction,
// validating that all brews belong to the same coffee as the session.
func (r *PostgresRepository) linkBrewsInTx(ctx context.Context, tx *sql.Tx, userID, sessionID, coffeeID uuid.UUID, brewIDs []uuid.UUID) error {
	for _, bID := range brewIDs {
		// Verify brew exists, belongs to user, and matches coffee
		var brewCoffeeID uuid.UUID
		err := tx.QueryRowContext(ctx,
			`SELECT coffee_id FROM brews WHERE id = $1 AND user_id = $2`,
			bID, userID,
		).Scan(&brewCoffeeID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrBrewNotFound
			}
			return err
		}
		if brewCoffeeID != coffeeID {
			return ErrBrewWrongCoffee
		}

		// Insert with ON CONFLICT for idempotency
		_, err = tx.ExecContext(ctx,
			`INSERT INTO session_brews (session_id, brew_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			sessionID, bID,
		)
		if err != nil {
			return err
		}
	}
	return nil
}
