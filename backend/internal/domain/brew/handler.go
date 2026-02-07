package brew

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

	params := ListBrewsParams{
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
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list brews")
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

	var input CreateBrewInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	// Validate required fields
	if input.CoffeeID == uuid.Nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "coffee_id is required")
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

	brew, err := h.repo.Create(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create brew")
		return
	}

	response.JSON(w, http.StatusCreated, brew)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	brewID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid brew id")
		return
	}

	brew, err := h.repo.GetByID(r.Context(), userID, brewID)
	if err != nil {
		if errors.Is(err, ErrBrewNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "brew not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get brew")
		return
	}

	response.JSON(w, http.StatusOK, brew)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	brewID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid brew id")
		return
	}

	var input UpdateBrewInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
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

	brew, err := h.repo.Update(r.Context(), userID, brewID, input)
	if err != nil {
		if errors.Is(err, ErrBrewNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "brew not found")
			return
		}
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update brew")
		return
	}

	response.JSON(w, http.StatusOK, brew)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	brewID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid brew id")
		return
	}

	err = h.repo.Delete(r.Context(), userID, brewID)
	if err != nil {
		if errors.Is(err, ErrBrewNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "brew not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to delete brew")
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

	brewID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid brew id")
		return
	}

	brew, err := h.repo.CopyAsTemplate(r.Context(), userID, brewID)
	if err != nil {
		if errors.Is(err, ErrBrewNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "brew not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to copy brew")
		return
	}

	response.JSON(w, http.StatusCreated, brew)
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

	if len(req.BrewIDs) < 2 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "at least 2 brews required for comparison")
		return
	}
	if len(req.BrewIDs) > 4 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "maximum 4 brews for comparison")
		return
	}

	brews, err := h.repo.GetByIDs(r.Context(), userID, req.BrewIDs)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to fetch brews")
		return
	}

	if len(brews) != len(req.BrewIDs) {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "one or more brews not found")
		return
	}

	// Calculate deltas for comparable fields
	deltas := make(map[string]*DeltaInfo)

	// Helper to collect float values
	collectFloats := func(extractor func(*Brew) *float64) []float64 {
		var vals []float64
		for i := range brews {
			if v := extractor(&brews[i]); v != nil {
				vals = append(vals, *v)
			}
		}
		return vals
	}

	collectInts := func(extractor func(*Brew) *int) []float64 {
		var vals []float64
		for i := range brews {
			if v := extractor(&brews[i]); v != nil {
				vals = append(vals, float64(*v))
			}
		}
		return vals
	}

	// Calculate deltas for key fields
	if vals := collectFloats(func(e *Brew) *float64 { return e.WaterTemperature }); len(vals) == len(brews) {
		deltas["water_temperature"] = CalculateDelta(vals)
	}
	if vals := collectFloats(func(e *Brew) *float64 { return e.CoffeeWeight }); len(vals) == len(brews) {
		deltas["coffee_weight"] = CalculateDelta(vals)
	}
	if vals := collectFloats(func(e *Brew) *float64 { return e.WaterWeight }); len(vals) == len(brews) {
		deltas["water_weight"] = CalculateDelta(vals)
	}
	if vals := collectFloats(func(e *Brew) *float64 { return e.GrindSize }); len(vals) == len(brews) {
		deltas["grind_size"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Brew) *int { return e.OverallScore }); len(vals) == len(brews) {
		deltas["overall_score"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Brew) *int { return e.AromaIntensity }); len(vals) == len(brews) {
		deltas["aroma_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Brew) *int { return e.BodyIntensity }); len(vals) == len(brews) {
		deltas["body_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Brew) *int { return e.FlavorIntensity }); len(vals) == len(brews) {
		deltas["flavor_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Brew) *int { return e.BrightnessIntensity }); len(vals) == len(brews) {
		deltas["brightness_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Brew) *int { return e.SweetnessIntensity }); len(vals) == len(brews) {
		deltas["sweetness_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Brew) *int { return e.CleanlinessIntensity }); len(vals) == len(brews) {
		deltas["cleanliness_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Brew) *int { return e.ComplexityIntensity }); len(vals) == len(brews) {
		deltas["complexity_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Brew) *int { return e.BalanceIntensity }); len(vals) == len(brews) {
		deltas["balance_intensity"] = CalculateDelta(vals)
	}
	if vals := collectInts(func(e *Brew) *int { return e.AftertasteIntensity }); len(vals) == len(brews) {
		deltas["aftertaste_intensity"] = CalculateDelta(vals)
	}

	response.JSON(w, http.StatusOK, CompareResponse{
		Brews: brews,
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

	var brews []Brew
	var err error

	// Support both brew_ids and filters
	if len(req.BrewIDs) > 0 {
		// Legacy: Use brew IDs directly
		if len(req.BrewIDs) < 5 {
			response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "at least 5 brews required for analysis")
			return
		}
		brews, err = h.repo.GetByIDs(r.Context(), userID, req.BrewIDs)
	} else if req.Filters != nil {
		// New: Use filters to find brews
		params := ListBrewsParams{
			CoffeeIDs: req.Filters.CoffeeIDs,
			DateFrom:  req.Filters.DateFrom,
			DateTo:    req.Filters.DateTo,
			ScoreGTE:  req.Filters.ScoreMin,
			ScoreLTE:  req.Filters.ScoreMax,
		}
		brews, err = h.repo.ListAll(r.Context(), userID, params)
	} else {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "either brew_ids or filters must be provided")
		return
	}

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to fetch brews")
		return
	}

	if len(brews) < 5 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "not enough valid brews found (minimum 5 required)")
		return
	}

	correlations, warnings := CalculateCorrelations(brews, minSamples)
	insights := GenerateInsights(correlations)

	// Extract brew IDs for use in detail calls
	expIDs := make([]uuid.UUID, len(brews))
	for i, exp := range brews {
		expIDs[i] = exp.ID
	}

	response.JSON(w, http.StatusOK, AnalyzeResponse{
		Correlations:    correlations,
		Inputs:          InputVariables(),
		Outcomes:        OutcomeVariables(),
		BrewCount: len(brews),
		BrewIDs:   expIDs,
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

	if len(req.BrewIDs) < 2 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "at least 2 brews required")
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

	brews, err := h.repo.GetByIDs(r.Context(), userID, req.BrewIDs)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to fetch brews")
		return
	}

	// Collect scatter data
	var scatterData []ScatterPoint
	var brewPoints []BrewPoint
	var xVals, yVals []float64

	for i := range brews {
		exp := &brews[i]
		exp.CalculateComputedFields()

		xVal := ExtractInputValue(exp, req.InputVariable)
		yVal := ExtractOutcomeValue(exp, req.OutcomeVariable)

		if xVal != nil && yVal != nil {
			xVals = append(xVals, *xVal)
			yVals = append(yVals, *yVal)

			scatterData = append(scatterData, ScatterPoint{
				X:            *xVal,
				Y:            *yVal,
				BrewID: exp.ID.String(),
			})

			coffeeName := ""
			if exp.Coffee != nil {
				coffeeName = exp.Coffee.Name
			}

			brewPoints = append(brewPoints, BrewPoint{
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
	insight := "Higher " + inputLabel + " is " + direction + " associated with " + outcomeLabel + " in your selected brews."

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
		Brews: brewPoints,
	})
}

func (h *Handler) Export(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	// Parse query parameters for filtering (same as List)
	params := ListBrewsParams{
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

	brews, err := h.repo.ListAll(r.Context(), userID, params)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to export brews")
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "csv"
	}

	switch format {
	case "json":
		h.exportJSON(w, brews)
	case "csv":
		h.exportCSV(w, brews)
	default:
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "format must be 'csv' or 'json'")
	}
}

func (h *Handler) exportJSON(w http.ResponseWriter, brews []Brew) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=brews.json")
	json.NewEncoder(w).Encode(brews)
}

func (h *Handler) exportCSV(w http.ResponseWriter, brews []Brew) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=brews.csv")

	// Write CSV header
	header := []string{
		"id", "brew_date", "roast_date", "coffee_name", "coffee_roaster", "days_off_roast",
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

	// Write each brew as a row
	for _, exp := range brews {
		isDraftStr := "false"
		if exp.IsDraft {
			isDraftStr = "true"
		}
		roastDateStr := ""
		if exp.RoastDate != nil {
			roastDateStr = exp.RoastDate.Format("2006-01-02")
		}
		row := []string{
			exp.ID.String(),
			exp.BrewDate.Format(time.RFC3339),
			roastDateStr,
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
