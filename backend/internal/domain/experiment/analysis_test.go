package experiment

import (
	"math"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestPearsonCorrelation(t *testing.T) {
	tests := []struct {
		name           string
		x              []float64
		y              []float64
		wantR          float64
		wantN          int
		wantPLessThan  float64
		tolerance      float64
	}{
		{
			name:          "perfect positive correlation",
			x:             []float64{1, 2, 3, 4, 5},
			y:             []float64{2, 4, 6, 8, 10},
			wantR:         1.0,
			wantN:         5,
			wantPLessThan: 0.01,
			tolerance:     0.001,
		},
		{
			name:          "perfect negative correlation",
			x:             []float64{1, 2, 3, 4, 5},
			y:             []float64{10, 8, 6, 4, 2},
			wantR:         -1.0,
			wantN:         5,
			wantPLessThan: 0.01,
			tolerance:     0.001,
		},
		{
			name:          "no correlation - constant y",
			x:             []float64{1, 2, 3, 4, 5},
			y:             []float64{5, 5, 5, 5, 5},
			wantR:         0.0,
			wantN:         5,
			wantPLessThan: 2.0, // p-value should be 1.0 when no correlation
			tolerance:     0.001,
		},
		{
			name:          "moderate positive correlation",
			x:             []float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10},
			y:             []float64{2, 3, 5, 4, 7, 8, 6, 9, 11, 10},
			wantR:         0.9, // approximately
			wantN:         10,
			wantPLessThan: 0.01,
			tolerance:     0.1, // less strict tolerance for approximate values
		},
		{
			name:          "insufficient data - single point",
			x:             []float64{1},
			y:             []float64{2},
			wantR:         0.0,
			wantN:         0, // implementation returns 0 for n < 2
			wantPLessThan: 2.0, // don't check p
			tolerance:     0.001,
		},
		{
			name:          "empty slices",
			x:             []float64{},
			y:             []float64{},
			wantR:         0.0,
			wantN:         0,
			wantPLessThan: 2.0, // don't check p
			tolerance:     0.001,
		},
		{
			name:          "mismatched lengths",
			x:             []float64{1, 2, 3},
			y:             []float64{1, 2},
			wantR:         0.0,
			wantN:         0,
			wantPLessThan: 2.0, // don't check p
			tolerance:     0.001,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, n, p := PearsonCorrelation(tt.x, tt.y)

			if n != tt.wantN {
				t.Errorf("PearsonCorrelation() n = %d, want %d", n, tt.wantN)
			}

			if math.Abs(r-tt.wantR) > tt.tolerance {
				t.Errorf("PearsonCorrelation() r = %f, want %f (tolerance %f)", r, tt.wantR, tt.tolerance)
			}

			if tt.wantPLessThan < 2.0 && p >= tt.wantPLessThan {
				t.Errorf("PearsonCorrelation() p = %f, want < %f", p, tt.wantPLessThan)
			}
		})
	}
}

func TestInterpretCorrelation(t *testing.T) {
	tests := []struct {
		r    float64
		want string
	}{
		{0.85, "strong_positive"},
		{0.75, "strong_positive"},
		{0.70, "strong_positive"},
		{0.55, "moderate_positive"},
		{0.45, "moderate_positive"},
		{0.40, "moderate_positive"},
		{0.25, "weak_positive"},
		{0.15, "weak_positive"},
		{0.10, "weak_positive"},
		{0.05, "none"},
		{0.0, "none"},
		{-0.05, "none"},
		{-0.15, "weak_negative"},
		{-0.25, "weak_negative"},
		{-0.45, "moderate_negative"},
		{-0.55, "moderate_negative"},
		{-0.75, "strong_negative"},
		{-0.85, "strong_negative"},
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			got := InterpretCorrelation(tt.r)
			if got != tt.want {
				t.Errorf("InterpretCorrelation(%f) = %s, want %s", tt.r, got, tt.want)
			}
		})
	}
}

func TestCalculateTrend(t *testing.T) {
	tests := []struct {
		name   string
		values []float64
		want   string
	}{
		{"empty", []float64{}, "stable"},
		{"single value", []float64{5}, "stable"},
		{"all same", []float64{5, 5, 5, 5}, "stable"},
		{"increasing", []float64{1, 2, 3, 4, 5}, "increasing"},
		{"decreasing", []float64{5, 4, 3, 2, 1}, "decreasing"},
		{"variable up down", []float64{1, 3, 2, 4, 3}, "variable"},
		{"mostly increasing", []float64{1, 2, 1.5, 3, 4}, "variable"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateTrend(tt.values)
			if got != tt.want {
				t.Errorf("CalculateTrend(%v) = %s, want %s", tt.values, got, tt.want)
			}
		})
	}
}

