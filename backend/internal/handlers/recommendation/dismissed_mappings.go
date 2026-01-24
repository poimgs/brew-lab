package recommendation

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	recommendationservice "github.com/poimgs/coffee-tracker/backend/internal/services/recommendation"
)

type DismissedMappingsHandler struct {
	svc *recommendationservice.RecommendationService
}

func NewDismissedMappingsHandler(svc *recommendationservice.RecommendationService) *DismissedMappingsHandler {
	return &DismissedMappingsHandler{svc: svc}
}

func (h *DismissedMappingsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	dismissed, err := h.svc.GetDismissedMappings(r.Context(), userID, experimentID)
	if err != nil {
		response.InternalServerError(w, "failed to get dismissed mappings")
		return
	}

	response.OK(w, dismissed)
}
