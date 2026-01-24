package auth

import (
	"errors"
	"net/http"

	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/auth"
)

type RefreshHandler struct {
	authSvc      *auth.AuthService
	cookieSecure bool
}

func NewRefreshHandler(authSvc *auth.AuthService, cookieSecure bool) *RefreshHandler {
	return &RefreshHandler{authSvc: authSvc, cookieSecure: cookieSecure}
}

func (h *RefreshHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := GetRefreshTokenFromCookie(r)
	if err != nil {
		response.Unauthorized(w, "missing refresh token")
		return
	}

	authResp, newRefreshToken, err := h.authSvc.Refresh(r.Context(), refreshToken)
	if err != nil {
		ClearRefreshTokenCookie(w, h.cookieSecure)
		if errors.Is(err, auth.ErrInvalidToken) {
			response.Unauthorized(w, "invalid or expired refresh token")
			return
		}
		response.InternalServerError(w, "failed to refresh token")
		return
	}

	SetRefreshTokenCookie(w, newRefreshToken, h.authSvc.GetJWTService().GetRefreshTokenExpiry(), h.cookieSecure)
	response.OK(w, authResp)
}
