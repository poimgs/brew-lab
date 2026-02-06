package experiment

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"coffee-tracker/internal/auth"
	"coffee-tracker/internal/response"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Handler struct {
	repo Repository
}

func NewHandler(repo Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	params := ListExperimentsParams{
		Page:    parseIntOrDefault(r.URL.Query().Get("page"), 1),
		PerPage: parseIntOrDefault(r.URL.Query().Get("per_page"), 20),
		Sort:    r.URL.Query().Get("sort"),
		HasTDS:  r.URL.Query().Get("has_tds") == "true",
	}

	if coffeeIDStr := r.URL.Query().Get("coffee_id"); coffeeIDStr != "" {
		coffeeID, err := uuid.Parse(coffeeIDStr)
		if err == nil {
			params.CoffeeID = &coffeeID
		}
	}

	if scoreGTE := r.URL.Query().Get("score_gte"); scoreGTE != "" {
		if val, err := strconv.Atoi(scoreGTE); err == nil {
			params.ScoreGTE = &val
		}
	}

	if scoreLTE := r.URL.Query().Get("score_lte"); scoreLTE != "" {
		if val, err := strconv.Atoi(scoreLTE); err == nil {
			params.ScoreLTE = &val
		}
	}

	if dateFrom := r.URL.Query().Get("date_from"); dateFrom != "" {
		if t, err := time.Parse(time.RFC3339, dateFrom); err == nil {
			params.DateFrom = &t
		} else if t, err := time.Parse("2006-01-02", dateFrom); err == nil {
			params.DateFrom = &t
		}
	}

	if dateTo := r.URL.Query().Get("date_to"); dateTo != "" {
		if t, err := time.Parse(time.RFC3339, dateTo); err == nil {
			params.DateTo = &t
		} else if t, err := time.Parse("2006-01-02", dateTo); err == nil {
			params.DateTo = &t
		}
	}

	result, err := h.repo.List(r.Context(), userID, params)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list experiments")
		return
	}

	response.JSON(w, http.StatusOK, result)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	var input CreateExperimentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	// Validate required fields
	if input.CoffeeID == uuid.Nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "coffee_id is required")
		return
	}

	// Skip overall_notes validation for drafts
	isDraft := input.IsDraft != nil && *input.IsDraft
	if !isDraft && len(input.OverallNotes) < 10 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "overall_notes must be at least 10 characters")
		return
	}

	// Validate intensity scores are in 1-10 range
	intensityFields := []struct {
		value *int
		name  string
	}{
		{input.OverallScore, "overall_score"},
		{input.AromaIntensity, "aroma_intensity"},
		{input.BodyIntensity, "body_intensity"},
		{input.FlavorIntensity, "flavor_intensity"},
		{input.BrightnessIntensity, "brightness_intensity"},
		{input.SweetnessIntensity, "sweetness_intensity"},
		{input.CleanlinessIntensity, "cleanliness_intensity"},
		{input.ComplexityIntensity, "complexity_intensity"},
		{input.BalanceIntensity, "balance_intensity"},
		{input.AftertasteIntensity, "aftertaste_intensity"},
	}

	for _, f := range intensityFields {
		if err := ValidateIntensity(f.value, f.name); err != nil {
			response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			return
		}
	}

	// Validate temperature is within reasonable range
	if input.WaterTemperature != nil && (*input.WaterTemperature < 0 || *input.WaterTemperature > 100) {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "water_temperature must be between 0 and 100")
		return
	}

	// Validate positive values
	if input.CoffeeWeight != nil && *input.CoffeeWeight <= 0 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "coffee_weight must be positive")
		return
	}
	if input.WaterWeight != nil && *input.WaterWeight <= 0 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "water_weight must be positive")
		return
	}
	if input.Ratio != nil && *input.Ratio <= 0 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "ratio must be positive")
		return
	}

	experiment, err := h.repo.Create(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create experiment")
		return
	}

	response.JSON(w, http.StatusCreated, experiment)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	experimentID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid experiment id")
		return
	}

	experiment, err := h.repo.GetByID(r.Context(), userID, experimentID)
	if err != nil {
		if errors.Is(err, ErrExperimentNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "experiment not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get experiment")
		return
	}

	response.JSON(w, http.StatusOK, experiment)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	experimentID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid experiment id")
		return
	}

	var input UpdateExperimentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	// Validate overall_notes if provided (skip for drafts)
	isDraft := input.IsDraft != nil && *input.IsDraft
	if !isDraft && input.OverallNotes != nil && len(*input.OverallNotes) < 10 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "overall_notes must be at least 10 characters")
		return
	}

	// Validate intensity scores
	intensityFields := []struct {
		value *int
		name  string
	}{
		{input.OverallScore, "overall_score"},
		{input.AromaIntensity, "aroma_intensity"},
		{input.BodyIntensity, "body_intensity"},
		{input.FlavorIntensity, "flavor_intensity"},
		{input.BrightnessIntensity, "brightness_intensity"},
		{input.SweetnessIntensity, "sweetness_intensity"},
		{input.CleanlinessIntensity, "cleanliness_intensity"},
		{input.ComplexityIntensity, "complexity_intensity"},
		{input.BalanceIntensity, "balance_intensity"},
		{input.AftertasteIntensity, "aftertaste_intensity"},
	}

	for _, f := range intensityFields {
		if err := ValidateIntensity(f.value, f.name); err != nil {
			response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			return
		}
	}

	// Validate temperature range
	if input.WaterTemperature != nil && (*input.WaterTemperature < 0 || *input.WaterTemperature > 100) {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "water_temperature must be between 0 and 100")
		return
	}

	// Validate positive values
	if input.CoffeeWeight != nil && *input.CoffeeWeight <= 0 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "coffee_weight must be positive")
		return
	}
	if input.WaterWeight != nil && *input.WaterWeight <= 0 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "water_weight must be positive")
		return
	}
	if input.Ratio != nil && *input.Ratio <= 0 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "ratio must be positive")
		return
	}

	experiment, err := h.repo.Update(r.Context(), userID, experimentID, input)
	if err != nil {
		if errors.Is(err, ErrExperimentNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "experiment not found")
			return
		}
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update experiment")
		return
	}

	response.JSON(w, http.StatusOK, experiment)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	experimentID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid experiment id")
		return
	}

	err = h.repo.Delete(r.Context(), userID, experimentID)
	if err != nil {
		if errors.Is(err, ErrExperimentNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "experiment not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to delete experiment")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Copy(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	experimentID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid experiment id")
		return
	}

	experiment, err := h.repo.CopyAsTemplate(r.Context(), userID, experimentID)
	if err != nil {
		if errors.Is(err, ErrExperimentNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "experiment not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to copy experiment")
		return
	}

	response.JSON(w, http.StatusCreated, experiment)
}

