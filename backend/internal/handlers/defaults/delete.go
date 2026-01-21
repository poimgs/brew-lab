package defaults

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/defaults"
)

type DeleteHandler struct {
	defaultsSvc *defaults.DefaultsService
}

func NewDeleteHandler(defaultsSvc *defaults.DefaultsService) *DeleteHandler {
	return &DeleteHandler{defaultsSvc: defaultsSvc}
}

func (h *DeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	fieldName := chi.URLParam(r, "field")
	if fieldName == "" {
		response.BadRequest(w, "field name is required")
		return
	}

	err := h.defaultsSvc.Delete(r.Context(), userID, fieldName)
	if err != nil {
		switch {
		case errors.Is(err, defaults.ErrInvalidFieldName):
			response.BadRequest(w, "invalid field name")
		case errors.Is(err, repository.ErrDefaultNotFound):
			response.NotFound(w, "default not found")
		default:
			response.InternalServerError(w, "failed to delete default")
		}
		return
	}

	response.NoContent(w)
}
