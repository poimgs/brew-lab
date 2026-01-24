package filterpaper

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/filterpaper"
)

type GetHandler struct {
	filterPaperSvc *filterpaper.FilterPaperService
}

func NewGetHandler(filterPaperSvc *filterpaper.FilterPaperService) *GetHandler {
	return &GetHandler{filterPaperSvc: filterPaperSvc}
}

func (h *GetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	idStr := chi.URLParam(r, "id")
	filterPaperID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid filter paper ID")
		return
	}

	fp, err := h.filterPaperSvc.GetByID(r.Context(), userID, filterPaperID)
	if err != nil {
		if errors.Is(err, filterpaper.ErrNotFound) {
			response.NotFound(w, "filter paper not found")
			return
		}
		response.InternalServerError(w, "failed to get filter paper")
		return
	}

	response.OK(w, fp)
}
