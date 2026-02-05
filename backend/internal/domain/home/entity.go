package home

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// BestExperiment represents the best experiment for a coffee in the home response
type BestExperiment struct {
	ID               uuid.UUID `json:"id"`
	BrewDate         time.Time `json:"brew_date"`
	OverallScore     *int      `json:"overall_score,omitempty"`
	Ratio            *float64  `json:"ratio,omitempty"`
	WaterTemperature *float64  `json:"water_temperature,omitempty"`
	FilterPaperName  *string   `json:"filter_paper_name,omitempty"`
	MineralProfileName *string `json:"mineral_profile_name,omitempty"`
	BloomTime        *int      `json:"bloom_time,omitempty"`
	PourCount        int       `json:"pour_count"`
	PourStyles       []string  `json:"pour_styles"`
}

// RecentCoffee represents a recently brewed coffee in the home response
type RecentCoffee struct {
	ID              uuid.UUID       `json:"id"`
	Name            string          `json:"name"`
	Roaster         string          `json:"roaster"`
	LastBrewedAt    time.Time       `json:"last_brewed_at"`
	BestExperiment  *BestExperiment `json:"best_experiment,omitempty"`
	ImprovementNote *string         `json:"improvement_note,omitempty"`
}

// HomeResponse is the response for GET /api/v1/home
type HomeResponse struct {
	RecentCoffees []RecentCoffee `json:"recent_coffees"`
}

// deduplicatePourStyles returns unique pour styles while preserving order
func deduplicatePourStyles(styles []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0)
	for _, s := range styles {
		lower := strings.ToLower(s)
		if !seen[lower] {
			seen[lower] = true
			result = append(result, s)
		}
	}
	return result
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
