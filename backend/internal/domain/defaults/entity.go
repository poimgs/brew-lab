package defaults

// DefaultsResponse is the API response for GET /defaults and PUT /defaults.
// Field values use the same JSON types as their corresponding brew fields.
type DefaultsResponse struct {
	CoffeeWeight     *float64       `json:"coffee_weight"`
	Ratio            *float64       `json:"ratio"`
	GrindSize        *float64       `json:"grind_size"`
	WaterTemperature *float64       `json:"water_temperature"`
	FilterPaperID    *string        `json:"filter_paper_id"`
	PourDefaults     []PourDefault  `json:"pour_defaults"`
}

// PourDefault represents a single pour template in user defaults.
type PourDefault struct {
	PourNumber  int      `json:"pour_number"`
	WaterAmount *float64 `json:"water_amount"`
	PourStyle   *string  `json:"pour_style"`
	WaitTime    *int     `json:"wait_time"`
}

// UpdateRequest is the request body for PUT /defaults.
type UpdateRequest struct {
	CoffeeWeight     *float64             `json:"coffee_weight"`
	Ratio            *float64             `json:"ratio"`
	GrindSize        *float64             `json:"grind_size"`
	WaterTemperature *float64             `json:"water_temperature"`
	FilterPaperID    *string              `json:"filter_paper_id"`
	PourDefaults     []PourDefaultRequest `json:"pour_defaults"`
}

// PourDefaultRequest is a single pour in the PUT /defaults request.
type PourDefaultRequest struct {
	PourNumber  int      `json:"pour_number"`
	WaterAmount *float64 `json:"water_amount"`
	PourStyle   *string  `json:"pour_style"`
	WaitTime    *int     `json:"wait_time"`
}

// validFieldNames lists the allowed field_name values in user_defaults.
var validFieldNames = map[string]bool{
	"coffee_weight":     true,
	"ratio":             true,
	"grind_size":        true,
	"water_temperature": true,
	"filter_paper_id":   true,
}

// IsValidFieldName checks if a field name is a valid default field.
func IsValidFieldName(name string) bool {
	return validFieldNames[name]
}
