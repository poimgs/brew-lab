package coffee

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// DateOnly represents a date without time, serialized as "YYYY-MM-DD" in JSON.
// It accepts both "YYYY-MM-DD" and RFC3339 formats when unmarshaling.
type DateOnly struct {
	time.Time
}

const dateOnlyFormat = "2006-01-02"

// NewDateOnly creates a DateOnly from a time.Time.
func NewDateOnly(t time.Time) DateOnly {
	return DateOnly{Time: t}
}

func (d DateOnly) MarshalJSON() ([]byte, error) {
	return json.Marshal(d.Time.Format(dateOnlyFormat))
}

func (d *DateOnly) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	if s == "" {
		return nil
	}
	t, err := time.Parse(dateOnlyFormat, s)
	if err != nil {
		t, err = time.Parse(time.RFC3339, s)
		if err != nil {
			return fmt.Errorf("invalid date format: %s (expected YYYY-MM-DD)", s)
		}
	}
	d.Time = t
	return nil
}

func (d *DateOnly) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		d.Time = v
		return nil
	default:
		return fmt.Errorf("cannot scan %T into DateOnly", value)
	}
}

func (d DateOnly) Value() (driver.Value, error) {
	return d.Time, nil
}

type Coffee struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	Roaster          string     `json:"roaster"`
	Name             string     `json:"name"`
	Country          *string    `json:"country,omitempty"`
	Farm             *string    `json:"farm,omitempty"`
	Process          *string    `json:"process,omitempty"`
	RoastLevel       *string    `json:"roast_level,omitempty"`
	TastingNotes     *string    `json:"tasting_notes,omitempty"`
	RoastDate        *DateOnly  `json:"roast_date,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
	BestExperimentID *uuid.UUID `json:"best_experiment_id,omitempty"`
	ArchivedAt       *time.Time `json:"archived_at,omitempty"`
	DeletedAt        *time.Time `json:"-"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`

	// Computed properties (read-only, not stored in DB)
	DaysOffRoast    *int       `json:"days_off_roast,omitempty"`
	ExperimentCount int        `json:"experiment_count"`
	LastBrewed      *time.Time `json:"last_brewed,omitempty"`

	// Enrichment fields for list responses
	BestExperiment  *BestExperimentSummary `json:"best_experiment,omitempty"`
	ImprovementNote *string                `json:"improvement_note,omitempty"`
}

// BestExperimentSummary is a compact summary of the best/latest experiment for coffee cards
type BestExperimentSummary struct {
	ID                 uuid.UUID `json:"id"`
	BrewDate           time.Time `json:"brew_date"`
	OverallScore       *int      `json:"overall_score,omitempty"`
	Ratio              *float64  `json:"ratio,omitempty"`
	WaterTemperature   *float64  `json:"water_temperature,omitempty"`
	FilterPaperName    *string   `json:"filter_paper_name,omitempty"`
	MineralProfileName *string   `json:"mineral_profile_name,omitempty"`
	BloomTime          *int      `json:"bloom_time,omitempty"`
	PourCount          int       `json:"pour_count"`
	PourStyles         []string  `json:"pour_styles"`
}

// SetBestExperimentInput is the input for setting the best experiment
type SetBestExperimentInput struct {
	ExperimentID *uuid.UUID `json:"experiment_id"`
}

// ReferenceExperiment is a summary of the best/latest experiment for reference
type ReferenceExperiment struct {
	ID               uuid.UUID  `json:"id"`
	BrewDate         time.Time  `json:"brew_date"`
	CoffeeWeight     *float64   `json:"coffee_weight,omitempty"`
	WaterWeight      *float64   `json:"water_weight,omitempty"`
	Ratio            *float64   `json:"ratio,omitempty"`
	GrindSize        *float64   `json:"grind_size,omitempty"`
	WaterTemperature *float64   `json:"water_temperature,omitempty"`
	FilterPaper      *FilterPaperSummary `json:"filter_paper,omitempty"`
	BloomWater       *float64   `json:"bloom_water,omitempty"`
	BloomTime        *int       `json:"bloom_time,omitempty"`
	TotalBrewTime    *int       `json:"total_brew_time,omitempty"`
	TDS              *float64   `json:"tds,omitempty"`
	ExtractionYield  *float64   `json:"extraction_yield,omitempty"`
	OverallScore     *int       `json:"overall_score,omitempty"`
	IsBest           bool       `json:"is_best"`
}

// FilterPaperSummary is a minimal filter paper representation
type FilterPaperSummary struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Brand *string   `json:"brand,omitempty"`
}

// CoffeeReference contains the reference data for the experiment form sidebar
type CoffeeReference struct {
	Experiment *ReferenceExperiment `json:"experiment,omitempty"`
	Goals      *CoffeeGoal          `json:"goals,omitempty"`
}

// CoffeeGoal represents target outcomes for a coffee
type CoffeeGoal struct {
	ID                  uuid.UUID  `json:"id"`
	CoffeeID            uuid.UUID  `json:"coffee_id"`
	UserID              uuid.UUID  `json:"user_id"`
	TDS                 *float64   `json:"tds,omitempty"`
	ExtractionYield     *float64   `json:"extraction_yield,omitempty"`
	AromaIntensity       *int       `json:"aroma_intensity,omitempty"`
	SweetnessIntensity   *int       `json:"sweetness_intensity,omitempty"`
	BodyIntensity        *int       `json:"body_intensity,omitempty"`
	FlavorIntensity      *int       `json:"flavor_intensity,omitempty"`
	BrightnessIntensity  *int       `json:"brightness_intensity,omitempty"`
	CleanlinessIntensity *int       `json:"cleanliness_intensity,omitempty"`
	ComplexityIntensity  *int       `json:"complexity_intensity,omitempty"`
	BalanceIntensity     *int       `json:"balance_intensity,omitempty"`
	AftertasteIntensity  *int       `json:"aftertaste_intensity,omitempty"`
	OverallScore        *int       `json:"overall_score,omitempty"`
	Notes               *string    `json:"notes,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type CreateCoffeeInput struct {
	Roaster      string    `json:"roaster"`
	Name         string    `json:"name"`
	Country      *string   `json:"country,omitempty"`
	Farm         *string   `json:"farm,omitempty"`
	Process      *string   `json:"process,omitempty"`
	RoastLevel   *string   `json:"roast_level,omitempty"`
	TastingNotes *string   `json:"tasting_notes,omitempty"`
	RoastDate    *DateOnly `json:"roast_date,omitempty"`
	Notes        *string   `json:"notes,omitempty"`
}

