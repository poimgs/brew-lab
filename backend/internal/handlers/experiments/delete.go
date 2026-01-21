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

type DeleteHandler struct {
	experimentSvc *experiment.ExperimentService
}

func NewDeleteHandler(experimentSvc *experiment.ExperimentService) *DeleteHandler {
	return &DeleteHandler{experimentSvc: experimentSvc}
}

func (h *DeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	err = h.experimentSvc.Delete(r.Context(), userID, experimentID)
	if err != nil {
		if errors.Is(err, repository.ErrExperimentNotFound) {
			response.NotFound(w, "experiment not found")
			return
		}
		response.InternalServerError(w, "failed to delete experiment")
		return
	}

	response.NoContent(w)
}
