package auth

import (
	"net/http"

	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/auth"
)

type LogoutHandler struct {
	authSvc *auth.AuthService
}

func NewLogoutHandler(authSvc *auth.AuthService) *LogoutHandler {
	return &LogoutHandler{authSvc: authSvc}
}

func (h *LogoutHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := GetRefreshTokenFromCookie(r)
	if err == nil && refreshToken != "" {
		_ = h.authSvc.Logout(r.Context(), refreshToken)
	}

	ClearRefreshTokenCookie(w)
	response.NoContent(w)
}
