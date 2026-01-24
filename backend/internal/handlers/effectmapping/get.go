package effectmapping

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

type GetHandler struct {
	svc *effectmapping.EffectMappingService
}

func NewGetHandler(svc *effectmapping.EffectMappingService) *GetHandler {
	return &GetHandler{svc: svc}
}

func (h *GetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	mappingIDStr := chi.URLParam(r, "id")
	mappingID, err := uuid.Parse(mappingIDStr)
	if err != nil {
		response.BadRequest(w, "invalid effect mapping ID")
		return
	}

	mapping, err := h.svc.GetByID(r.Context(), userID, mappingID)
	if err != nil {
		if errors.Is(err, repository.ErrEffectMappingNotFound) {
			response.NotFound(w, "effect mapping not found")
			return
		}
		response.InternalServerError(w, "failed to get effect mapping")
		return
	}

	response.OK(w, mapping)
}
