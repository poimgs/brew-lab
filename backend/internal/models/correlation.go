package models

import "github.com/google/uuid"

// AnalyzeExperimentsInput is the input for analyzing correlations across 5+ experiments
type AnalyzeExperimentsInput struct {
	ExperimentIDs []uuid.UUID `json:"experiment_ids" validate:"required,min=5"`
	MinSamples    int         `json:"min_samples"`
}

// CorrelationResult contains the correlation coefficient and related statistics
type CorrelationResult struct {
	R float64 `json:"r"` // Pearson correlation coefficient
	N int     `json:"n"` // Number of samples
	P float64 `json:"p"` // P-value
}

// InsightType represents the type of insight
type InsightType string

const (
	InsightTypeStrongPositive   InsightType = "strong_positive"
	InsightTypeStrongNegative   InsightType = "strong_negative"
	InsightTypeModeratePositive InsightType = "moderate_positive"
	InsightTypeModerateNegative InsightType = "moderate_negative"
)

// Insight represents an automatically generated insight from correlation analysis
type Insight struct {
	Type    InsightType `json:"type"`
	Input   string      `json:"input"`
	Outcome string      `json:"outcome"`
	R       float64     `json:"r"`
	Message string      `json:"message"`
}

// WarningType represents the type of warning
type WarningType string

const (
	WarningTypeLowSamples      WarningType = "low_samples"
	WarningTypeMissingData     WarningType = "missing_data"
	WarningTypeInsufficientVar WarningType = "insufficient_variance"
)

// Warning represents a warning about the correlation analysis
type Warning struct {
	Type    WarningType `json:"type"`
	Field   string      `json:"field,omitempty"`
	N       int         `json:"n,omitempty"`
	Message string      `json:"message"`
}

// AnalyzeExperimentsResponse contains the correlation analysis results
type AnalyzeExperimentsResponse struct {
	Correlations    map[string]map[string]*CorrelationResult `json:"correlations"`
	Inputs          []string                                 `json:"inputs"`
	Outcomes        []string                                 `json:"outcomes"`
	ExperimentCount int                                      `json:"experiment_count"`
	Insights        []Insight                                `json:"insights"`
	Warnings        []Warning                                `json:"warnings"`
}

// AnalyzeDetailInput is the input for getting scatter plot data for a specific correlation
type AnalyzeDetailInput struct {
	ExperimentIDs   []uuid.UUID `json:"experiment_ids" validate:"required,min=5"`
	InputVariable   string      `json:"input_variable" validate:"required"`
	OutcomeVariable string      `json:"outcome_variable" validate:"required"`
}

// ScatterPoint represents a single point in the scatter plot
type ScatterPoint struct {
	X            float64   `json:"x"`
	Y            float64   `json:"y"`
	ExperimentID uuid.UUID `json:"experiment_id"`
}

// ScatterExperiment contains experiment metadata for the scatter view
type ScatterExperiment struct {
	ID           uuid.UUID `json:"id"`
	BrewDate     string    `json:"brew_date"`
	CoffeeName   string    `json:"coffee_name,omitempty"`
	InputValue   float64   `json:"input_value"`
	OutcomeValue float64   `json:"outcome_value"`
}

// CorrelationDetail contains the correlation and interpretation
type CorrelationDetail struct {
	R              float64 `json:"r"`
	N              int     `json:"n"`
	P              float64 `json:"p"`
	Interpretation string  `json:"interpretation"`
}

// AnalyzeDetailResponse contains the scatter plot data for a specific correlation
type AnalyzeDetailResponse struct {
	InputVariable   string              `json:"input_variable"`
	OutcomeVariable string              `json:"outcome_variable"`
	Correlation     *CorrelationDetail  `json:"correlation"`
	ScatterData     []ScatterPoint      `json:"scatter_data"`
	Insight         string              `json:"insight"`
	Experiments     []ScatterExperiment `json:"experiments"`
}
