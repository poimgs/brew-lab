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

type CopyHandler struct {
	experimentSvc *experiment.ExperimentService
}

func NewCopyHandler(experimentSvc *experiment.ExperimentService) *CopyHandler {
	return &CopyHandler{experimentSvc: experimentSvc}
}

func (h *CopyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	copied, err := h.experimentSvc.Copy(r.Context(), userID, experimentID)
	if err != nil {
		if errors.Is(err, repository.ErrExperimentNotFound) {
			response.NotFound(w, "experiment not found")
			return
		}
		response.InternalServerError(w, "failed to copy experiment")
		return
	}

	response.Created(w, copied)
}
