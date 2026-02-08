package defaults

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"github.com/poimgs/coffee-tracker/backend/internal/api"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
)

type Handler struct {
	repo Repository
}

func NewHandler(repo Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	defaults, err := h.repo.Get(r.Context(), userID)
	if err != nil {
		log.Printf("error getting defaults: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusOK, defaults)
}

func (h *Handler) Put(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req UpdateRequest
	if err := api.DecodeJSON(r, &req); err != nil {
		api.ValidationError(w, []api.FieldError{{Field: "body", Message: "Invalid request body"}})
		return
	}

	// Validate pour_defaults: pour_number must be >= 1
	for i, pd := range req.PourDefaults {
		if pd.PourNumber < 1 {
			api.ValidationError(w, []api.FieldError{{
				Field:   "pour_defaults",
				Message: "pour_number must be >= 1",
			}})
			return
		}
		// Validate pour_style if provided
		if pd.PourStyle != nil && *pd.PourStyle != "circular" && *pd.PourStyle != "center" {
			api.ValidationError(w, []api.FieldError{{
				Field:   "pour_defaults",
				Message: "pour_style must be 'circular' or 'center'",
			}})
			return
		}
		// Ensure pour numbers are sequential starting from 1
		if pd.PourNumber != i+1 {
			api.ValidationError(w, []api.FieldError{{
				Field:   "pour_defaults",
				Message: "pour_number must be sequential starting from 1",
			}})
			return
		}
	}

	defaults, err := h.repo.Put(r.Context(), userID, req)
	if err != nil {
		log.Printf("error updating defaults: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusOK, defaults)
}

func (h *Handler) DeleteField(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	field := chi.URLParam(r, "field")

	if !IsValidFieldName(field) {
		api.NotFoundError(w, "Unknown default field")
		return
	}

	err := h.repo.DeleteField(r.Context(), userID, field)
	if err != nil {
		if err == pgx.ErrNoRows {
			api.NotFoundError(w, "Default not set")
			return
		}
		log.Printf("error deleting default field: %v", err)
		api.InternalError(w)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