func (h *Handler) Compare(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	var req CompareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	if len(req.ExperimentIDs) < 2 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "at least 2 experiments required for comparison")
		return
	}
	if len(req.ExperimentIDs) > 4 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "maximum 4 experiments for comparison")
		return
	}

	experiments, err := h.repo.GetByIDs(r.Context(), userID, req.ExperimentIDs)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to fetch experiments")
		return
	}

	if len(experiments) != len(req.ExperimentIDs) {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "one or more experiments not found")
		return
	}

	// Calculate deltas for comparable fields
	deltas := make(map[string]*DeltaInfo)

	// Helper to collect float values
	collectFloats := func(extractor func(*Experiment) *float64) []float64 {
		var vals []float64
		for i := range experiments {
			if v := extractor(&experiments[i]); v != nil {
				vals = append(vals, *v)
			}
		}
		return vals
	}

	collectInts := func(extractor func(*Experiment) *int) []float64 {
		var vals []float64
		for i := range experiments {
			if v := extractor(&experiments[i]); v != nil {
				vals = append(vals, float64(*v))
			}
		}
		return vals
	}

	// Calculate deltas for key fields
	if vals := collectFloats(func(e *Experiment) *float64 { return e.WaterTemperature }); len(vals) == len(experiments) {
		deltas["water_temperature"] = CalculateDelta(vals)
	}
	if vals := collectFloats(func(e *Experiment) *float64 { return e.CoffeeWeight }); len(vals) == len(experiments) {
		deltas["coffee_weight"] = CalculateDelta(vals)
	}
	if vals := collectFloats(func(e *Experiment) *float64 { return e.WaterWeight }); len(vals) == len(experiments) {
		deltas["water_weight"] = CalculateDelta(vals)
	}
	if vals := collectFloats(func(e *Experiment) *float64 { return e.GrindSize }); len(vals) == len(experiments) {
		deltas["grind_size"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Experiment) *int { return e.OverallScore }); len(vals) == len(experiments) {
		deltas["overall_score"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Experiment) *int { return e.AromaIntensity }); len(vals) == len(experiments) {
		deltas["aroma_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Experiment) *int { return e.BodyIntensity }); len(vals) == len(experiments) {
		deltas["body_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Experiment) *int { return e.FlavorIntensity }); len(vals) == len(experiments) {
		deltas["flavor_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Experiment) *int { return e.BrightnessIntensity }); len(vals) == len(experiments) {
		deltas["brightness_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Experiment) *int { return e.SweetnessIntensity }); len(vals) == len(experiments) {
		deltas["sweetness_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Experiment) *int { return e.CleanlinessIntensity }); len(vals) == len(experiments) {
		deltas["cleanliness_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Experiment) *int { return e.ComplexityIntensity }); len(vals) == len(experiments) {
		deltas["complexity_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Experiment) *int { return e.BalanceIntensity }); len(vals) == len(experiments) {
		deltas["balance_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Experiment) *int { return e.AftertasteIntensity }); len(vals) == len(experiments) {
		deltas["aftertaste_intensity"] = CalculateDelta(vals)
	}

	response.JSON(w, http.StatusOK, CompareResponse{
		Experiments: experiments,
		Deltas:      deltas,
	})
}

func (h *Handler) Analyze(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	var req AnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	// Default min_samples to 5
	minSamples := req.MinSamples
	if minSamples < 5 {
		minSamples = 5
	}
	if minSamples > 50 {
		minSamples = 50
	}

	var experiments []Experiment
	var err error

	// Support both experiment_ids and filters
	if len(req.ExperimentIDs) > 0 {
		// Legacy: Use experiment IDs directly
		if len(req.ExperimentIDs) < 5 {
			response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "at least 5 experiments required for analysis")
			return
		}
		experiments, err = h.repo.GetByIDs(r.Context(), userID, req.ExperimentIDs)
	} else if req.Filters != nil {
		// New: Use filters to find experiments
		params := ListExperimentsParams{
			CoffeeIDs: req.Filters.CoffeeIDs,
			DateFrom:  req.Filters.DateFrom,
			DateTo:    req.Filters.DateTo,
			ScoreGTE:  req.Filters.ScoreMin,
			ScoreLTE:  req.Filters.ScoreMax,
		}
		experiments, err = h.repo.ListAll(r.Context(), userID, params)
	} else {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "either experiment_ids or filters must be provided")
		return
	}

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to fetch experiments")
		return
	}

	if len(experiments) < 5 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "not enough valid experiments found (minimum 5 required)")
		return
	}

	correlations, warnings := CalculateCorrelations(experiments, minSamples)
	insights := GenerateInsights(correlations)

	// Extract experiment IDs for use in detail calls
	expIDs := make([]uuid.UUID, len(experiments))
	for i, exp := range experiments {
		expIDs[i] = exp.ID
	}

	response.JSON(w, http.StatusOK, AnalyzeResponse{
		Correlations:    correlations,
		Inputs:          InputVariables(),
		Outcomes:        OutcomeVariables(),
		ExperimentCount: len(experiments),
		ExperimentIDs:   expIDs,
		Insights:        insights,
		Warnings:        warnings,
	})
}

func (h *Handler) AnalyzeDetail(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	var req AnalyzeDetailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	if len(req.ExperimentIDs) < 2 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "at least 2 experiments required")
		return
	}

	if req.InputVariable == "" || req.OutcomeVariable == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "input_variable and outcome_variable are required")
		return
	}

	// Validate variable names
	validInput := false
	for _, v := range InputVariables() {
		if v == req.InputVariable {
			validInput = true
			break
		}
	}
	if !validInput {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid input_variable")
		return
	}

	validOutcome := false
	for _, v := range OutcomeVariables() {
		if v == req.OutcomeVariable {
			validOutcome = true
			break
		}
	}
	if !validOutcome {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid outcome_variable")
		return
	}

	experiments, err := h.repo.GetByIDs(r.Context(), userID, req.ExperimentIDs)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to fetch experiments")
		return
	}

	// Collect scatter data
	var scatterData []ScatterPoint
	var experimentPoints []ExperimentPoint
	var xVals, yVals []float64

	for i := range experiments {
		exp := &experiments[i]
		exp.CalculateComputedFields()

		xVal := ExtractInputValue(exp, req.InputVariable)
		yVal := ExtractOutcomeValue(exp, req.OutcomeVariable)

		if xVal != nil && yVal != nil {
			xVals = append(xVals, *xVal)
			yVals = append(yVals, *yVal)

			scatterData = append(scatterData, ScatterPoint{
				X:            *xVal,
				Y:            *yVal,
				ExperimentID: exp.ID.String(),
			})

			coffeeName := ""
			if exp.Coffee != nil {
				coffeeName = exp.Coffee.Name
			}

			experimentPoints = append(experimentPoints, ExperimentPoint{
				ID:           exp.ID,
				BrewDate:     exp.BrewDate,
				CoffeeName:   coffeeName,
				InputValue:   xVal,
				OutcomeValue: yVal,
			})
		}
	}

	if len(xVals) < 2 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "not enough data points with both values present")
		return
	}

	r_val, n, p := PearsonCorrelation(xVals, yVals)
	interpretation := InterpretCorrelation(r_val)

	// Generate insight message
	inputLabel := formatVariableName(req.InputVariable)
	outcomeLabel := formatVariableName(req.OutcomeVariable)
	direction := "positively"
	if r_val < 0 {
		direction = "negatively"
	}
	insight := "Higher " + inputLabel + " is " + direction + " associated with " + outcomeLabel + " in your selected experiments."

	response.JSON(w, http.StatusOK, AnalyzeDetailResponse{
		InputVariable:   req.InputVariable,
		OutcomeVariable: req.OutcomeVariable,
		Correlation: &CorrelationResult{
			R:              r_val,
			N:              n,
			P:              p,
			Interpretation: interpretation,
		},
		ScatterData: scatterData,
		Insight:     insight,
		Experiments: experimentPoints,
	})
}

