package experiment

import (
	"math"
	"sort"
)

// CorrelationResult holds the result of a correlation calculation
type CorrelationResult struct {
	R              float64 `json:"r"`              // Pearson correlation coefficient
	N              int     `json:"n"`              // Sample size
	P              float64 `json:"p"`              // p-value for statistical significance
	Interpretation string  `json:"interpretation"` // Human-readable interpretation
}

// ScatterPoint represents a single data point for scatter plot visualization
type ScatterPoint struct {
	X            float64 `json:"x"`
	Y            float64 `json:"y"`
	ExperimentID string  `json:"experiment_id"`
}

// Insight represents an auto-generated insight from correlation analysis
type Insight struct {
	Type    string  `json:"type"`    // e.g., "strong_correlation"
	Input   string  `json:"input"`   // Input variable name
	Outcome string  `json:"outcome"` // Outcome variable name
	R       float64 `json:"r"`       // Correlation coefficient
	Message string  `json:"message"` // Human-readable message
}

// Warning represents a data quality warning
type Warning struct {
	Type    string `json:"type"`    // e.g., "insufficient_data"
	Field   string `json:"field"`   // Field with the issue
	N       int    `json:"n"`       // Sample count if relevant
	Message string `json:"message"` // Human-readable message
}

// DeltaInfo holds trend information for a compared field
type DeltaInfo struct {
	Min   *float64 `json:"min,omitempty"`
	Max   *float64 `json:"max,omitempty"`
	Trend string   `json:"trend"` // "increasing", "decreasing", "stable", "variable"
}

// PearsonCorrelation calculates the Pearson correlation coefficient between two slices of values.
// Returns r (correlation coefficient), n (sample size), and p-value.
// Values are paired by index; nil values in either slice exclude that pair.
func PearsonCorrelation(x, y []float64) (r float64, n int, pValue float64) {
	if len(x) != len(y) || len(x) < 2 {
		return 0, 0, 1.0
	}

	n = len(x)
	if n < 2 {
		return 0, n, 1.0
	}

	// Calculate means
	var sumX, sumY float64
	for i := 0; i < n; i++ {
		sumX += x[i]
		sumY += y[i]
	}
	meanX := sumX / float64(n)
	meanY := sumY / float64(n)

	// Calculate correlation
	var numerator, sumXX, sumYY float64
	for i := 0; i < n; i++ {
		dx := x[i] - meanX
		dy := y[i] - meanY
		numerator += dx * dy
		sumXX += dx * dx
		sumYY += dy * dy
	}

	if sumXX == 0 || sumYY == 0 {
		return 0, n, 1.0
	}

	r = numerator / math.Sqrt(sumXX*sumYY)

	// Calculate p-value using t-distribution approximation
	pValue = calculatePValue(r, n)

	return r, n, pValue
}

// calculatePValue calculates the two-tailed p-value for a correlation coefficient
// using the t-distribution approximation
func calculatePValue(r float64, n int) float64 {
	if n < 3 {
		return 1.0
	}

	// t = r * sqrt((n-2) / (1 - r^2))
	rSquared := r * r
	if rSquared >= 1.0 {
		return 0.0
	}

	df := float64(n - 2)
	t := math.Abs(r) * math.Sqrt(df/(1-rSquared))

	// Approximate p-value using the regularized incomplete beta function
	// For large degrees of freedom, we use an approximation
	p := tDistributionPValue(t, int(df))

	return p
}

// tDistributionPValue calculates the two-tailed p-value for a t-statistic
// using an approximation suitable for correlation analysis
func tDistributionPValue(t float64, df int) float64 {
	if df <= 0 {
		return 1.0
	}

	// Use approximation: for df > 30, t-distribution approaches normal
	// For smaller df, use a simple approximation based on the t-value
	x := float64(df) / (float64(df) + t*t)

	// Regularized incomplete beta function approximation
	// This is a simplified version; for production, consider using a stats library
	p := incompleteBeta(float64(df)/2.0, 0.5, x)

	return p
}

