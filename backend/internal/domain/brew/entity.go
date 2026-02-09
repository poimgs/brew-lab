package brew

import (
	"math"
	"time"
)

type Brew struct {
	ID               string       `json:"id"`
	UserID           string       `json:"-"`
	CoffeeID         string       `json:"coffee_id"`
	CoffeeName       string       `json:"coffee_name"`
	CoffeeRoaster       string       `json:"coffee_roaster"`
	CoffeeTastingNotes  *string      `json:"coffee_tasting_notes"`
	BrewDate         string       `json:"brew_date"`
	DaysOffRoast     *int         `json:"days_off_roast"`
	CoffeeWeight     *float64     `json:"coffee_weight"`
	Ratio            *float64     `json:"ratio"`
	WaterWeight      *float64     `json:"water_weight"`
	GrindSize        *float64     `json:"grind_size"`
	WaterTemperature *float64     `json:"water_temperature"`
	FilterPaper      *FilterPaper `json:"filter_paper"`
	Pours            []Pour       `json:"pours"`
	TotalBrewTime    *int         `json:"total_brew_time"`
	TechniqueNotes   *string      `json:"technique_notes"`
	CoffeeMl         *float64     `json:"coffee_ml"`
	TDS              *float64     `json:"tds"`
	ExtractionYield  *float64     `json:"extraction_yield"`

	AromaIntensity      *int `json:"aroma_intensity"`
	BodyIntensity       *int `json:"body_intensity"`
	SweetnessIntensity  *int `json:"sweetness_intensity"`
	BrightnessIntensity *int `json:"brightness_intensity"`
	ComplexityIntensity *int `json:"complexity_intensity"`
	AftertasteIntensity *int `json:"aftertaste_intensity"`

	OverallScore     *int    `json:"overall_score"`
	OverallNotes     *string `json:"overall_notes"`
	ImprovementNotes *string `json:"improvement_notes"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type FilterPaper struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Brand *string `json:"brand"`
}

type Pour struct {
	PourNumber  int      `json:"pour_number"`
	WaterAmount *float64 `json:"water_amount"`
	PourStyle   *string  `json:"pour_style"`
	WaitTime    *int     `json:"wait_time"`
}

type CreateRequest struct {
	CoffeeID         string  `json:"coffee_id"`
	BrewDate         *string `json:"brew_date"`
	CoffeeWeight     *float64 `json:"coffee_weight"`
	Ratio            *float64 `json:"ratio"`
	GrindSize        *float64 `json:"grind_size"`
	WaterTemperature *float64 `json:"water_temperature"`
	FilterPaperID    *string  `json:"filter_paper_id"`
	Pours            []PourRequest `json:"pours"`
	TotalBrewTime    *int     `json:"total_brew_time"`
	TechniqueNotes   *string  `json:"technique_notes"`
	CoffeeMl         *float64 `json:"coffee_ml"`
	TDS              *float64 `json:"tds"`

	AromaIntensity      *int `json:"aroma_intensity"`
	BodyIntensity       *int `json:"body_intensity"`
	SweetnessIntensity  *int `json:"sweetness_intensity"`
	BrightnessIntensity *int `json:"brightness_intensity"`
	ComplexityIntensity *int `json:"complexity_intensity"`
	AftertasteIntensity *int `json:"aftertaste_intensity"`

	OverallScore     *int    `json:"overall_score"`
	OverallNotes     *string `json:"overall_notes"`
	ImprovementNotes *string `json:"improvement_notes"`
}

type UpdateRequest struct {
	CoffeeID         string  `json:"coffee_id"`
	BrewDate         *string `json:"brew_date"`
	CoffeeWeight     *float64 `json:"coffee_weight"`
	Ratio            *float64 `json:"ratio"`
	GrindSize        *float64 `json:"grind_size"`
	WaterTemperature *float64 `json:"water_temperature"`
	FilterPaperID    *string  `json:"filter_paper_id"`
	Pours            []PourRequest `json:"pours"`
	TotalBrewTime    *int     `json:"total_brew_time"`
	TechniqueNotes   *string  `json:"technique_notes"`
	CoffeeMl         *float64 `json:"coffee_ml"`
	TDS              *float64 `json:"tds"`

	AromaIntensity      *int `json:"aroma_intensity"`
	BodyIntensity       *int `json:"body_intensity"`
	SweetnessIntensity  *int `json:"sweetness_intensity"`
	BrightnessIntensity *int `json:"brightness_intensity"`
	ComplexityIntensity *int `json:"complexity_intensity"`
	AftertasteIntensity *int `json:"aftertaste_intensity"`

	OverallScore     *int    `json:"overall_score"`
	OverallNotes     *string `json:"overall_notes"`
	ImprovementNotes *string `json:"improvement_notes"`
}

type PourRequest struct {
	PourNumber  int      `json:"pour_number"`
	WaterAmount *float64 `json:"water_amount"`
	PourStyle   *string  `json:"pour_style"`
	WaitTime    *int     `json:"wait_time"`
}

// ComputeWaterWeight returns coffee_weight * ratio, or nil if either is missing.
func ComputeWaterWeight(coffeeWeight, ratio *float64) *float64 {
	if coffeeWeight == nil || ratio == nil {
		return nil
	}
	ww := *coffeeWeight * *ratio
	ww = math.Round(ww*100) / 100
	return &ww
}

// ComputeExtractionYield returns (coffee_ml * tds) / coffee_weight, or nil if any is missing.
func ComputeExtractionYield(coffeeMl, tds, coffeeWeight *float64) *float64 {
	if coffeeMl == nil || tds == nil || coffeeWeight == nil || *coffeeWeight == 0 {
		return nil
	}
	ey := (*coffeeMl * *tds) / *coffeeWeight
	ey = math.Round(ey*100) / 100
	return &ey
}

// ReferenceResponse wraps a brew with its source for the GET /coffees/:id/reference endpoint.
type ReferenceResponse struct {
	Brew   *Brew  `json:"brew"`
	Source string `json:"source"`
}
