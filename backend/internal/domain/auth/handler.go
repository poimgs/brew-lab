package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/poimgs/coffee-tracker/backend/internal/api"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
)

type Handler struct {
	users       UserRepository
	tokens      RefreshTokenRepository
	jwtSecret   string
	accessTTL   time.Duration
	refreshTTL  time.Duration
	secureCookie bool
}

func NewHandler(users UserRepository, tokens RefreshTokenRepository, jwtSecret string, accessTTL, refreshTTL int, secureCookie bool) *Handler {
	return &Handler{
		users:        users,
		tokens:       tokens,
		jwtSecret:    jwtSecret,
		accessTTL:    time.Duration(accessTTL) * time.Second,
		refreshTTL:   time.Duration(refreshTTL) * time.Second,
		secureCookie: secureCookie,
	}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := api.DecodeJSON(r, &req); err != nil {
		api.ValidationError(w, []api.FieldError{{Field: "body", Message: "Invalid request body"}})
		return
	}

	if req.Email == "" || req.Password == "" {
		api.UnauthorizedError(w, "Invalid email or password")
		return
	}

	user, err := h.users.GetByEmail(r.Context(), req.Email)
	if err != nil {
		log.Printf("error looking up user: %v", err)
		api.InternalError(w)
		return
	}
	if user == nil {
		api.UnauthorizedError(w, "Invalid email or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		api.UnauthorizedError(w, "Invalid email or password")
		return
	}

	accessToken, err := h.generateAccessToken(user)
	if err != nil {
		log.Printf("error generating access token: %v", err)
		api.InternalError(w)
		return
	}

	refreshTokenStr, err := h.generateAndStoreRefreshToken(r, user)
	if err != nil {
		log.Printf("error generating refresh token: %v", err)
		api.InternalError(w)
		return
	}

	h.setRefreshCookie(w, refreshTokenStr)

	api.WriteJSON(w, http.StatusOK, LoginResponse{
		User: UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			CreatedAt: user.CreatedAt,
		},
		AccessToken: accessToken,
	})
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		api.UnauthorizedError(w, "Missing refresh token")
		return
	}

	tokenString := cookie.Value

	// Validate the JWT
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		h.clearRefreshCookie(w)
		api.UnauthorizedError(w, "Invalid or expired refresh token")
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		h.clearRefreshCookie(w)
		api.UnauthorizedError(w, "Invalid token claims")
		return
	}

	tokenType, _ := claims["type"].(string)
	if tokenType != "refresh" {
		h.clearRefreshCookie(w)
		api.UnauthorizedError(w, "Invalid token type")
		return
	}

	// Verify the token exists in the database (not revoked)
	tokenHash := hashToken(tokenString)
	storedToken, err := h.tokens.GetByTokenHash(r.Context(), tokenHash)
	if err != nil {
		log.Printf("error looking up refresh token: %v", err)
		api.InternalError(w)
		return
	}
	if storedToken == nil {
		h.clearRefreshCookie(w)
		api.UnauthorizedError(w, "Refresh token has been revoked")
		return
	}

	// Delete the old token (rotation)
	if err := h.tokens.DeleteByTokenHash(r.Context(), tokenHash); err != nil {
		log.Printf("error deleting old refresh token: %v", err)
		api.InternalError(w)
		return
	}

	// Look up the user
	sub, _ := claims.GetSubject()
	user, err := h.users.GetByID(r.Context(), sub)
	if err != nil {
		log.Printf("error looking up user: %v", err)
		api.InternalError(w)
		return
	}
	if user == nil {
		h.clearRefreshCookie(w)
		api.UnauthorizedError(w, "User not found")
		return
	}

	// Issue new tokens
	accessToken, err := h.generateAccessToken(user)
	if err != nil {
		log.Printf("error generating access token: %v", err)
		api.InternalError(w)
		return
	}

	newRefreshStr, err := h.generateAndStoreRefreshToken(r, user)
	if err != nil {
		log.Printf("error generating refresh token: %v", err)
		api.InternalError(w)
		return
	}

	h.setRefreshCookie(w, newRefreshStr)

	api.WriteJSON(w, http.StatusOK, RefreshResponse{
		AccessToken: accessToken,
	})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err == nil {
		tokenHash := hashToken(cookie.Value)
		if err := h.tokens.DeleteByTokenHash(r.Context(), tokenHash); err != nil {
			log.Printf("error deleting refresh token on logout: %v", err)
		}
	}

	h.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		api.UnauthorizedError(w, "Not authenticated")
		return
	}

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		log.Printf("error looking up user: %v", err)
		api.InternalError(w)
		return
	}
	if user == nil {
		api.NotFoundError(w, "User not found")
		return
	}

	api.WriteJSON(w, http.StatusOK, UserResponse{
		ID:        user.ID,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
	})
}

func (h *Handler) generateAccessToken(user *User) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"iat":   now.Unix(),
		"exp":   now.Add(h.accessTTL).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}

func (h *Handler) generateAndStoreRefreshToken(r *http.Request, user *User) (string, error) {
	now := time.Now()
	expiresAt := now.Add(h.refreshTTL)

	jti, err := generateJTI()
	if err != nil {
		return "", err
	}

	claims := jwt.MapClaims{
		"sub":  user.ID,
		"type": "refresh",
		"jti":  jti,
		"iat":  now.Unix(),
		"exp":  expiresAt.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		return "", err
	}

	tokenHash := hashToken(tokenString)
	if _, err := h.tokens.Create(r.Context(), user.ID, tokenHash, expiresAt); err != nil {
		return "", err
	}

	return tokenString, nil
}

func (h *Handler) setRefreshCookie(w http.ResponseWriter, tokenString string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    tokenString,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(h.refreshTTL.Seconds()),
	})
}

func (h *Handler) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
	})
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func generateJTI() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generating jti: %w", err)
	}
	return hex.EncodeToString(b), nil
}
