package models

import (
	"time"

	"github.com/google/uuid"
)

type Experiment struct {
	ID     uuid.UUID  `json:"id"`
	UserID uuid.UUID  `json:"user_id"`
	CoffeeID *uuid.UUID `json:"coffee_id,omitempty"`

	// Basic info
	BrewDate     time.Time `json:"brew_date"`
	OverallNotes string    `json:"overall_notes"`
	OverallScore *int      `json:"overall_score,omitempty"`

	// Pre-brew parameters
	CoffeeWeight     *float64   `json:"coffee_weight,omitempty"`
	WaterWeight      *float64   `json:"water_weight,omitempty"`
	Ratio            *float64   `json:"ratio,omitempty"`
	GrindSize        *string    `json:"grind_size,omitempty"`
	WaterTemperature *float64   `json:"water_temperature,omitempty"`
	FilterPaperID    *uuid.UUID `json:"filter_paper_id,omitempty"`

	// Brew parameters
	BloomWater     *float64 `json:"bloom_water,omitempty"`
	BloomTime      *int     `json:"bloom_time,omitempty"`
	Pour1          *string  `json:"pour_1,omitempty"`
	Pour2          *string  `json:"pour_2,omitempty"`
	Pour3          *string  `json:"pour_3,omitempty"`
	TotalBrewTime  *int     `json:"total_brew_time,omitempty"`
	DrawdownTime   *int     `json:"drawdown_time,omitempty"`
	TechniqueNotes *string  `json:"technique_notes,omitempty"`

	// Post-brew parameters
	ServingTemperature *float64 `json:"serving_temperature,omitempty"`
	WaterBypass        *float64 `json:"water_bypass,omitempty"`
	MineralAdditions   *string  `json:"mineral_additions,omitempty"`

	// Quantitative results
	FinalWeight     *float64 `json:"final_weight,omitempty"`
	TDS             *float64 `json:"tds,omitempty"`
	ExtractionYield *float64 `json:"extraction_yield,omitempty"`

	// Sensory scores (1-10)
	AromaIntensity      *int `json:"aroma_intensity,omitempty"`
	AcidityIntensity    *int `json:"acidity_intensity,omitempty"`
	SweetnessIntensity  *int `json:"sweetness_intensity,omitempty"`
	BitternessIntensity *int `json:"bitterness_intensity,omitempty"`
	BodyWeight          *int `json:"body_weight,omitempty"`
	AftertasteDuration  *int `json:"aftertaste_duration,omitempty"`
	AftertasteIntensity *int `json:"aftertaste_intensity,omitempty"`

	// Sensory notes
	AromaNotes      *string `json:"aroma_notes,omitempty"`
	FlavorNotes     *string `json:"flavor_notes,omitempty"`
	AftertasteNotes *string `json:"aftertaste_notes,omitempty"`

	// Meta
	ImprovementNotes *string   `json:"improvement_notes,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type ExperimentResponse struct {
	ID       uuid.UUID  `json:"id"`
	CoffeeID *uuid.UUID `json:"coffee_id,omitempty"`

	// Basic info
	BrewDate     time.Time `json:"brew_date"`
	OverallNotes string    `json:"overall_notes"`
	OverallScore *int      `json:"overall_score,omitempty"`

	// Pre-brew parameters
	CoffeeWeight     *float64   `json:"coffee_weight,omitempty"`
	WaterWeight      *float64   `json:"water_weight,omitempty"`
	Ratio            *float64   `json:"ratio,omitempty"`
	GrindSize        *string    `json:"grind_size,omitempty"`
	WaterTemperature *float64   `json:"water_temperature,omitempty"`
	FilterPaperID    *uuid.UUID `json:"filter_paper_id,omitempty"`

	// Brew parameters
	BloomWater     *float64 `json:"bloom_water,omitempty"`
	BloomTime      *int     `json:"bloom_time,omitempty"`
	Pour1          *string  `json:"pour_1,omitempty"`
	Pour2          *string  `json:"pour_2,omitempty"`
	Pour3          *string  `json:"pour_3,omitempty"`
	TotalBrewTime  *int     `json:"total_brew_time,omitempty"`
	DrawdownTime   *int     `json:"drawdown_time,omitempty"`
	TechniqueNotes *string  `json:"technique_notes,omitempty"`

	// Post-brew parameters
	ServingTemperature *float64 `json:"serving_temperature,omitempty"`
	WaterBypass        *float64 `json:"water_bypass,omitempty"`
	MineralAdditions   *string  `json:"mineral_additions,omitempty"`

	// Quantitative results
	FinalWeight     *float64 `json:"final_weight,omitempty"`
	TDS             *float64 `json:"tds,omitempty"`
	ExtractionYield *float64 `json:"extraction_yield,omitempty"`

	// Sensory scores (1-10)
	AromaIntensity      *int `json:"aroma_intensity,omitempty"`
	AcidityIntensity    *int `json:"acidity_intensity,omitempty"`
	SweetnessIntensity  *int `json:"sweetness_intensity,omitempty"`
	BitternessIntensity *int `json:"bitterness_intensity,omitempty"`
	BodyWeight          *int `json:"body_weight,omitempty"`
	AftertasteDuration  *int `json:"aftertaste_duration,omitempty"`
	AftertasteIntensity *int `json:"aftertaste_intensity,omitempty"`

	// Sensory notes
	AromaNotes      *string `json:"aroma_notes,omitempty"`
	FlavorNotes     *string `json:"flavor_notes,omitempty"`
	AftertasteNotes *string `json:"aftertaste_notes,omitempty"`

	// Meta
	ImprovementNotes *string   `json:"improvement_notes,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`

	// Computed fields
	DaysOffRoast    *int     `json:"days_off_roast,omitempty"`
	CalculatedRatio *float64 `json:"calculated_ratio,omitempty"`

	// Nested data
	Coffee      *CoffeeResponse      `json:"coffee,omitempty"`
	FilterPaper *FilterPaperResponse `json:"filter_paper,omitempty"`
	IssueTags   []IssueTagResponse   `json:"issue_tags"`
}

