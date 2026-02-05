package home

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type postgresRepository struct {
	db *sql.DB
}

// NewRepository creates a new PostgreSQL-backed home repository
func NewRepository(db *sql.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) GetRecentCoffees(ctx context.Context, userID uuid.UUID, limit int) ([]RecentCoffee, error) {
	// Get recently brewed coffees (coffees with experiments, ordered by last brew date)
	query := `
		WITH recent_coffees AS (
			SELECT DISTINCT ON (c.id)
				c.id,
				c.name,
				c.roaster,
				c.best_experiment_id,
				MAX(e.brew_date) OVER (PARTITION BY c.id) as last_brewed_at
			FROM coffees c
			JOIN experiments e ON e.coffee_id = c.id AND e.user_id = $1
			WHERE c.user_id = $1 AND c.deleted_at IS NULL
			ORDER BY c.id, e.brew_date DESC
		),
		ranked_coffees AS (
			SELECT *, ROW_NUMBER() OVER (ORDER BY last_brewed_at DESC) as rn
			FROM recent_coffees
		)
		SELECT id, name, roaster, best_experiment_id, last_brewed_at
		FROM ranked_coffees
		WHERE rn <= $2
		ORDER BY last_brewed_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var coffees []RecentCoffee
	coffeeMap := make(map[uuid.UUID]*RecentCoffee)

	for rows.Next() {
		var rc RecentCoffee
		var bestExpID *uuid.UUID

		err := rows.Scan(
			&rc.ID,
			&rc.Name,
			&rc.Roaster,
			&bestExpID,
			&rc.LastBrewedAt,
		)
		if err != nil {
			return nil, err
		}

		coffees = append(coffees, rc)
		coffeeMap[rc.ID] = &coffees[len(coffees)-1]
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(coffees) == 0 {
		return []RecentCoffee{}, nil
	}

	// Fetch best experiments for each coffee
	if err := r.populateBestExperiments(ctx, userID, coffeeMap); err != nil {
		return nil, err
	}

	// Fetch improvement notes from coffee_goals
	if err := r.populateImprovementNotes(ctx, userID, coffeeMap); err != nil {
		return nil, err
	}

	return coffees, nil
}

func (r *postgresRepository) populateBestExperiments(ctx context.Context, userID uuid.UUID, coffeeMap map[uuid.UUID]*RecentCoffee) error {
	if len(coffeeMap) == 0 {
		return nil
	}

	// Build coffee IDs list for query
	coffeeIDs := make([]uuid.UUID, 0, len(coffeeMap))
	for id := range coffeeMap {
		coffeeIDs = append(coffeeIDs, id)
	}

	// Get best experiment (or latest if no best set) for each coffee
	query := `
		WITH best_or_latest AS (
			SELECT DISTINCT ON (c.id)
				c.id as coffee_id,
				COALESCE(best.id, latest.id) as experiment_id,
				COALESCE(best.brew_date, latest.brew_date) as brew_date,
				COALESCE(best.overall_score, latest.overall_score) as overall_score,
				COALESCE(best.ratio, latest.ratio) as ratio,
				COALESCE(best.water_temperature, latest.water_temperature) as water_temperature,
				COALESCE(best.bloom_time, latest.bloom_time) as bloom_time,
				COALESCE(best.mineral_additions, latest.mineral_additions) as mineral_additions,
				COALESCE(best_fp.name, latest_fp.name) as filter_paper_name
			FROM coffees c
			LEFT JOIN experiments best ON best.id = c.best_experiment_id AND best.user_id = $1
			LEFT JOIN filter_papers best_fp ON best_fp.id = best.filter_paper_id
			LEFT JOIN LATERAL (
				SELECT e.*
				FROM experiments e
				WHERE e.coffee_id = c.id AND e.user_id = $1
				ORDER BY e.brew_date DESC
				LIMIT 1
			) latest ON c.best_experiment_id IS NULL
			LEFT JOIN filter_papers latest_fp ON latest_fp.id = latest.filter_paper_id
			WHERE c.id = ANY($2) AND c.user_id = $1
		)
		SELECT coffee_id, experiment_id, brew_date, overall_score, ratio, water_temperature, bloom_time, mineral_additions, filter_paper_name
		FROM best_or_latest
		WHERE experiment_id IS NOT NULL
	`

	rows, err := r.db.QueryContext(ctx, query, userID, pq.Array(coffeeIDs))
	if err != nil {
		return err
	}
	defer rows.Close()

	experimentIDs := make([]uuid.UUID, 0)
	experimentToCoffee := make(map[uuid.UUID]uuid.UUID)

	for rows.Next() {
		var coffeeID uuid.UUID
		var be BestExperiment
		var filterPaperName *string

		err := rows.Scan(
			&coffeeID,
			&be.ID,
			&be.BrewDate,
			&be.OverallScore,
			&be.Ratio,
			&be.WaterTemperature,
			&be.BloomTime,
			&be.MineralAdditions,
			&filterPaperName,
		)
		if err != nil {
			return err
		}

		be.FilterPaperName = filterPaperName
		be.PourStyles = []string{} // Will be populated below

		if coffee, ok := coffeeMap[coffeeID]; ok {
			coffee.BestExperiment = &be
			experimentIDs = append(experimentIDs, be.ID)
			experimentToCoffee[be.ID] = coffeeID
		}
	}

	if err := rows.Err(); err != nil {
		return err
	}

	// Fetch pour information for experiments
	if len(experimentIDs) > 0 {
		pourQuery := `
			SELECT experiment_id, pour_style
			FROM experiment_pours
			WHERE experiment_id = ANY($1)
			ORDER BY experiment_id, pour_number
		`

		pourRows, err := r.db.QueryContext(ctx, pourQuery, pq.Array(experimentIDs))
		if err != nil {
			return err
		}
		defer pourRows.Close()

		// Group pours by experiment
		poursByExp := make(map[uuid.UUID][]string)
		for pourRows.Next() {
			var expID uuid.UUID
			var pourStyle *string

			if err := pourRows.Scan(&expID, &pourStyle); err != nil {
				return err
			}

			if pourStyle != nil && *pourStyle != "" {
				poursByExp[expID] = append(poursByExp[expID], *pourStyle)
			} else {
				// Count pours even without style
				poursByExp[expID] = append(poursByExp[expID], "")
			}
		}

		if err := pourRows.Err(); err != nil {
			return err
		}

		// Assign pour data to experiments
		for expID, pours := range poursByExp {
			if coffeeID, ok := experimentToCoffee[expID]; ok {
				if coffee, ok := coffeeMap[coffeeID]; ok && coffee.BestExperiment != nil {
					coffee.BestExperiment.PourCount = len(pours)
					// Filter out empty pour styles
					styles := make([]string, 0)
					for _, s := range pours {
						if s != "" {
							styles = append(styles, s)
						}
					}
					coffee.BestExperiment.PourStyles = styles
				}
			}
		}
	}

	return nil
}

func (r *postgresRepository) populateImprovementNotes(ctx context.Context, userID uuid.UUID, coffeeMap map[uuid.UUID]*RecentCoffee) error {
	if len(coffeeMap) == 0 {
		return nil
	}

	coffeeIDs := make([]uuid.UUID, 0, len(coffeeMap))
	for id := range coffeeMap {
		coffeeIDs = append(coffeeIDs, id)
	}

	query := `
		SELECT coffee_id, notes
		FROM coffee_goals
		WHERE coffee_id = ANY($1) AND user_id = $2 AND notes IS NOT NULL AND notes != ''
	`

	rows, err := r.db.QueryContext(ctx, query, pq.Array(coffeeIDs), userID)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var coffeeID uuid.UUID
		var notes string

		if err := rows.Scan(&coffeeID, &notes); err != nil {
			return err
		}

		if coffee, ok := coffeeMap[coffeeID]; ok {
			truncated := truncateNotes(notes, 100)
			coffee.ImprovementNote = &truncated
		}
	}

	return rows.Err()
}
