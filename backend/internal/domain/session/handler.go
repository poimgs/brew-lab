package session

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

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

	coffeeIDStr := r.URL.Query().Get("coffee_id")
	if coffeeIDStr == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "coffee_id is required")
		return
	}

	coffeeID, err := uuid.Parse(coffeeIDStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid coffee_id")
		return
	}

	params := ListSessionsParams{
		CoffeeID: coffeeID,
		Page:     parseIntOrDefault(r.URL.Query().Get("page"), 1),
		PerPage:  parseIntOrDefault(r.URL.Query().Get("per_page"), 20),
	}

	result, err := h.repo.List(r.Context(), userID, params)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list sessions")
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

	var input CreateSessionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	if input.CoffeeID == uuid.Nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "coffee_id is required")
		return
	}
	if input.Name == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "name is required")
		return
	}
	if len(input.Name) > 255 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "name must be at most 255 characters")
		return
	}
	if input.VariableTested == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "variable_tested is required")
		return
	}
	if len(input.VariableTested) > 255 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "variable_tested must be at most 255 characters")
		return
	}

	session, err := h.repo.Create(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, ErrCoffeeNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "coffee not found")
			return
		}
		if errors.Is(err, ErrBrewNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "brew not found")
			return
		}
		if errors.Is(err, ErrBrewWrongCoffee) {
			response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "brew does not belong to this coffee")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create session")
		return
	}

	response.JSON(w, http.StatusCreated, session)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid session id")
		return
	}

	session, err := h.repo.GetByID(r.Context(), userID, sessionID)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "session not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get session")
		return
	}

	response.JSON(w, http.StatusOK, session)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid session id")
		return
	}

	var input UpdateSessionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	if input.Name != nil && len(*input.Name) > 255 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "name must be at most 255 characters")
		return
	}
	if input.VariableTested != nil && len(*input.VariableTested) > 255 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "variable_tested must be at most 255 characters")
		return
	}

	session, err := h.repo.Update(r.Context(), userID, sessionID, input)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "session not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update session")
		return
	}

	response.JSON(w, http.StatusOK, session)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid session id")
		return
	}

	err = h.repo.Delete(r.Context(), userID, sessionID)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "session not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to delete session")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) LinkBrews(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid session id")
		return
	}

	var input LinkBrewsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	if len(input.BrewIDs) == 0 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "brew_ids is required")
		return
	}

	session, err := h.repo.LinkBrews(r.Context(), userID, sessionID, input.BrewIDs)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "session not found")
			return
		}
		if errors.Is(err, ErrBrewNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "brew not found")
			return
		}
		if errors.Is(err, ErrBrewWrongCoffee) {
			response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "brew does not belong to this coffee")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to link brews")
		return
	}

	response.JSON(w, http.StatusOK, session)
}

func (h *Handler) UnlinkBrew(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid session id")
		return
	}

	brewID, err := uuid.Parse(chi.URLParam(r, "brewId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid brew id")
		return
	}

	err = h.repo.UnlinkBrew(r.Context(), userID, sessionID, brewID)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "session not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to unlink brew")
		return
	}

	w.WriteHeader(http.StatusNoContent)
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