// incompleteBeta calculates the regularized incomplete beta function I_x(a, b)
// using a continued fraction approximation
func incompleteBeta(a, b, x float64) float64 {
	if x < 0 || x > 1 {
		return 0
	}
	if x == 0 {
		return 0
	}
	if x == 1 {
		return 1
	}

	// Use the continued fraction representation
	// This is a simplified approximation
	bt := math.Exp(lgamma(a+b) - lgamma(a) - lgamma(b) + a*math.Log(x) + b*math.Log(1-x))

	// Use continued fraction for better accuracy
	if x < (a+1)/(a+b+2) {
		return bt * betaCF(a, b, x) / a
	}
	return 1 - bt*betaCF(b, a, 1-x)/b
}

// lgamma returns the natural log of the gamma function
func lgamma(x float64) float64 {
	lg, _ := math.Lgamma(x)
	return lg
}

// betaCF evaluates the continued fraction for the incomplete beta function
func betaCF(a, b, x float64) float64 {
	const maxIterations = 100
	const epsilon = 3.0e-7

	qab := a + b
	qap := a + 1.0
	qam := a - 1.0
	c := 1.0
	d := 1.0 - qab*x/qap

	if math.Abs(d) < 1e-30 {
		d = 1e-30
	}
	d = 1.0 / d
	h := d

	for m := 1; m <= maxIterations; m++ {
		m2 := 2 * m
		aa := float64(m) * (b - float64(m)) * x / ((qam + float64(m2)) * (a + float64(m2)))
		d = 1.0 + aa*d
		if math.Abs(d) < 1e-30 {
			d = 1e-30
		}
		c = 1.0 + aa/c
		if math.Abs(c) < 1e-30 {
			c = 1e-30
		}
		d = 1.0 / d
		h *= d * c

		aa = -(a + float64(m)) * (qab + float64(m)) * x / ((a + float64(m2)) * (qap + float64(m2)))
		d = 1.0 + aa*d
		if math.Abs(d) < 1e-30 {
			d = 1e-30
		}
		c = 1.0 + aa/c
		if math.Abs(c) < 1e-30 {
			c = 1e-30
		}
		d = 1.0 / d
		del := d * c
		h *= del

		if math.Abs(del-1.0) < epsilon {
			break
		}
	}

	return h
}

// InterpretCorrelation returns a human-readable interpretation of a correlation coefficient
func InterpretCorrelation(r float64) string {
	absR := math.Abs(r)
	var strength string
	var direction string

	if r > 0 {
		direction = "positive"
	} else if r < 0 {
		direction = "negative"
	} else {
		return "none"
	}

	switch {
	case absR >= 0.7:
		strength = "strong"
	case absR >= 0.4:
		strength = "moderate"
	case absR >= 0.1:
		strength = "weak"
	default:
		return "none"
	}

	return strength + "_" + direction
}

// CalculateTrend determines the trend direction for a series of values
func CalculateTrend(values []float64) string {
	if len(values) == 0 {
		return "stable"
	}
	if len(values) == 1 {
		return "stable"
	}

	// Check if all values are the same
	allSame := true
	for i := 1; i < len(values); i++ {
		if values[i] != values[0] {
			allSame = false
			break
		}
	}
	if allSame {
		return "stable"
	}

	// Check for monotonic trends
	increasing := true
	decreasing := true
	for i := 1; i < len(values); i++ {
		if values[i] < values[i-1] {
			increasing = false
		}
		if values[i] > values[i-1] {
			decreasing = false
		}
	}

	if increasing {
		return "increasing"
	}
	if decreasing {
		return "decreasing"
	}
	return "variable"
}