func (e *Experiment) ToResponse(coffee *CoffeeResponse, filterPaper *FilterPaperResponse, tags []IssueTagResponse, daysOffRoast *int) *ExperimentResponse {
	resp := &ExperimentResponse{
		ID:                  e.ID,
		CoffeeID:            e.CoffeeID,
		BrewDate:            e.BrewDate,
		OverallNotes:        e.OverallNotes,
		OverallScore:        e.OverallScore,
		CoffeeWeight:        e.CoffeeWeight,
		WaterWeight:         e.WaterWeight,
		Ratio:               e.Ratio,
		GrindSize:           e.GrindSize,
		WaterTemperature:    e.WaterTemperature,
		FilterPaperID:       e.FilterPaperID,
		BloomWater:          e.BloomWater,
		BloomTime:           e.BloomTime,
		Pour1:               e.Pour1,
		Pour2:               e.Pour2,
		Pour3:               e.Pour3,
		TotalBrewTime:       e.TotalBrewTime,
		DrawdownTime:        e.DrawdownTime,
		TechniqueNotes:      e.TechniqueNotes,
		ServingTemperature:  e.ServingTemperature,
		WaterBypass:         e.WaterBypass,
		MineralAdditions:    e.MineralAdditions,
		FinalWeight:         e.FinalWeight,
		TDS:                 e.TDS,
		ExtractionYield:     e.ExtractionYield,
		AromaIntensity:      e.AromaIntensity,
		AcidityIntensity:    e.AcidityIntensity,
		SweetnessIntensity:  e.SweetnessIntensity,
		BitternessIntensity: e.BitternessIntensity,
		BodyWeight:          e.BodyWeight,
		AftertasteDuration:  e.AftertasteDuration,
		AftertasteIntensity: e.AftertasteIntensity,
		AromaNotes:          e.AromaNotes,
		FlavorNotes:         e.FlavorNotes,
		AftertasteNotes:     e.AftertasteNotes,
		ImprovementNotes:    e.ImprovementNotes,
		CreatedAt:           e.CreatedAt,
		UpdatedAt:           e.UpdatedAt,
		DaysOffRoast:        daysOffRoast,
		Coffee:              coffee,
		FilterPaper:         filterPaper,
		IssueTags:           tags,
	}

	// Calculate ratio if both weights are present
	if e.CoffeeWeight != nil && e.WaterWeight != nil && *e.CoffeeWeight > 0 {
		ratio := *e.WaterWeight / *e.CoffeeWeight
		resp.CalculatedRatio = &ratio
	}

	return resp
}