func (h *Handler) Export(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	// Parse query parameters for filtering (same as List)
	params := ListExperimentsParams{
		Sort:   r.URL.Query().Get("sort"),
		HasTDS: r.URL.Query().Get("has_tds") == "true",
	}

	if coffeeIDStr := r.URL.Query().Get("coffee_id"); coffeeIDStr != "" {
		coffeeID, err := uuid.Parse(coffeeIDStr)
		if err == nil {
			params.CoffeeID = &coffeeID
		}
	}

	if scoreGTE := r.URL.Query().Get("score_gte"); scoreGTE != "" {
		if val, err := strconv.Atoi(scoreGTE); err == nil {
			params.ScoreGTE = &val
		}
	}

	if scoreLTE := r.URL.Query().Get("score_lte"); scoreLTE != "" {
		if val, err := strconv.Atoi(scoreLTE); err == nil {
			params.ScoreLTE = &val
		}
	}

	if dateFrom := r.URL.Query().Get("date_from"); dateFrom != "" {
		if t, err := time.Parse(time.RFC3339, dateFrom); err == nil {
			params.DateFrom = &t
		} else if t, err := time.Parse("2006-01-02", dateFrom); err == nil {
			params.DateFrom = &t
		}
	}

	if dateTo := r.URL.Query().Get("date_to"); dateTo != "" {
		if t, err := time.Parse(time.RFC3339, dateTo); err == nil {
			params.DateTo = &t
		} else if t, err := time.Parse("2006-01-02", dateTo); err == nil {
			params.DateTo = &t
		}
	}

	experiments, err := h.repo.ListAll(r.Context(), userID, params)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to export experiments")
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "csv"
	}

	switch format {
	case "json":
		h.exportJSON(w, experiments)
	case "csv":
		h.exportCSV(w, experiments)
	default:
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "format must be 'csv' or 'json'")
	}
}