func TestCalculateDelta(t *testing.T) {
	tests := []struct {
		name       string
		values     []float64
		wantNil    bool
		wantMin    float64
		wantMax    float64
		wantTrend  string
	}{
		{
			name:    "empty returns nil",
			values:  []float64{},
			wantNil: true,
		},
		{
			name:      "single value",
			values:    []float64{5.0},
			wantMin:   5.0,
			wantMax:   5.0,
			wantTrend: "stable",
		},
		{
			name:      "increasing values",
			values:    []float64{1, 2, 3, 4, 5},
			wantMin:   1.0,
			wantMax:   5.0,
			wantTrend: "increasing",
		},
		{
			name:      "decreasing values",
			values:    []float64{5, 4, 3, 2, 1},
			wantMin:   1.0,
			wantMax:   5.0,
			wantTrend: "decreasing",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateDelta(tt.values)

			if tt.wantNil {
				if got != nil {
					t.Errorf("CalculateDelta(%v) = %v, want nil", tt.values, got)
				}
				return
			}

			if got == nil {
				t.Fatalf("CalculateDelta(%v) = nil, want non-nil", tt.values)
			}

			if got.Min == nil || *got.Min != tt.wantMin {
				t.Errorf("CalculateDelta(%v).Min = %v, want %v", tt.values, got.Min, tt.wantMin)
			}
			if got.Max == nil || *got.Max != tt.wantMax {
				t.Errorf("CalculateDelta(%v).Max = %v, want %v", tt.values, got.Max, tt.wantMax)
			}
			if got.Trend != tt.wantTrend {
				t.Errorf("CalculateDelta(%v).Trend = %s, want %s", tt.values, got.Trend, tt.wantTrend)
			}
		})
	}
}

func TestExtractInputValue(t *testing.T) {
	coffeeWeight := 15.0
	waterTemp := 92.0
	bloomTime := 45
	daysOff := 7

	exp := &Experiment{
		CoffeeWeight:     &coffeeWeight,
		WaterTemperature: &waterTemp,
		BloomTime:        &bloomTime,
		DaysOffRoast:     &daysOff,
	}

	tests := []struct {
		variable string
		want     *float64
	}{
		{"coffee_weight", &coffeeWeight},
		{"water_temperature", &waterTemp},
		{"bloom_time", ptr(45.0)},
		{"days_off_roast", ptr(7.0)},
		{"unknown_field", nil},
	}

	for _, tt := range tests {
		t.Run(tt.variable, func(t *testing.T) {
			got := ExtractInputValue(exp, tt.variable)

			if tt.want == nil {
				if got != nil {
					t.Errorf("ExtractInputValue(exp, %s) = %v, want nil", tt.variable, *got)
				}
				return
			}

			if got == nil {
				t.Errorf("ExtractInputValue(exp, %s) = nil, want %v", tt.variable, *tt.want)
				return
			}

			if *got != *tt.want {
				t.Errorf("ExtractInputValue(exp, %s) = %v, want %v", tt.variable, *got, *tt.want)
			}
		})
	}
}

func TestExtractOutcomeValue(t *testing.T) {
	overallScore := 8
	brightness := 7
	tds := 1.65

	exp := &Experiment{
		OverallScore:        &overallScore,
		BrightnessIntensity: &brightness,
		TDS:                 &tds,
	}

	tests := []struct {
		variable string
		want     *float64
	}{
		{"overall_score", ptr(8.0)},
		{"brightness_intensity", ptr(7.0)},
		{"tds", &tds},
		{"unknown_field", nil},
	}

	for _, tt := range tests {
		t.Run(tt.variable, func(t *testing.T) {
			got := ExtractOutcomeValue(exp, tt.variable)

			if tt.want == nil {
				if got != nil {
					t.Errorf("ExtractOutcomeValue(exp, %s) = %v, want nil", tt.variable, *got)
				}
				return
			}

			if got == nil {
				t.Errorf("ExtractOutcomeValue(exp, %s) = nil, want %v", tt.variable, *tt.want)
				return
			}

			if *got != *tt.want {
				t.Errorf("ExtractOutcomeValue(exp, %s) = %v, want %v", tt.variable, *got, *tt.want)
			}
		})
	}
}

