package coffee

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

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

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	params := ListCoffeesParams{
		Page:            parseIntOrDefault(r.URL.Query().Get("page"), 1),
		PerPage:         parseIntOrDefault(r.URL.Query().Get("per_page"), 20),
		Roaster:         r.URL.Query().Get("roaster"),
		Country:         r.URL.Query().Get("country"),
		Process:         r.URL.Query().Get("process"),
		Search:          r.URL.Query().Get("search"),
		IncludeArchived: r.URL.Query().Get("include_archived") == "true",
		ArchivedOnly:    r.URL.Query().Get("archived_only") == "true",
		IncludeDeleted:  r.URL.Query().Get("include_deleted") == "true",
	}

	result, err := h.repo.List(r.Context(), userID, params)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list coffees")
		return
	}

	response.JSON(w, http.StatusOK, result)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	var input CreateCoffeeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	if input.Roaster == "" || input.Name == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "roaster and name are required")
		return
	}

	// Validate roast_date is not in the future
	if input.RoastDate != nil && input.RoastDate.After(time.Now()) {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "roast date cannot be in the future")
		return
	}

	coffee, err := h.repo.Create(r.Context(), userID, input)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create coffee")
		return
	}

	response.JSON(w, http.StatusCreated, coffee)
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

	coffee, err := h.repo.GetByID(r.Context(), userID, coffeeID)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get coffee")
		return
	}

	response.JSON(w, http.StatusOK, coffee)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
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

	var input UpdateCoffeeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	// Validate roast_date is not in the future
	if input.RoastDate != nil && input.RoastDate.After(time.Now()) {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "roast date cannot be in the future")
		return
	}

	coffee, err := h.repo.Update(r.Context(), userID, coffeeID, input)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update coffee")
		return
	}

	response.JSON(w, http.StatusOK, coffee)
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
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to delete coffee")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Archive(w http.ResponseWriter, r *http.Request) {
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

	coffee, err := h.repo.Archive(r.Context(), userID, coffeeID)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to archive coffee")
		return
	}

	response.JSON(w, http.StatusOK, coffee)
}

func (h *Handler) Unarchive(w http.ResponseWriter, r *http.Request) {
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

	coffee, err := h.repo.Unarchive(r.Context(), userID, coffeeID)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to unarchive coffee")
		return
	}

	response.JSON(w, http.StatusOK, coffee)
}

func (h *Handler) Suggestions(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	field := r.URL.Query().Get("field")
	query := r.URL.Query().Get("q")

	if field == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "field parameter is required")
		return
	}

	suggestions, err := h.repo.GetSuggestions(r.Context(), userID, field, query)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get suggestions")
		return
	}

	response.JSON(w, http.StatusOK, map[string][]string{"items": suggestions})
}

func (h *Handler) SetBestExperiment(w http.ResponseWriter, r *http.Request) {
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

	var input SetBestExperimentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	coffee, err := h.repo.SetBestExperiment(r.Context(), userID, coffeeID, input.ExperimentID)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		if errors.Is(err, ErrExperimentNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "experiment not found")
			return
		}
		if errors.Is(err, ErrExperimentWrongCoffee) {
			response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "experiment does not belong to this coffee")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to set best experiment")
		return
	}

	response.JSON(w, http.StatusOK, coffee)
}

func (h *Handler) GetReference(w http.ResponseWriter, r *http.Request) {
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

	reference, err := h.repo.GetReference(r.Context(), userID, coffeeID)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get reference")
		return
	}

	response.JSON(w, http.StatusOK, reference)
}

func parseIntOrDefault(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	return val
}
