package defaults

import (
	"net/http"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/defaults"
)

type GetHandler struct {
	defaultsSvc *defaults.DefaultsService
}

func NewGetHandler(defaultsSvc *defaults.DefaultsService) *GetHandler {
	return &GetHandler{defaultsSvc: defaultsSvc}
}

func (h *GetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	result, err := h.defaultsSvc.Get(r.Context(), userID)
	if err != nil {
		response.InternalServerError(w, "failed to get defaults")
		return
	}

	response.OK(w, result)
}
