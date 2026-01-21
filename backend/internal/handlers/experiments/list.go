package experiments

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/experiment"
)

type ListHandler struct {
	experimentSvc *experiment.ExperimentService
}

func NewListHandler(experimentSvc *experiment.ExperimentService) *ListHandler {
	return &ListHandler{experimentSvc: experimentSvc}
}

func (h *ListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	query := r.URL.Query()

	input := &experiment.ListExperimentsInput{
		Filter:   models.ExperimentFilter{},
		SortBy:   query.Get("sort_by"),
		SortDir:  query.Get("sort_dir"),
		Page:     1,
		PageSize: 20,
	}

	// Parse filter parameters
	if coffeeIDStr := query.Get("coffee_id"); coffeeIDStr != "" {
		if coffeeID, err := uuid.Parse(coffeeIDStr); err == nil {
			input.Filter.CoffeeID = &coffeeID
		}
	}

	if scoreGTE := query.Get("score_gte"); scoreGTE != "" {
		if score, err := strconv.Atoi(scoreGTE); err == nil {
			input.Filter.ScoreGTE = &score
		}
	}

	if scoreLTE := query.Get("score_lte"); scoreLTE != "" {
		if score, err := strconv.Atoi(scoreLTE); err == nil {
			input.Filter.ScoreLTE = &score
		}
	}

	if tags := query.Get("tags"); tags != "" {
		input.Filter.Tags = strings.Split(tags, ",")
	}

	if hasTDS := query.Get("has_tds"); hasTDS != "" {
		val := hasTDS == "true"
		input.Filter.HasTDS = &val
	}

	if dateFrom := query.Get("date_from"); dateFrom != "" {
		if t, err := time.Parse("2006-01-02", dateFrom); err == nil {
			input.Filter.DateFrom = &t
		}
	}

	if dateTo := query.Get("date_to"); dateTo != "" {
		if t, err := time.Parse("2006-01-02", dateTo); err == nil {
			input.Filter.DateTo = &t
		}
	}

	// Parse pagination
	if page := query.Get("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil {
			input.Page = p
		}
	}
	if pageSize := query.Get("page_size"); pageSize != "" {
		if ps, err := strconv.Atoi(pageSize); err == nil {
			input.PageSize = ps
		}
	}

	result, err := h.experimentSvc.List(r.Context(), userID, input)
	if err != nil {
		response.InternalServerError(w, "failed to list experiments")
		return
	}

	response.OK(w, result)
}
