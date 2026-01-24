package experiments

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/experiment"
)

type ExportHandler struct {
	experimentSvc *experiment.ExperimentService
}

func NewExportHandler(experimentSvc *experiment.ExperimentService) *ExportHandler {
	return &ExportHandler{experimentSvc: experimentSvc}
}

func (h *ExportHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	// Parse query parameters (same as list)
	query := r.URL.Query()

	filter := models.ExperimentFilter{}

	if coffeeIDStr := query.Get("coffee_id"); coffeeIDStr != "" {
		coffeeID, err := uuid.Parse(coffeeIDStr)
		if err == nil {
			filter.CoffeeID = &coffeeID
		}
	}

	if hasTDS := query.Get("has_tds"); hasTDS != "" {
		val := hasTDS == "true"
		filter.HasTDS = &val
	}

	if dateFrom := query.Get("date_from"); dateFrom != "" {
		if t, err := time.Parse("2006-01-02", dateFrom); err == nil {
			filter.DateFrom = &t
		}
	}

	if dateTo := query.Get("date_to"); dateTo != "" {
		if t, err := time.Parse("2006-01-02", dateTo); err == nil {
			filter.DateTo = &t
		}
	}

	// Get format (csv or json, default csv)
	format := query.Get("format")
	if format == "" {
		format = "csv"
	}
	if format != "csv" && format != "json" {
		response.BadRequest(w, "format must be 'csv' or 'json'")
		return
	}

	// Fetch all matching experiments (no pagination for export)
	input := &experiment.ListExperimentsInput{
		Filter:   filter,
		SortBy:   "brew_date",
		SortDir:  "desc",
		Page:     1,
		PageSize: 10000, // Large enough to get all
	}

	result, err := h.experimentSvc.List(r.Context(), userID, input)
	if err != nil {
		response.InternalServerError(w, "failed to fetch experiments: "+err.Error())
		return
	}

	filename := fmt.Sprintf("experiments_%s", time.Now().Format("2006-01-02"))

	if format == "json" {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.json\"", filename))
		json.NewEncoder(w).Encode(result.Experiments)
		return
	}

	// CSV export
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.csv\"", filename))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Write header
	header := []string{
		"ID",
		"Brew Date",
		"Coffee Name",
		"Overall Score",
		"Coffee Weight (g)",
		"Water Weight (g)",
		"Ratio",
		"Grind Size",
		"Water Temperature (C)",
		"Bloom Time (s)",
		"Total Brew Time (s)",
		"TDS (%)",
		"Extraction Yield (%)",
		"Acidity",
		"Sweetness",
		"Bitterness",
		"Body",
		"Aroma",
		"Days Off Roast",
		"Overall Notes",
	}
	writer.Write(header)

	// Write rows
	for _, exp := range result.Experiments {
		row := []string{
			exp.ID.String(),
			exp.BrewDate.Format("2006-01-02"),
			getCoffeeName(exp.Coffee),
			intPtrToString(exp.OverallScore),
			floatPtrToString(exp.CoffeeWeight),
			floatPtrToString(exp.WaterWeight),
			floatPtrToString(exp.CalculatedRatio),
			stringPtrToString(exp.GrindSize),
			floatPtrToString(exp.WaterTemperature),
			intPtrToString(exp.BloomTime),
			intPtrToString(exp.TotalBrewTime),
			floatPtrToString(exp.TDS),
			floatPtrToString(exp.ExtractionYield),
			intPtrToString(exp.AcidityIntensity),
			intPtrToString(exp.SweetnessIntensity),
			intPtrToString(exp.BitternessIntensity),
			intPtrToString(exp.BodyWeight),
			intPtrToString(exp.AromaIntensity),
			intPtrToString(exp.DaysOffRoast),
			exp.OverallNotes,
		}
		writer.Write(row)
	}
}

func getCoffeeName(coffee *models.CoffeeResponse) string {
	if coffee == nil {
		return ""
	}
	return coffee.Name
}

func floatPtrToString(f *float64) string {
	if f == nil {
		return ""
	}
	return fmt.Sprintf("%.2f", *f)
}

func intPtrToString(i *int) string {
	if i == nil {
		return ""
	}
	return fmt.Sprintf("%d", *i)
}

func stringPtrToString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
