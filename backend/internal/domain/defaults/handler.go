package defaults

import (
	"encoding/json"
	"errors"
	"net/http"

	"coffee-tracker/internal/auth"
	"coffee-tracker/internal/response"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	repo Repository
}

func NewHandler(repo Repository) *Handler {
	return &Handler{repo: repo}
}

// GetAll handles GET /api/v1/defaults
// Returns all defaults for the authenticated user as a key-value map
func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	defaults, err := h.repo.GetAll(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get defaults")
		return
	}

	response.JSON(w, http.StatusOK, defaults)
}

// Update handles PUT /api/v1/defaults
// Merges provided defaults with existing ones
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	var input UpdateDefaultsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	// Validate that at least one field is provided
	if len(input) == 0 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "at least one field is required")
		return
	}

	// Validate field names and values
	for fieldName, value := range input {
		if !IsValidField(fieldName) {
			response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid field name: "+fieldName)
			return
		}
		if fieldName == "pour_defaults" {
			if err := ValidatePourDefaults(value); err != nil {
				response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
				return
			}
		}
	}

	defaults, err := h.repo.Upsert(r.Context(), userID, input)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update defaults")
		return
	}

	response.JSON(w, http.StatusOK, defaults)
}

// DeleteField handles DELETE /api/v1/defaults/:field
// Removes a single default value by field name
func (h *Handler) DeleteField(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	fieldName := chi.URLParam(r, "field")
	if fieldName == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "field parameter is required")
		return
	}

	if !IsValidField(fieldName) {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid field name: "+fieldName)
		return
	}

	err := h.repo.DeleteField(r.Context(), userID, fieldName)
	if err != nil {
		if errors.Is(err, ErrDefaultNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "default not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to delete default")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