type CreateExperimentInput struct {
	CoffeeID         *uuid.UUID `json:"coffee_id"`
	BrewDate         *time.Time `json:"brew_date"`
	OverallNotes     string     `json:"overall_notes" validate:"required,min=10"`
	OverallScore     *int       `json:"overall_score" validate:"omitempty,min=1,max=10"`
	CoffeeWeight     *float64   `json:"coffee_weight" validate:"omitempty,gt=0"`
	WaterWeight      *float64   `json:"water_weight" validate:"omitempty,gt=0"`
	Ratio            *float64   `json:"ratio" validate:"omitempty,gt=0"`
	GrindSize        *string    `json:"grind_size" validate:"omitempty,max=50"`
	WaterTemperature   *float64   `json:"water_temperature" validate:"omitempty,gt=0,lt=100"`
	FilterPaperID      *uuid.UUID `json:"filter_paper_id"`
	BloomWater         *float64   `json:"bloom_water" validate:"omitempty,gt=0"`
	BloomTime          *int       `json:"bloom_time" validate:"omitempty,gt=0"`
	Pour1              *string    `json:"pour_1" validate:"omitempty,max=100"`
	Pour2              *string    `json:"pour_2" validate:"omitempty,max=100"`
	Pour3              *string    `json:"pour_3" validate:"omitempty,max=100"`
	TotalBrewTime      *int       `json:"total_brew_time" validate:"omitempty,gt=0"`
	DrawdownTime       *int       `json:"drawdown_time" validate:"omitempty,gt=0"`
	TechniqueNotes     *string    `json:"technique_notes"`
	ServingTemperature *float64   `json:"serving_temperature" validate:"omitempty,gt=0"`
	WaterBypass        *float64   `json:"water_bypass" validate:"omitempty,gte=0"`
	MineralAdditions   *string    `json:"mineral_additions" validate:"omitempty,max=100"`
	FinalWeight        *float64   `json:"final_weight" validate:"omitempty,gt=0"`
	TDS                *float64   `json:"tds" validate:"omitempty,gt=0,lt=100"`
	ExtractionYield    *float64   `json:"extraction_yield" validate:"omitempty,gt=0,lt=100"`
	AromaIntensity     *int       `json:"aroma_intensity" validate:"omitempty,min=1,max=10"`
	AcidityIntensity   *int       `json:"acidity_intensity" validate:"omitempty,min=1,max=10"`
	SweetnessIntensity *int       `json:"sweetness_intensity" validate:"omitempty,min=1,max=10"`
	BitternessIntensity *int      `json:"bitterness_intensity" validate:"omitempty,min=1,max=10"`
	BodyWeight          *int      `json:"body_weight" validate:"omitempty,min=1,max=10"`
	AftertasteDuration  *int      `json:"aftertaste_duration" validate:"omitempty,min=1,max=10"`
	AftertasteIntensity *int      `json:"aftertaste_intensity" validate:"omitempty,min=1,max=10"`
	AromaNotes          *string   `json:"aroma_notes"`
	FlavorNotes         *string   `json:"flavor_notes"`
	AftertasteNotes     *string   `json:"aftertaste_notes"`
	ImprovementNotes    *string   `json:"improvement_notes"`
}

