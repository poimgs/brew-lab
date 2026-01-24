package effectmappings

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/effectmapping"
)

type ToggleHandler struct {
	svc *effectmapping.EffectMappingService
}

func NewToggleHandler(svc *effectmapping.EffectMappingService) *ToggleHandler {
	return &ToggleHandler{svc: svc}
}

func (h *ToggleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid mapping ID")
		return
	}

	updated, err := h.svc.Toggle(r.Context(), userID, id)
	if err != nil {
		if errors.Is(err, repository.ErrEffectMappingNotFound) {
			response.NotFound(w, "effect mapping not found")
			return
		}
		response.InternalServerError(w, "failed to toggle effect mapping")
		return
	}

	response.OK(w, updated)
}
