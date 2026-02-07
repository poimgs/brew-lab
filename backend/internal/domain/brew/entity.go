package brew

import (
	"time"

	"github.com/google/uuid"
)

// Brew represents a single pour-over brewing session
type Brew struct {
	ID       uuid.UUID `json:"id"`
	UserID   uuid.UUID `json:"user_id"`
	CoffeeID uuid.UUID `json:"coffee_id"`
	BrewDate time.Time `json:"brew_date"`
	RoastDate *time.Time `json:"roast_date,omitempty"`

	// Pre-brew variables
	CoffeeWeight     *float64   `json:"coffee_weight,omitempty"`
	WaterWeight      *float64   `json:"water_weight,omitempty"`
	Ratio            *float64   `json:"ratio,omitempty"`
	GrindSize        *float64   `json:"grind_size,omitempty"`
	WaterTemperature *float64   `json:"water_temperature,omitempty"`
	FilterPaperID    *uuid.UUID `json:"filter_paper_id,omitempty"`

	// Brew variables
	BloomWater     *float64 `json:"bloom_water,omitempty"`
	BloomTime      *int     `json:"bloom_time,omitempty"`
	TotalBrewTime  *int     `json:"total_brew_time,omitempty"`
	DrawdownTime   *int     `json:"drawdown_time,omitempty"`
	TechniqueNotes *string  `json:"technique_notes,omitempty"`

	// Post-brew variables
	WaterBypassML    *int       `json:"water_bypass_ml,omitempty"`
	MineralProfileID *uuid.UUID `json:"mineral_profile_id,omitempty"`

	// Quantitative outcomes
	CoffeeMl        *float64 `json:"coffee_ml,omitempty"`
	TDS             *float64 `json:"tds,omitempty"`
	ExtractionYield *float64 `json:"extraction_yield,omitempty"`

	// Draft status
	IsDraft bool `json:"is_draft"`

	// Sensory outcomes (1-10 scale)
	AromaIntensity       *int    `json:"aroma_intensity,omitempty"`
	AromaNotes           *string `json:"aroma_notes,omitempty"`
	BodyIntensity        *int    `json:"body_intensity,omitempty"`
	BodyNotes            *string `json:"body_notes,omitempty"`
	FlavorIntensity      *int    `json:"flavor_intensity,omitempty"`
	FlavorNotes          *string `json:"flavor_notes,omitempty"`
	BrightnessIntensity  *int    `json:"brightness_intensity,omitempty"`
	BrightnessNotes      *string `json:"brightness_notes,omitempty"`
	SweetnessIntensity   *int    `json:"sweetness_intensity,omitempty"`
	SweetnessNotes       *string `json:"sweetness_notes,omitempty"`
	CleanlinessIntensity *int    `json:"cleanliness_intensity,omitempty"`
	CleanlinessNotes     *string `json:"cleanliness_notes,omitempty"`
	ComplexityIntensity  *int    `json:"complexity_intensity,omitempty"`
	ComplexityNotes      *string `json:"complexity_notes,omitempty"`
	BalanceIntensity     *int    `json:"balance_intensity,omitempty"`
	BalanceNotes         *string `json:"balance_notes,omitempty"`
	AftertasteIntensity  *int    `json:"aftertaste_intensity,omitempty"`
	AftertasteNotes      *string `json:"aftertaste_notes,omitempty"`

	// Overall assessment
	OverallScore     *int   `json:"overall_score,omitempty"`
	OverallNotes     string `json:"overall_notes"`
	ImprovementNotes *string `json:"improvement_notes,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Nested data (populated on read)
	Pours       []BrewPour `json:"pours,omitempty"`
	Coffee      *CoffeeSummary   `json:"coffee,omitempty"`
	FilterPaper *FilterPaperSummary `json:"filter_paper,omitempty"`

	// Computed properties (read-only, not stored in DB)
	DaysOffRoast    *int     `json:"days_off_roast,omitempty"`
	CalculatedRatio *float64 `json:"calculated_ratio,omitempty"`
}

// BrewPour represents a single pour in a brewing session
type BrewPour struct {
	ID           uuid.UUID `json:"id"`
	BrewID uuid.UUID `json:"brew_id"`
	PourNumber   int       `json:"pour_number"`
	WaterAmount  *float64  `json:"water_amount,omitempty"`
	PourStyle    *string   `json:"pour_style,omitempty"`
	Notes        *string   `json:"notes,omitempty"`
}

// CoffeeSummary is a minimal coffee representation for embedding in brew responses
type CoffeeSummary struct {
	ID        uuid.UUID  `json:"id"`
	Roaster   string     `json:"roaster"`
	Name      string     `json:"name"`
	RoastDate *time.Time `json:"roast_date,omitempty"`
}

// FilterPaperSummary is a minimal filter paper representation for embedding
type FilterPaperSummary struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Brand *string   `json:"brand,omitempty"`
}

// CreateBrewInput is the input for creating a new brew
type CreateBrewInput struct {
	CoffeeID  uuid.UUID  `json:"coffee_id"`
	BrewDate  *time.Time `json:"brew_date,omitempty"`
	RoastDate *time.Time `json:"roast_date,omitempty"`

	// Pre-brew variables
	CoffeeWeight     *float64   `json:"coffee_weight,omitempty"`
	WaterWeight      *float64   `json:"water_weight,omitempty"`
	Ratio            *float64   `json:"ratio,omitempty"`
	GrindSize        *float64   `json:"grind_size,omitempty"`
	WaterTemperature *float64   `json:"water_temperature,omitempty"`
	FilterPaperID    *uuid.UUID `json:"filter_paper_id,omitempty"`

	// Brew variables
	BloomWater     *float64         `json:"bloom_water,omitempty"`
	BloomTime      *int             `json:"bloom_time,omitempty"`
	Pours          []CreatePourInput `json:"pours,omitempty"`
	TotalBrewTime  *int             `json:"total_brew_time,omitempty"`
	DrawdownTime   *int             `json:"drawdown_time,omitempty"`
	TechniqueNotes *string          `json:"technique_notes,omitempty"`

	// Post-brew variables
	WaterBypassML    *int       `json:"water_bypass_ml,omitempty"`
	MineralProfileID *uuid.UUID `json:"mineral_profile_id,omitempty"`

	// Quantitative outcomes
	CoffeeMl        *float64 `json:"coffee_ml,omitempty"`
	TDS             *float64 `json:"tds,omitempty"`
	ExtractionYield *float64 `json:"extraction_yield,omitempty"`

	// Draft status
	IsDraft *bool `json:"is_draft,omitempty"`

	// Sensory outcomes
	AromaIntensity       *int    `json:"aroma_intensity,omitempty"`
	AromaNotes           *string `json:"aroma_notes,omitempty"`
	BodyIntensity        *int    `json:"body_intensity,omitempty"`
	BodyNotes            *string `json:"body_notes,omitempty"`
	FlavorIntensity      *int    `json:"flavor_intensity,omitempty"`
	FlavorNotes          *string `json:"flavor_notes,omitempty"`
	BrightnessIntensity  *int    `json:"brightness_intensity,omitempty"`
	BrightnessNotes      *string `json:"brightness_notes,omitempty"`
	SweetnessIntensity   *int    `json:"sweetness_intensity,omitempty"`
	SweetnessNotes       *string `json:"sweetness_notes,omitempty"`
	CleanlinessIntensity *int    `json:"cleanliness_intensity,omitempty"`
	CleanlinessNotes     *string `json:"cleanliness_notes,omitempty"`
	ComplexityIntensity  *int    `json:"complexity_intensity,omitempty"`
	ComplexityNotes      *string `json:"complexity_notes,omitempty"`
	BalanceIntensity     *int    `json:"balance_intensity,omitempty"`
	BalanceNotes         *string `json:"balance_notes,omitempty"`
	AftertasteIntensity  *int    `json:"aftertaste_intensity,omitempty"`
	AftertasteNotes      *string `json:"aftertaste_notes,omitempty"`

	// Overall assessment
	OverallScore     *int    `json:"overall_score,omitempty"`
	OverallNotes     string  `json:"overall_notes"`
	ImprovementNotes *string `json:"improvement_notes,omitempty"`
}

// CreatePourInput is the input for creating a pour within an brew
type CreatePourInput struct {
	PourNumber  int      `json:"pour_number"`
	WaterAmount *float64 `json:"water_amount,omitempty"`
	PourStyle   *string  `json:"pour_style,omitempty"`
	Notes       *string  `json:"notes,omitempty"`
}

// UpdateBrewInput is the input for updating an brew
type UpdateBrewInput struct {
	CoffeeID  *uuid.UUID `json:"coffee_id,omitempty"`
	BrewDate  *time.Time `json:"brew_date,omitempty"`
	RoastDate *time.Time `json:"roast_date,omitempty"`

	// Pre-brew variables
	CoffeeWeight     *float64   `json:"coffee_weight,omitempty"`
	WaterWeight      *float64   `json:"water_weight,omitempty"`
	Ratio            *float64   `json:"ratio,omitempty"`
	GrindSize        *float64   `json:"grind_size,omitempty"`
	WaterTemperature *float64   `json:"water_temperature,omitempty"`
	FilterPaperID    *uuid.UUID `json:"filter_paper_id,omitempty"`

	// Brew variables
	BloomWater     *float64          `json:"bloom_water,omitempty"`
	BloomTime      *int              `json:"bloom_time,omitempty"`
	Pours          *[]CreatePourInput `json:"pours,omitempty"`
	TotalBrewTime  *int              `json:"total_brew_time,omitempty"`
	DrawdownTime   *int              `json:"drawdown_time,omitempty"`
	TechniqueNotes *string           `json:"technique_notes,omitempty"`

	// Post-brew variables
	WaterBypassML    *int       `json:"water_bypass_ml,omitempty"`
	MineralProfileID *uuid.UUID `json:"mineral_profile_id,omitempty"`

	// Quantitative outcomes
	CoffeeMl        *float64 `json:"coffee_ml,omitempty"`
	TDS             *float64 `json:"tds,omitempty"`
	ExtractionYield *float64 `json:"extraction_yield,omitempty"`

	// Draft status
	IsDraft *bool `json:"is_draft,omitempty"`

	// Sensory outcomes
	AromaIntensity       *int    `json:"aroma_intensity,omitempty"`
	AromaNotes           *string `json:"aroma_notes,omitempty"`
	BodyIntensity        *int    `json:"body_intensity,omitempty"`
	BodyNotes            *string `json:"body_notes,omitempty"`
	FlavorIntensity      *int    `json:"flavor_intensity,omitempty"`
	FlavorNotes          *string `json:"flavor_notes,omitempty"`
	BrightnessIntensity  *int    `json:"brightness_intensity,omitempty"`
	BrightnessNotes      *string `json:"brightness_notes,omitempty"`
	SweetnessIntensity   *int    `json:"sweetness_intensity,omitempty"`
	SweetnessNotes       *string `json:"sweetness_notes,omitempty"`
	CleanlinessIntensity *int    `json:"cleanliness_intensity,omitempty"`
	CleanlinessNotes     *string `json:"cleanliness_notes,omitempty"`
	ComplexityIntensity  *int    `json:"complexity_intensity,omitempty"`
	ComplexityNotes      *string `json:"complexity_notes,omitempty"`
	BalanceIntensity     *int    `json:"balance_intensity,omitempty"`
	BalanceNotes         *string `json:"balance_notes,omitempty"`
	AftertasteIntensity  *int    `json:"aftertaste_intensity,omitempty"`
	AftertasteNotes      *string `json:"aftertaste_notes,omitempty"`

	// Overall assessment
	OverallScore     *int    `json:"overall_score,omitempty"`
	OverallNotes     *string `json:"overall_notes,omitempty"`
	ImprovementNotes *string `json:"improvement_notes,omitempty"`
}

// ListBrewsParams defines query parameters for listing brews
type ListBrewsParams struct {
	Page      int
	PerPage   int
	Sort      string
	CoffeeID  *uuid.UUID
	CoffeeIDs []uuid.UUID // Multiple coffee IDs for filter-based analysis
	ScoreGTE  *int
	ScoreLTE  *int
	HasTDS    bool
	DateFrom  *time.Time
	DateTo    *time.Time
}

// ListBrewsResult is the paginated result for listing brews
type ListBrewsResult struct {
	Items      []Brew `json:"items"`
	Pagination Pagination   `json:"pagination"`
}

// Pagination holds pagination metadata
type Pagination struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// SetDefaults sets default values for list parameters
func (p *ListBrewsParams) SetDefaults() {
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
		p.Sort = "-brew_date"
	}
}

// CompareRequest is the input for comparing brews
type CompareRequest struct {
	BrewIDs []uuid.UUID `json:"brew_ids"`
}

// CompareResponse contains compared brews with delta information
type CompareResponse struct {
	Brews []Brew          `json:"brews"`
	Deltas      map[string]*DeltaInfo `json:"deltas"`
}

// AnalyzeFilters defines filter parameters for filter-based analysis
type AnalyzeFilters struct {
	CoffeeIDs []uuid.UUID `json:"coffee_ids,omitempty"`
	DateFrom  *time.Time  `json:"date_from,omitempty"`
	DateTo    *time.Time  `json:"date_to,omitempty"`
	ScoreMin  *int        `json:"score_min,omitempty"`
	ScoreMax  *int        `json:"score_max,omitempty"`
}

// AnalyzeRequest is the input for analyzing correlations across brews
type AnalyzeRequest struct {
	BrewIDs []uuid.UUID     `json:"brew_ids,omitempty"`
	Filters       *AnalyzeFilters `json:"filters,omitempty"`
	MinSamples    int             `json:"min_samples"`
}

// AnalyzeResponse contains correlation analysis results
type AnalyzeResponse struct {
	Correlations    map[string]map[string]*CorrelationResult `json:"correlations"`
	Inputs          []string                                 `json:"inputs"`
	Outcomes        []string                                 `json:"outcomes"`
	BrewCount int                                      `json:"brew_count"`
	BrewIDs   []uuid.UUID                              `json:"brew_ids"`
	Insights        []Insight                                `json:"insights"`
	Warnings        []Warning                                `json:"warnings"`
}

// AnalyzeDetailRequest is the input for drilling down into a specific correlation
type AnalyzeDetailRequest struct {
	BrewIDs   []uuid.UUID `json:"brew_ids"`
	InputVariable   string      `json:"input_variable"`
	OutcomeVariable string      `json:"outcome_variable"`
}

// AnalyzeDetailResponse contains detailed correlation information with scatter data
type AnalyzeDetailResponse struct {
	InputVariable   string             `json:"input_variable"`
	OutcomeVariable string             `json:"outcome_variable"`
	Correlation     *CorrelationResult `json:"correlation"`
	ScatterData     []ScatterPoint     `json:"scatter_data"`
	Insight         string             `json:"insight"`
	Brews     []BrewPoint  `json:"brews"`
}

// BrewPoint represents an brew in the scatter plot with context
type BrewPoint struct {
	ID           uuid.UUID  `json:"id"`
	BrewDate     time.Time  `json:"brew_date"`
	CoffeeName   string     `json:"coffee_name"`
	InputValue   *float64   `json:"input_value"`
	OutcomeValue *float64   `json:"outcome_value"`
}

// CalculateComputedFields calculates derived fields for an brew
func (e *Brew) CalculateComputedFields() {
	// Calculate days off roast: prefer brew's roast_date, fallback to coffee's
	var roastDate *time.Time
	if e.RoastDate != nil {
		roastDate = e.RoastDate
	} else if e.Coffee != nil && e.Coffee.RoastDate != nil {
		roastDate = e.Coffee.RoastDate
	}
	if roastDate != nil {
		days := int(e.BrewDate.Sub(*roastDate).Hours() / 24)
		e.DaysOffRoast = &days
	}

	// Calculate ratio from water_weight / coffee_weight
	if e.WaterWeight != nil && e.CoffeeWeight != nil && *e.CoffeeWeight > 0 {
		ratio := *e.WaterWeight / *e.CoffeeWeight
		e.CalculatedRatio = &ratio
	}
}

// ValidateIntensity checks if an intensity value is within 1-10 range
func ValidateIntensity(value *int, fieldName string) error {
	if value != nil && (*value < 1 || *value > 10) {
		return &ValidationError{Field: fieldName, Message: "must be between 1 and 10"}
	}
	return nil
}

// ValidationError represents a field validation error
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Field + ": " + e.Message
}
