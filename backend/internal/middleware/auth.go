package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/auth"
)

type contextKey string

const UserIDKey contextKey = "userID"

type AuthMiddleware struct {
	jwtSvc *auth.JWTService
}

func NewAuthMiddleware(jwtSvc *auth.JWTService) *AuthMiddleware {
	return &AuthMiddleware{jwtSvc: jwtSvc}
}

func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			response.Unauthorized(w, "missing authorization header")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.Unauthorized(w, "invalid authorization header format")
			return
		}

		claims, err := m.jwtSvc.ValidateAccessToken(parts[1])
		if err != nil {
			response.Unauthorized(w, "invalid or expired token")
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(UserIDKey).(uuid.UUID)
	return userID, ok
}