// GenerateInsights generates auto-insights from correlation results
func GenerateInsights(correlations map[string]map[string]*CorrelationResult) []Insight {
	type correlationEntry struct {
		input   string
		outcome string
		result  *CorrelationResult
	}

	// Collect all correlations
	var entries []correlationEntry
	for input, outcomes := range correlations {
		for outcome, result := range outcomes {
			if result != nil && result.N >= 5 {
				entries = append(entries, correlationEntry{input, outcome, result})
			}
		}
	}

	// Sort by absolute correlation strength
	sort.Slice(entries, func(i, j int) bool {
		return math.Abs(entries[i].result.R) > math.Abs(entries[j].result.R)
	})

	// Take top 3 strongest correlations
	var insights []Insight
	for i := 0; i < len(entries) && i < 3; i++ {
		e := entries[i]
		absR := math.Abs(e.result.R)

		if absR < 0.3 {
			continue // Skip weak correlations
		}

		direction := "positively"
		if e.result.R < 0 {
			direction = "negatively"
		}

		var strength string
		if absR >= 0.7 {
			strength = "strongly"
		} else if absR >= 0.4 {
			strength = "moderately"
		} else {
			strength = "weakly"
		}

		inputLabel := formatVariableName(e.input)
		outcomeLabel := formatVariableName(e.outcome)

		insight := Insight{
			Type:    "strong_correlation",
			Input:   e.input,
			Outcome: e.outcome,
			R:       e.result.R,
			Message: inputLabel + " " + strength + " affects " + outcomeLabel + " (" + direction + ", r=" + formatFloat(e.result.R) + ") in these experiments.",
		}
		insights = append(insights, insight)
	}

	return insights
}

// formatVariableName converts snake_case to human-readable format
func formatVariableName(name string) string {
	labels := map[string]string{
		"coffee_weight":        "Dose",
		"water_weight":         "Water weight",
		"water_temperature":    "Temperature",
		"grind_size":           "Grind size",
		"bloom_time":           "Bloom time",
		"total_brew_time":      "Total brew time",
		"days_off_roast":       "Days off roast",
		"overall_score":        "Overall score",
		"acidity_intensity":    "Acidity",
		"sweetness_intensity":  "Sweetness",
		"bitterness_intensity": "Bitterness",
		"body_weight":          "Body",
		"aroma_intensity":      "Aroma",
		"tds":                  "TDS",
		"extraction_yield":     "Extraction yield",
	}

	if label, ok := labels[name]; ok {
		return label
	}
	return name
}

// formatFloat formats a float for display
func formatFloat(f float64) string {
	if f >= 0 {
		return "+" + formatFloatRaw(f)
	}
	return formatFloatRaw(f)
}

func formatFloatRaw(f float64) string {
	s := math.Round(f*100) / 100
	if s == float64(int(s)) {
		return string(rune('0' + int(s)))
	}
	// Simple formatting
	return floatToString(s)
}

func floatToString(f float64) string {
	// Simple conversion, returns e.g., "0.65" or "-0.35"
	sign := ""
	if f < 0 {
		sign = "-"
		f = -f
	}
	intPart := int(f)
	fracPart := int(math.Round((f - float64(intPart)) * 100))
	if fracPart == 0 {
		return sign + intToStr(intPart)
	}
	frac := intToStr(fracPart)
	if len(frac) == 1 {
		frac = "0" + frac
	}
	return sign + intToStr(intPart) + "." + frac
}

