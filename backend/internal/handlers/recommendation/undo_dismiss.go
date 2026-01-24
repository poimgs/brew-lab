package recommendation

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	recommendationservice "github.com/poimgs/coffee-tracker/backend/internal/services/recommendation"
)

type UndoDismissHandler struct {
	svc *recommendationservice.RecommendationService
}

func NewUndoDismissHandler(svc *recommendationservice.RecommendationService) *UndoDismissHandler {
	return &UndoDismissHandler{svc: svc}
}

func (h *UndoDismissHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	mappingIDStr := chi.URLParam(r, "mappingID")
	mappingID, err := uuid.Parse(mappingIDStr)
	if err != nil {
		response.BadRequest(w, "invalid mapping ID")
		return
	}

	err = h.svc.UndoDismissal(r.Context(), userID, experimentID, mappingID)
	if err != nil {
		if errors.Is(err, repository.ErrDismissalNotFound) {
			response.NotFound(w, "dismissal not found")
			return
		}
		response.InternalServerError(w, "failed to undo dismissal")
		return
	}

	response.NoContent(w)
}