func (h *Handler) exportJSON(w http.ResponseWriter, experiments []Experiment) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=experiments.json")
	json.NewEncoder(w).Encode(experiments)
}

func (h *Handler) exportCSV(w http.ResponseWriter, experiments []Experiment) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=experiments.csv")

	// Write CSV header
	header := []string{
		"id", "brew_date", "coffee_name", "coffee_roaster", "days_off_roast",
		"coffee_weight", "water_weight", "ratio", "grind_size", "water_temperature",
		"filter_paper", "bloom_water", "bloom_time", "total_brew_time", "drawdown_time",
		"water_bypass_ml", "mineral_profile_id",
		"coffee_ml", "tds", "extraction_yield", "is_draft",
		"aroma_intensity", "body_intensity", "flavor_intensity",
		"brightness_intensity", "sweetness_intensity",
		"cleanliness_intensity", "complexity_intensity",
		"balance_intensity", "aftertaste_intensity",
		"overall_score", "overall_notes", "improvement_notes",
	}

	w.Write([]byte(csvJoin(header) + "\n"))

	// Write each experiment as a row
	for _, exp := range experiments {
		isDraftStr := "false"
		if exp.IsDraft {
			isDraftStr = "true"
		}
		row := []string{
			exp.ID.String(),
			exp.BrewDate.Format(time.RFC3339),
			csvString(exp.Coffee, func(c *CoffeeSummary) string { return c.Name }),
			csvString(exp.Coffee, func(c *CoffeeSummary) string { return c.Roaster }),
			csvIntPtr(exp.DaysOffRoast),
			csvFloatPtr(exp.CoffeeWeight),
			csvFloatPtr(exp.WaterWeight),
			csvFloatPtr(exp.Ratio),
			csvFloatPtr(exp.GrindSize),
			csvFloatPtr(exp.WaterTemperature),
			csvString(exp.FilterPaper, func(fp *FilterPaperSummary) string { return fp.Name }),
			csvFloatPtr(exp.BloomWater),
			csvIntPtr(exp.BloomTime),
			csvIntPtr(exp.TotalBrewTime),
			csvIntPtr(exp.DrawdownTime),
			csvIntPtr(exp.WaterBypassML),
			csvUUIDPtr(exp.MineralProfileID),
			csvFloatPtr(exp.CoffeeMl),
			csvFloatPtr(exp.TDS),
			csvFloatPtr(exp.ExtractionYield),
			isDraftStr,
			csvIntPtr(exp.AromaIntensity),
			csvIntPtr(exp.BodyIntensity),
			csvIntPtr(exp.FlavorIntensity),
			csvIntPtr(exp.BrightnessIntensity),
			csvIntPtr(exp.SweetnessIntensity),
			csvIntPtr(exp.CleanlinessIntensity),
			csvIntPtr(exp.ComplexityIntensity),
			csvIntPtr(exp.BalanceIntensity),
			csvIntPtr(exp.AftertasteIntensity),
			csvIntPtr(exp.OverallScore),
			csvEscape(exp.OverallNotes),
			csvStrPtr(exp.ImprovementNotes),
		}
		w.Write([]byte(csvJoin(row) + "\n"))
	}
}

// CSV helper functions
func csvJoin(fields []string) string {
	return strings.Join(fields, ",")
}

func csvEscape(s string) string {
	if strings.ContainsAny(s, ",\"\n\r") {
		return "\"" + strings.ReplaceAll(s, "\"", "\"\"") + "\""
	}
	return s
}

func csvFloatPtr(f *float64) string {
	if f == nil {
		return ""
	}
	return strconv.FormatFloat(*f, 'f', -1, 64)
}

func csvIntPtr(i *int) string {
	if i == nil {
		return ""
	}
	return strconv.Itoa(*i)
}

func csvStrPtr(s *string) string {
	if s == nil {
		return ""
	}
	return csvEscape(*s)
}

func csvUUIDPtr(u *uuid.UUID) string {
	if u == nil {
		return ""
	}
	return u.String()
}

func csvString[T any](ptr *T, getter func(*T) string) string {
	if ptr == nil {
		return ""
	}
	return csvEscape(getter(ptr))
}

func parseIntOrDefault(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	return val
}