type UpdateExperimentInput struct {
	CoffeeID           *uuid.UUID `json:"coffee_id"`
	BrewDate           *time.Time `json:"brew_date"`
	OverallNotes       *string    `json:"overall_notes" validate:"omitempty,min=10"`
	OverallScore       *int       `json:"overall_score" validate:"omitempty,min=1,max=10"`
	CoffeeWeight       *float64   `json:"coffee_weight" validate:"omitempty,gt=0"`
	WaterWeight        *float64   `json:"water_weight" validate:"omitempty,gt=0"`
	Ratio              *float64   `json:"ratio" validate:"omitempty,gt=0"`
	GrindSize          *string    `json:"grind_size" validate:"omitempty,max=50"`
	WaterTemperature   *float64   `json:"water_temperature" validate:"omitempty,gt=0,lt=100"`
	FilterPaperID      *uuid.UUID `json:"filter_paper_id"`
	BloomWater         *float64   `json:"bloom_water" validate:"omitempty,gt=0"`
	BloomTime          *int       `json:"bloom_time" validate:"omitempty,gt=0"`
	Pour1              *string    `json:"pour_1" validate:"omitempty,max=100"`
	Pour2              *string    `json:"pour_2" validate:"omitempty,max=100"`
	Pour3              *string    `json:"pour_3" validate:"omitempty,max=100"`
	TotalBrewTime      *int       `json:"total_brew_time" validate:"omitempty,gt=0"`
	DrawdownTime       *int       `json:"drawdown_time" validate:"omitempty,gt=0"`
	TechniqueNotes     *string    `json:"technique_notes"`
	ServingTemperature *float64   `json:"serving_temperature" validate:"omitempty,gt=0"`
	WaterBypass        *float64   `json:"water_bypass" validate:"omitempty,gte=0"`
	MineralAdditions   *string    `json:"mineral_additions" validate:"omitempty,max=100"`
	FinalWeight        *float64   `json:"final_weight" validate:"omitempty,gt=0"`
	TDS                *float64   `json:"tds" validate:"omitempty,gt=0,lt=100"`
	ExtractionYield    *float64   `json:"extraction_yield" validate:"omitempty,gt=0,lt=100"`
	AromaIntensity     *int       `json:"aroma_intensity" validate:"omitempty,min=1,max=10"`
	AcidityIntensity   *int       `json:"acidity_intensity" validate:"omitempty,min=1,max=10"`
	SweetnessIntensity *int       `json:"sweetness_intensity" validate:"omitempty,min=1,max=10"`
	BitternessIntensity *int      `json:"bitterness_intensity" validate:"omitempty,min=1,max=10"`
	BodyWeight          *int      `json:"body_weight" validate:"omitempty,min=1,max=10"`
	AftertasteDuration  *int      `json:"aftertaste_duration" validate:"omitempty,min=1,max=10"`
	AftertasteIntensity *int      `json:"aftertaste_intensity" validate:"omitempty,min=1,max=10"`
	AromaNotes          *string   `json:"aroma_notes"`
	FlavorNotes         *string   `json:"flavor_notes"`
	AftertasteNotes     *string   `json:"aftertaste_notes"`
	ImprovementNotes    *string   `json:"improvement_notes"`
}

type ExperimentFilter struct {
	CoffeeID *uuid.UUID `json:"coffee_id"`
	ScoreGTE *int       `json:"score_gte"`
	ScoreLTE *int       `json:"score_lte"`
	Tags     []string   `json:"tags"`
	HasTDS   *bool      `json:"has_tds"`
	DateFrom *time.Time `json:"date_from"`
	DateTo   *time.Time `json:"date_to"`
}

type ExperimentListResponse struct {
	Experiments []ExperimentResponse `json:"experiments"`
	Total       int                  `json:"total"`
	Page        int                  `json:"page"`
	PerPage     int                  `json:"per_page"`
}
