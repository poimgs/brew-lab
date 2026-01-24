package experiments

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/experiment"
)

type OptimizationHandler struct {
	experimentSvc *experiment.ExperimentService
}

func NewOptimizationHandler(experimentSvc *experiment.ExperimentService) *OptimizationHandler {
	return &OptimizationHandler{experimentSvc: experimentSvc}
}

func (h *OptimizationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	experimentIDStr := chi.URLParam(r, "id")
	experimentID, err := uuid.Parse(experimentIDStr)
	if err != nil {
		response.BadRequest(w, "invalid experiment ID")
		return
	}

	optimization, err := h.experimentSvc.GetOptimization(r.Context(), userID, experimentID)
	if err != nil {
		if errors.Is(err, repository.ErrExperimentNotFound) {
			response.NotFound(w, "experiment not found")
			return
		}
		response.InternalServerError(w, "failed to get optimization data")
		return
	}

	response.OK(w, optimization)
}
