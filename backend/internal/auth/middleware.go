package auth

import (
	"context"
	"net/http"
	"strings"

	"coffee-tracker/internal/response"

	"github.com/google/uuid"
)

type contextKey string

const userContextKey contextKey = "user_id"

func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid authorization header")
				return
			}

			claims, err := ParseAccessToken(parts[1], jwtSecret)
			if err != nil {
				if err == ErrExpiredToken {
					response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "token expired")
					return
				}
				response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid token")
				return
			}

			userID, err := uuid.Parse(claims.UserID)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid token")
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(userContextKey).(uuid.UUID)
	return userID, ok
}

// SetUserID sets the user ID in the context (for testing purposes)
func SetUserID(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, userContextKey, userID)
}
