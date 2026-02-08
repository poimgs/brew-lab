package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"github.com/poimgs/coffee-tracker/backend/internal/api"
)

type contextKey string

const UserIDKey contextKey = "user_id"

func RequireAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				api.UnauthorizedError(w, "Missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				api.UnauthorizedError(w, "Invalid authorization header format")
				return
			}

			tokenString := parts[1]
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				api.UnauthorizedError(w, "Invalid or expired token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				api.UnauthorizedError(w, "Invalid token claims")
				return
			}

			// Reject refresh tokens used as access tokens
			if tokenType, exists := claims["type"]; exists && tokenType == "refresh" {
				api.UnauthorizedError(w, "Invalid token type")
				return
			}

			sub, err := claims.GetSubject()
			if err != nil || sub == "" {
				api.UnauthorizedError(w, "Invalid token subject")
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, sub)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(ctx context.Context) string {
	userID, _ := ctx.Value(UserIDKey).(string)
	return userID
}
