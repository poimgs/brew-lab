package coffee_goal

import (
	"encoding/json"
	"errors"
	"net/http"

	"coffee-tracker/internal/auth"
	"coffee-tracker/internal/response"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Handler struct {
	repo Repository
}

func NewHandler(repo Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	coffeeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid coffee id")
		return
	}

	goal, err := h.repo.GetByCoffeeID(r.Context(), userID, coffeeID)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		if errors.Is(err, ErrCoffeeGoalNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "goals not found for this coffee")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get goals")
		return
	}

	response.JSON(w, http.StatusOK, goal)
}

func (h *Handler) Upsert(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	coffeeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid coffee id")
		return
	}

	var input UpsertInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	// Validate intensity fields
	intensityFields := map[string]*int{
		"aroma_intensity":      input.AromaIntensity,
		"acidity_intensity":    input.AcidityIntensity,
		"sweetness_intensity":  input.SweetnessIntensity,
		"bitterness_intensity": input.BitternessIntensity,
		"body_weight":          input.BodyWeight,
		"flavor_intensity":     input.FlavorIntensity,
		"aftertaste_duration":  input.AftertasteDuration,
		"aftertaste_intensity": input.AftertasteIntensity,
		"overall_score":        input.OverallScore,
	}

	for field, value := range intensityFields {
		if err := ValidateIntensity(value, field); err != nil {
			response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			return
		}
	}

	goal, err := h.repo.Upsert(r.Context(), userID, coffeeID, input)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to save goals")
		return
	}

	response.JSON(w, http.StatusOK, goal)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	coffeeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid coffee id")
		return
	}

	err = h.repo.Delete(r.Context(), userID, coffeeID)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		if errors.Is(err, ErrCoffeeGoalNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "goals not found for this coffee")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to delete goals")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