func intToStr(n int) string {
	if n == 0 {
		return "0"
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}

// InputVariables returns the list of input variable names for correlation analysis
func InputVariables() []string {
	return []string{
		"coffee_weight",
		"water_weight",
		"water_temperature",
		"grind_size",
		"bloom_time",
		"total_brew_time",
		"days_off_roast",
	}
}

// OutcomeVariables returns the list of outcome variable names for correlation analysis
func OutcomeVariables() []string {
	return []string{
		"overall_score",
		"acidity_intensity",
		"sweetness_intensity",
		"bitterness_intensity",
		"body_weight",
		"aroma_intensity",
		"tds",
		"extraction_yield",
	}
}

// ExtractInputValue extracts an input variable value from an experiment
func ExtractInputValue(exp *Experiment, variable string) *float64 {
	switch variable {
	case "coffee_weight":
		return exp.CoffeeWeight
	case "water_weight":
		return exp.WaterWeight
	case "water_temperature":
		return exp.WaterTemperature
	case "grind_size":
		return exp.GrindSize
	case "bloom_time":
		if exp.BloomTime != nil {
			v := float64(*exp.BloomTime)
			return &v
		}
	case "total_brew_time":
		if exp.TotalBrewTime != nil {
			v := float64(*exp.TotalBrewTime)
			return &v
		}
	case "days_off_roast":
		if exp.DaysOffRoast != nil {
			v := float64(*exp.DaysOffRoast)
			return &v
		}
	}
	return nil
}

// ExtractOutcomeValue extracts an outcome variable value from an experiment
func ExtractOutcomeValue(exp *Experiment, variable string) *float64 {
	switch variable {
	case "overall_score":
		if exp.OverallScore != nil {
			v := float64(*exp.OverallScore)
			return &v
		}
	case "acidity_intensity":
		if exp.AcidityIntensity != nil {
			v := float64(*exp.AcidityIntensity)
			return &v
		}
	case "sweetness_intensity":
		if exp.SweetnessIntensity != nil {
			v := float64(*exp.SweetnessIntensity)
			return &v
		}
	case "bitterness_intensity":
		if exp.BitternessIntensity != nil {
			v := float64(*exp.BitternessIntensity)
			return &v
		}
	case "body_weight":
		if exp.BodyWeight != nil {
			v := float64(*exp.BodyWeight)
			return &v
		}
	case "aroma_intensity":
		if exp.AromaIntensity != nil {
			v := float64(*exp.AromaIntensity)
			return &v
		}
	case "tds":
		return exp.TDS
	case "extraction_yield":
		return exp.ExtractionYield
	}
	return nil
}

// CalculateCorrelations computes the correlation matrix for a set of experiments
func CalculateCorrelations(experiments []Experiment, minSamples int) (map[string]map[string]*CorrelationResult, []Warning) {
	inputVars := InputVariables()
	outcomeVars := OutcomeVariables()

	correlations := make(map[string]map[string]*CorrelationResult)
	var warnings []Warning
	warnedFields := make(map[string]bool)

	for _, inputVar := range inputVars {
		correlations[inputVar] = make(map[string]*CorrelationResult)

		for _, outcomeVar := range outcomeVars {
			// Collect paired values
			var xVals, yVals []float64
			for i := range experiments {
				exp := &experiments[i]
				exp.CalculateComputedFields() // Ensure days_off_roast is calculated

				xVal := ExtractInputValue(exp, inputVar)
				yVal := ExtractOutcomeValue(exp, outcomeVar)

				if xVal != nil && yVal != nil {
					xVals = append(xVals, *xVal)
					yVals = append(yVals, *yVal)
				}
			}

			if len(xVals) < minSamples {
				// Add warning for insufficient data
				if len(xVals) > 0 && len(xVals) < minSamples && !warnedFields[outcomeVar] {
					warnings = append(warnings, Warning{
						Type:    "insufficient_data",
						Field:   outcomeVar,
						N:       len(xVals),
						Message: "Only " + intToStr(len(xVals)) + " experiments have " + formatVariableName(outcomeVar) + " data",
					})
					warnedFields[outcomeVar] = true
				}
				continue
			}

			r, n, p := PearsonCorrelation(xVals, yVals)
			correlations[inputVar][outcomeVar] = &CorrelationResult{
				R:              r,
				N:              n,
				P:              p,
				Interpretation: InterpretCorrelation(r),
			}
		}
	}

	return correlations, warnings
}

// CalculateDelta computes delta information for a field across experiments
func CalculateDelta(values []float64) *DeltaInfo {
	if len(values) == 0 {
		return nil
	}

	min := values[0]
	max := values[0]
	for _, v := range values[1:] {
		if v < min {
			min = v
		}
		if v > max {
			max = v
		}
	}

	return &DeltaInfo{
		Min:   &min,
		Max:   &max,
		Trend: CalculateTrend(values),
	}
}
