package home

import (
	"net/http"
	"strconv"

	"coffee-tracker/internal/auth"
	"coffee-tracker/internal/response"
)

// Handler handles home-related requests
type Handler struct {
	repo Repository
}

// NewHandler creates a new Handler
func NewHandler(repo Repository) *Handler {
	return &Handler{repo: repo}
}

// Get returns recently brewed coffees with best experiment data for the home page
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	// Parse limit parameter (default 10, max 20)
	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil {
			limit = parsed
		}
	}
	if limit < 1 {
		limit = 1
	}
	if limit > 20 {
		limit = 20
	}

	coffees, err := h.repo.GetRecentCoffees(r.Context(), userID, limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to fetch recent coffees")
		return
	}

	response.JSON(w, http.StatusOK, HomeResponse{
		RecentCoffees: coffees,
	})
}
