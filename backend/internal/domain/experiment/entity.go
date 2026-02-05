package experiment

import (
	"time"

	"github.com/google/uuid"
)

// Experiment represents a single pour-over brewing session
type Experiment struct {
	ID       uuid.UUID `json:"id"`
	UserID   uuid.UUID `json:"user_id"`
	CoffeeID uuid.UUID `json:"coffee_id"`
	BrewDate time.Time `json:"brew_date"`

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
	ServingTemperature *string `json:"serving_temperature,omitempty"`
	WaterBypass        *string `json:"water_bypass,omitempty"`
	MineralAdditions   *string `json:"mineral_additions,omitempty"`

	// Quantitative outcomes
	FinalWeight     *float64 `json:"final_weight,omitempty"`
	TDS             *float64 `json:"tds,omitempty"`
	ExtractionYield *float64 `json:"extraction_yield,omitempty"`

	// Sensory outcomes (1-10 scale)
	AromaIntensity      *int    `json:"aroma_intensity,omitempty"`
	AromaNotes          *string `json:"aroma_notes,omitempty"`
	AcidityIntensity    *int    `json:"acidity_intensity,omitempty"`
	AcidityNotes        *string `json:"acidity_notes,omitempty"`
	SweetnessIntensity  *int    `json:"sweetness_intensity,omitempty"`
	SweetnessNotes      *string `json:"sweetness_notes,omitempty"`
	BitternessIntensity *int    `json:"bitterness_intensity,omitempty"`
	BitternessNotes     *string `json:"bitterness_notes,omitempty"`
	BodyWeight          *int    `json:"body_weight,omitempty"`
	BodyNotes           *string `json:"body_notes,omitempty"`
	FlavorIntensity     *int    `json:"flavor_intensity,omitempty"`
	FlavorNotes         *string `json:"flavor_notes,omitempty"`
	AftertasteDuration  *int    `json:"aftertaste_duration,omitempty"`
	AftertasteIntensity *int    `json:"aftertaste_intensity,omitempty"`
	AftertasteNotes     *string `json:"aftertaste_notes,omitempty"`

	// Overall assessment
	OverallScore     *int   `json:"overall_score,omitempty"`
	OverallNotes     string `json:"overall_notes"`
	ImprovementNotes *string `json:"improvement_notes,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Nested data (populated on read)
	Pours       []ExperimentPour `json:"pours,omitempty"`
	Coffee      *CoffeeSummary   `json:"coffee,omitempty"`
	FilterPaper *FilterPaperSummary `json:"filter_paper,omitempty"`

	// Computed properties (read-only, not stored in DB)
	DaysOffRoast    *int     `json:"days_off_roast,omitempty"`
	CalculatedRatio *float64 `json:"calculated_ratio,omitempty"`
}

// ExperimentPour represents a single pour in a brewing session
type ExperimentPour struct {
	ID           uuid.UUID `json:"id"`
	ExperimentID uuid.UUID `json:"experiment_id"`
	PourNumber   int       `json:"pour_number"`
	WaterAmount  *float64  `json:"water_amount,omitempty"`
	PourStyle    *string   `json:"pour_style,omitempty"`
	Notes        *string   `json:"notes,omitempty"`
}

// CoffeeSummary is a minimal coffee representation for embedding in experiment responses
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

// CreateExperimentInput is the input for creating a new experiment
type CreateExperimentInput struct {
	CoffeeID uuid.UUID `json:"coffee_id"`
	BrewDate *time.Time `json:"brew_date,omitempty"`

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
	ServingTemperature *string `json:"serving_temperature,omitempty"`
	WaterBypass        *string `json:"water_bypass,omitempty"`
	MineralAdditions   *string `json:"mineral_additions,omitempty"`

	// Quantitative outcomes
	FinalWeight     *float64 `json:"final_weight,omitempty"`
	TDS             *float64 `json:"tds,omitempty"`
	ExtractionYield *float64 `json:"extraction_yield,omitempty"`

	// Sensory outcomes
	AromaIntensity      *int    `json:"aroma_intensity,omitempty"`
	AromaNotes          *string `json:"aroma_notes,omitempty"`
	AcidityIntensity    *int    `json:"acidity_intensity,omitempty"`
	AcidityNotes        *string `json:"acidity_notes,omitempty"`
	SweetnessIntensity  *int    `json:"sweetness_intensity,omitempty"`
	SweetnessNotes      *string `json:"sweetness_notes,omitempty"`
	BitternessIntensity *int    `json:"bitterness_intensity,omitempty"`
	BitternessNotes     *string `json:"bitterness_notes,omitempty"`
	BodyWeight          *int    `json:"body_weight,omitempty"`
	BodyNotes           *string `json:"body_notes,omitempty"`
	FlavorIntensity     *int    `json:"flavor_intensity,omitempty"`
	FlavorNotes         *string `json:"flavor_notes,omitempty"`
	AftertasteDuration  *int    `json:"aftertaste_duration,omitempty"`
	AftertasteIntensity *int    `json:"aftertaste_intensity,omitempty"`
	AftertasteNotes     *string `json:"aftertaste_notes,omitempty"`

	// Overall assessment
	OverallScore     *int    `json:"overall_score,omitempty"`
	OverallNotes     string  `json:"overall_notes"`
	ImprovementNotes *string `json:"improvement_notes,omitempty"`
}

// CreatePourInput is the input for creating a pour within an experiment
type CreatePourInput struct {
	PourNumber  int      `json:"pour_number"`
	WaterAmount *float64 `json:"water_amount,omitempty"`
	PourStyle   *string  `json:"pour_style,omitempty"`
	Notes       *string  `json:"notes,omitempty"`
}

// UpdateExperimentInput is the input for updating an experiment
type UpdateExperimentInput struct {
	CoffeeID *uuid.UUID `json:"coffee_id,omitempty"`
	BrewDate *time.Time `json:"brew_date,omitempty"`

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
	ServingTemperature *string `json:"serving_temperature,omitempty"`
	WaterBypass        *string `json:"water_bypass,omitempty"`
	MineralAdditions   *string `json:"mineral_additions,omitempty"`

	// Quantitative outcomes
	FinalWeight     *float64 `json:"final_weight,omitempty"`
	TDS             *float64 `json:"tds,omitempty"`
	ExtractionYield *float64 `json:"extraction_yield,omitempty"`

	// Sensory outcomes
	AromaIntensity      *int    `json:"aroma_intensity,omitempty"`
	AromaNotes          *string `json:"aroma_notes,omitempty"`
	AcidityIntensity    *int    `json:"acidity_intensity,omitempty"`
	AcidityNotes        *string `json:"acidity_notes,omitempty"`
	SweetnessIntensity  *int    `json:"sweetness_intensity,omitempty"`
	SweetnessNotes      *string `json:"sweetness_notes,omitempty"`
	BitternessIntensity *int    `json:"bitterness_intensity,omitempty"`
	BitternessNotes     *string `json:"bitterness_notes,omitempty"`
	BodyWeight          *int    `json:"body_weight,omitempty"`
	BodyNotes           *string `json:"body_notes,omitempty"`
	FlavorIntensity     *int    `json:"flavor_intensity,omitempty"`
	FlavorNotes         *string `json:"flavor_notes,omitempty"`
	AftertasteDuration  *int    `json:"aftertaste_duration,omitempty"`
	AftertasteIntensity *int    `json:"aftertaste_intensity,omitempty"`
	AftertasteNotes     *string `json:"aftertaste_notes,omitempty"`

	// Overall assessment
	OverallScore     *int    `json:"overall_score,omitempty"`
	OverallNotes     *string `json:"overall_notes,omitempty"`
	ImprovementNotes *string `json:"improvement_notes,omitempty"`
}

// ListExperimentsParams defines query parameters for listing experiments
type ListExperimentsParams struct {
	Page     int
	PerPage  int
	Sort     string
	CoffeeID *uuid.UUID
	ScoreGTE *int
	ScoreLTE *int
	HasTDS   bool
	DateFrom *time.Time
	DateTo   *time.Time
}

// ListExperimentsResult is the paginated result for listing experiments
type ListExperimentsResult struct {
	Items      []Experiment `json:"items"`
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
func (p *ListExperimentsParams) SetDefaults() {
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

// CompareRequest is the input for comparing experiments
type CompareRequest struct {
	ExperimentIDs []uuid.UUID `json:"experiment_ids"`
}

// CompareResponse contains compared experiments with delta information
type CompareResponse struct {
	Experiments []Experiment          `json:"experiments"`
	Deltas      map[string]*DeltaInfo `json:"deltas"`
}

// AnalyzeRequest is the input for analyzing correlations across experiments
type AnalyzeRequest struct {
	ExperimentIDs []uuid.UUID `json:"experiment_ids"`
	MinSamples    int         `json:"min_samples"`
}

// AnalyzeResponse contains correlation analysis results
type AnalyzeResponse struct {
	Correlations    map[string]map[string]*CorrelationResult `json:"correlations"`
	Inputs          []string                                 `json:"inputs"`
	Outcomes        []string                                 `json:"outcomes"`
	ExperimentCount int                                      `json:"experiment_count"`
	Insights        []Insight                                `json:"insights"`
	Warnings        []Warning                                `json:"warnings"`
}

// AnalyzeDetailRequest is the input for drilling down into a specific correlation
type AnalyzeDetailRequest struct {
	ExperimentIDs   []uuid.UUID `json:"experiment_ids"`
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
	Experiments     []ExperimentPoint  `json:"experiments"`
}

// ExperimentPoint represents an experiment in the scatter plot with context
type ExperimentPoint struct {
	ID           uuid.UUID  `json:"id"`
	BrewDate     time.Time  `json:"brew_date"`
	CoffeeName   string     `json:"coffee_name"`
	InputValue   *float64   `json:"input_value"`
	OutcomeValue *float64   `json:"outcome_value"`
}

// CalculateComputedFields calculates derived fields for an experiment
func (e *Experiment) CalculateComputedFields() {
	// Calculate days off roast from coffee's roast date
	if e.Coffee != nil && e.Coffee.RoastDate != nil {
		days := int(e.BrewDate.Sub(*e.Coffee.RoastDate).Hours() / 24)
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