func TestCalculateCorrelations(t *testing.T) {
	// Create test experiments with known correlation patterns
	experiments := make([]Experiment, 10)
	for i := 0; i < 10; i++ {
		temp := 85.0 + float64(i)       // 85 to 94
		brightness := 4 + i             // 4 to 13 (perfect positive correlation)
		coffeeWeight := 15.0            // constant
		overallScore := 5               // constant

		roastDate := time.Now().AddDate(0, 0, -i-5)
		experiments[i] = Experiment{
			ID:                  uuid.New(),
			WaterTemperature:    &temp,
			BrightnessIntensity: &brightness,
			CoffeeWeight:        &coffeeWeight,
			OverallScore:        &overallScore,
			Coffee: &CoffeeSummary{
				RoastDate: &roastDate,
			},
			BrewDate: time.Now(),
		}
	}

	correlations, warnings := CalculateCorrelations(experiments, 5)

	// Check that correlations were calculated
	if correlations == nil {
		t.Fatal("CalculateCorrelations returned nil correlations")
	}

	// Check water_temperature -> brightness_intensity correlation
	tempCorrs, ok := correlations["water_temperature"]
	if !ok {
		t.Error("Missing water_temperature correlations")
	} else {
		brightnessCorr, ok := tempCorrs["brightness_intensity"]
		if !ok {
			t.Error("Missing water_temperature -> brightness_intensity correlation")
		} else {
			// Should be perfect positive correlation
			if brightnessCorr.R < 0.99 {
				t.Errorf("water_temperature -> brightness_intensity r = %f, want ~1.0", brightnessCorr.R)
			}
			if brightnessCorr.N != 10 {
				t.Errorf("water_temperature -> brightness_intensity n = %d, want 10", brightnessCorr.N)
			}
		}
	}

	// Warnings should be empty or contain only expected warnings
	for _, w := range warnings {
		t.Logf("Warning: %s - %s (n=%d)", w.Type, w.Message, w.N)
	}
}

func TestGenerateInsights(t *testing.T) {
	correlations := map[string]map[string]*CorrelationResult{
		"water_temperature": {
			"brightness_intensity": {R: 0.75, N: 10, P: 0.001, Interpretation: "strong_positive"},
			"overall_score":        {R: 0.35, N: 10, P: 0.05, Interpretation: "weak_positive"},
		},
		"coffee_weight": {
			"body_intensity": {R: 0.55, N: 8, P: 0.02, Interpretation: "moderate_positive"},
		},
	}

	insights := GenerateInsights(correlations)

	if len(insights) == 0 {
		t.Error("GenerateInsights returned no insights")
	}

	// The strongest correlation (0.75) should be included
	foundStrong := false
	for _, insight := range insights {
		if insight.R == 0.75 {
			foundStrong = true
			if insight.Type != "strong_correlation" {
				t.Errorf("Expected type 'strong_correlation', got %s", insight.Type)
			}
			if insight.Input != "water_temperature" {
				t.Errorf("Expected input 'water_temperature', got %s", insight.Input)
			}
			if insight.Outcome != "brightness_intensity" {
				t.Errorf("Expected outcome 'brightness_intensity', got %s", insight.Outcome)
			}
		}
	}

	if !foundStrong {
		t.Error("GenerateInsights did not include the strongest correlation")
	}
}

func TestInputVariables(t *testing.T) {
	inputs := InputVariables()

	expected := []string{
		"coffee_weight",
		"water_weight",
		"water_temperature",
		"grind_size",
		"bloom_time",
		"total_brew_time",
		"days_off_roast",
	}

	if len(inputs) != len(expected) {
		t.Errorf("InputVariables() returned %d items, want %d", len(inputs), len(expected))
	}

	for i, v := range expected {
		if i >= len(inputs) || inputs[i] != v {
			t.Errorf("InputVariables()[%d] = %s, want %s", i, inputs[i], v)
		}
	}
}

func TestOutcomeVariables(t *testing.T) {
	outcomes := OutcomeVariables()

	expected := []string{
		"overall_score",
		"aroma_intensity",
		"body_intensity",
		"flavor_intensity",
		"brightness_intensity",
		"sweetness_intensity",
		"cleanliness_intensity",
		"complexity_intensity",
		"balance_intensity",
		"aftertaste_intensity",
		"tds",
		"extraction_yield",
	}

	if len(outcomes) != len(expected) {
		t.Errorf("OutcomeVariables() returned %d items, want %d", len(outcomes), len(expected))
	}

	for i, v := range expected {
		if i >= len(outcomes) || outcomes[i] != v {
			t.Errorf("OutcomeVariables()[%d] = %s, want %s", i, outcomes[i], v)
		}
	}
}

func ptr(f float64) *float64 {
	return &f
}
