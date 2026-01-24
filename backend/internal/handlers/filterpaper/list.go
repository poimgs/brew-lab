package filterpaper

import (
	"net/http"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/filterpaper"
)

type ListHandler struct {
	filterPaperSvc *filterpaper.FilterPaperService
}

func NewListHandler(filterPaperSvc *filterpaper.FilterPaperService) *ListHandler {
	return &ListHandler{filterPaperSvc: filterPaperSvc}
}

func (h *ListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	result, err := h.filterPaperSvc.List(r.Context(), userID)
	if err != nil {
		response.InternalServerError(w, "failed to list filter papers")
		return
	}

	response.OK(w, result)
}
