package handler

import (
	"context"
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"coffee-tracker/internal/auth"
	"coffee-tracker/internal/response"

	"github.com/google/uuid"
)

// RecentExperiment represents an experiment in the dashboard response
type RecentExperiment struct {
	ID           uuid.UUID `json:"id"`
	BrewDate     time.Time `json:"brew_date"`
	CoffeeName   string    `json:"coffee_name"`
	OverallScore *int      `json:"overall_score"`
	Notes        string    `json:"notes"`
	RelativeDate string    `json:"relative_date"`
}

// DashboardResponse is the response for GET /api/v1/dashboard
type DashboardResponse struct {
	RecentExperiments []RecentExperiment `json:"recent_experiments"`
}

// DashboardHandler handles dashboard-related requests
type DashboardHandler struct {
	db *sql.DB
}

// NewDashboardHandler creates a new DashboardHandler
func NewDashboardHandler(db *sql.DB) *DashboardHandler {
	return &DashboardHandler{db: db}
}

// GetDashboard returns recent experiments for the home page
func (h *DashboardHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	// Parse limit parameter (default 10, max 20)
	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil {
			limit = parsed
		}
	}
	if limit < 1 {
		limit = 1
	}
	if limit > 20 {
		limit = 20
	}

	experiments, err := h.getRecentExperiments(r.Context(), userID, limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to fetch recent experiments")
		return
	}

	response.JSON(w, http.StatusOK, DashboardResponse{
		RecentExperiments: experiments,
	})
}

func (h *DashboardHandler) getRecentExperiments(ctx context.Context, userID uuid.UUID, limit int) ([]RecentExperiment, error) {
	query := `
		SELECT
			e.id,
			e.brew_date,
			c.name AS coffee_name,
			e.overall_score,
			e.overall_notes
		FROM experiments e
		JOIN coffees c ON e.coffee_id = c.id
		WHERE e.user_id = $1
		ORDER BY e.brew_date DESC
		LIMIT $2
	`

	rows, err := h.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	now := time.Now()
	var experiments []RecentExperiment

	for rows.Next() {
		var exp RecentExperiment
		var notes string

		err := rows.Scan(
			&exp.ID,
			&exp.BrewDate,
			&exp.CoffeeName,
			&exp.OverallScore,
			&notes,
		)
		if err != nil {
			return nil, err
		}

		// Truncate notes if needed (excerpt)
		exp.Notes = truncateNotes(notes, 100)

		// Calculate relative date
		exp.RelativeDate = calculateRelativeDate(exp.BrewDate, now)

		experiments = append(experiments, exp)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Return empty array instead of nil
	if experiments == nil {
		experiments = []RecentExperiment{}
	}

	return experiments, nil
}

// truncateNotes truncates notes to maxLen characters with ellipsis
func truncateNotes(notes string, maxLen int) string {
	if len(notes) <= maxLen {
		return notes
	}
	// Find last space before maxLen to avoid cutting words
	truncated := notes[:maxLen]
	lastSpace := len(truncated) - 1
	for i := len(truncated) - 1; i >= 0; i-- {
		if truncated[i] == ' ' {
			lastSpace = i
			break
		}
	}
	if lastSpace > 0 && lastSpace > maxLen-20 {
		return truncated[:lastSpace] + "..."
	}
	return truncated + "..."
}

// calculateRelativeDate returns "today", "yesterday", "this_week", or "earlier"
func calculateRelativeDate(brewDate, now time.Time) string {
	// Normalize to start of day in local time
	brewDay := time.Date(brewDate.Year(), brewDate.Month(), brewDate.Day(), 0, 0, 0, 0, brewDate.Location())
	nowDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	diff := nowDay.Sub(brewDay)
	daysDiff := int(diff.Hours() / 24)

	switch {
	case daysDiff == 0:
		return "today"
	case daysDiff == 1:
		return "yesterday"
	case daysDiff <= 7:
		return "this_week"
	default:
		return "earlier"
	}
}