type UpdateCoffeeInput struct {
	Roaster      *string   `json:"roaster,omitempty"`
	Name         *string   `json:"name,omitempty"`
	Country      *string   `json:"country,omitempty"`
	Farm         *string   `json:"farm,omitempty"`
	Process      *string   `json:"process,omitempty"`
	RoastLevel   *string   `json:"roast_level,omitempty"`
	TastingNotes *string   `json:"tasting_notes,omitempty"`
	RoastDate    *DateOnly `json:"roast_date,omitempty"`
	Notes        *string   `json:"notes,omitempty"`
}

type ListCoffeesParams struct {
	Page            int
	PerPage         int
	Sort            string
	Roaster         string
	Country         string
	Process         string
	Search          string
	IncludeArchived bool
	IncludeDeleted  bool
}

type ListCoffeesResult struct {
	Items      []Coffee   `json:"items"`
	Pagination Pagination `json:"pagination"`
}

type Pagination struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

func (p *ListCoffeesParams) SetDefaults() {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 {
		p.PerPage = 20
	}
	if p.PerPage > 100 {
		p.PerPage = 100
	}
	if p.Sort == "" {
		p.Sort = "-created_at"
	}
}

// CalculateDaysOffRoast computes days since roast date
func (c *Coffee) CalculateDaysOffRoast() {
	if c.RoastDate == nil {
		c.DaysOffRoast = nil
		return
	}
	days := int(time.Since(c.RoastDate.Time).Hours() / 24)
	c.DaysOffRoast = &days
}
