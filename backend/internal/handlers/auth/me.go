package auth

import (
	"errors"
	"net/http"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/auth"
)

type MeHandler struct {
	authSvc *auth.AuthService
}

func NewMeHandler(authSvc *auth.AuthService) *MeHandler {
	return &MeHandler{authSvc: authSvc}
}

func (h *MeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	user, err := h.authSvc.GetCurrentUser(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			response.NotFound(w, "user not found")
			return
		}
		response.InternalServerError(w, "failed to get user")
		return
	}

	response.OK(w, user)
}
