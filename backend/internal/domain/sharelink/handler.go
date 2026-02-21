package sharelink

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/poimgs/coffee-tracker/backend/internal/api"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
)

type Handler struct {
	repo    Repository
	baseURL string
}

func NewHandler(repo Repository, baseURL string) *Handler {
	return &Handler{repo: repo, baseURL: baseURL}
}

func (h *Handler) buildURL(token string) string {
	return h.baseURL + "/share/" + token
}

func (h *Handler) GetShareLink(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	token, createdAt, err := h.repo.GetShareToken(r.Context(), userID)
	if err != nil {
		log.Printf("error getting share token: %v", err)
		api.InternalError(w)
		return
	}

	resp := ShareLink{
		Token:     token,
		CreatedAt: createdAt,
	}
	if token != nil {
		url := h.buildURL(*token)
		resp.URL = &url
	}

	api.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handler) CreateShareLink(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		log.Printf("error generating share token: %v", err)
		api.InternalError(w)
		return
	}
	token := hex.EncodeToString(bytes)

	createdAt, err := h.repo.SetShareToken(r.Context(), userID, token)
	if err != nil {
		log.Printf("error setting share token: %v", err)
		api.InternalError(w)
		return
	}

	url := h.buildURL(token)
	api.WriteJSON(w, http.StatusCreated, ShareLink{
		Token:     &token,
		URL:       &url,
		CreatedAt: createdAt,
	})
}

func (h *Handler) RevokeShareLink(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	if err := h.repo.ClearShareToken(r.Context(), userID); err != nil {
		log.Printf("error clearing share token: %v", err)
		api.InternalError(w)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetSharedCoffees(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	userID, err := h.repo.GetUserIDByToken(r.Context(), token)
	if err != nil {
		log.Printf("error looking up share token: %v", err)
		api.InternalError(w)
		return
	}
	if userID == nil {
		api.NotFoundError(w, "This share link is no longer active.")
		return
	}

	coffees, err := h.repo.GetSharedCoffees(r.Context(), *userID)
	if err != nil {
		log.Printf("error getting shared coffees: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"items": coffees,
	})
}
