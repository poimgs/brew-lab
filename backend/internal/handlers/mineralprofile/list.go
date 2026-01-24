package mineralprofile

import (
	"net/http"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/mineralprofile"
)

type ListHandler struct {
	mineralProfileSvc *mineralprofile.MineralProfileService
}

func NewListHandler(mineralProfileSvc *mineralprofile.MineralProfileService) *ListHandler {
	return &ListHandler{mineralProfileSvc: mineralProfileSvc}
}

func (h *ListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Just verify authentication, but mineral profiles are global
	_, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	result, err := h.mineralProfileSvc.List(r.Context())
	if err != nil {
		response.InternalServerError(w, "failed to list mineral profiles")
		return
	}

	response.OK(w, result)
}
