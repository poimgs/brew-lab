package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"coffee-tracker/internal/response"

	"github.com/google/uuid"
)

type Handler struct {
	service         *Service
	refreshTokenTTL time.Duration
	secureCookie    bool
}

func NewHandler(service *Service, refreshTTL time.Duration, secureCookie bool) *Handler {
	return &Handler{
		service:         service,
		refreshTokenTTL: refreshTTL,
		secureCookie:    secureCookie,
	}
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	AccessToken string    `json:"access_token"`
	User        userDTO   `json:"user"`
}

type userDTO struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "email and password are required")
		return
	}

	result, err := h.service.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			response.Error(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal server error")
		return
	}

	h.setRefreshCookie(w, result.RefreshToken)

	response.JSON(w, http.StatusOK, loginResponse{
		AccessToken: result.AccessToken,
		User: userDTO{
			ID:        result.User.ID,
			Email:     result.User.Email,
			CreatedAt: result.User.CreatedAt,
		},
	})
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "no refresh token")
		return
	}

	result, err := h.service.Refresh(r.Context(), cookie.Value)
	if err != nil {
		if errors.Is(err, ErrInvalidRefresh) {
			h.clearRefreshCookie(w)
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid refresh token")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal server error")
		return
	}

	h.setRefreshCookie(w, result.RefreshToken)

	response.JSON(w, http.StatusOK, loginResponse{
		AccessToken: result.AccessToken,
		User: userDTO{
			ID:        result.User.ID,
			Email:     result.User.Email,
			CreatedAt: result.User.CreatedAt,
		},
	})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err == nil {
		h.service.Logout(r.Context(), cookie.Value)
	}

	h.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userContextKey).(uuid.UUID)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	user, err := h.service.GetCurrentUser(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal server error")
		return
	}

	response.JSON(w, http.StatusOK, userDTO{
		ID:        user.ID,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
	})
}

func (h *Handler) setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(h.refreshTokenTTL.Seconds()),
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
