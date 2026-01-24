package auth

import (
	"net/http"

	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/auth"
)

type LogoutHandler struct {
	authSvc      *auth.AuthService
	cookieSecure bool
}

func NewLogoutHandler(authSvc *auth.AuthService, cookieSecure bool) *LogoutHandler {
	return &LogoutHandler{authSvc: authSvc, cookieSecure: cookieSecure}
}

func (h *LogoutHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := GetRefreshTokenFromCookie(r)
	if err == nil && refreshToken != "" {
		_ = h.authSvc.Logout(r.Context(), refreshToken)
	}

	ClearRefreshTokenCookie(w, h.cookieSecure)
	response.NoContent(w)
}
