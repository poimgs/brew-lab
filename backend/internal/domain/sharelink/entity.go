package sharelink

import "time"

type ShareLink struct {
	Token     *string    `json:"token"`
	URL       *string    `json:"url"`
	CreatedAt *time.Time `json:"created_at"`
}

type ShareCoffee struct {
	Roaster       *string            `json:"roaster"`
	Name          string             `json:"name"`
	Country       *string            `json:"country"`
	Region        *string            `json:"region"`
	Process       *string            `json:"process"`
	RoastLevel    *string            `json:"roast_level"`
	TastingNotes  *string            `json:"tasting_notes"`
	RoastDate     *string            `json:"roast_date"`
	ReferenceBrew *ShareReferenceBrew `json:"reference_brew"`
}

type ShareReferenceBrew struct {
	OverallScore        *int `json:"overall_score"`
	AromaIntensity      *int `json:"aroma_intensity"`
	BodyIntensity       *int `json:"body_intensity"`
	SweetnessIntensity  *int `json:"sweetness_intensity"`
	BrightnessIntensity *int `json:"brightness_intensity"`
	ComplexityIntensity *int `json:"complexity_intensity"`
	AftertasteIntensity *int `json:"aftertaste_intensity"`
}
