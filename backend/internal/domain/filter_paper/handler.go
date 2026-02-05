package filter_paper

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

	params := ListFilterPapersParams{
		Page:    parseIntOrDefault(r.URL.Query().Get("page"), 1),
		PerPage: parseIntOrDefault(r.URL.Query().Get("per_page"), 20),
		Sort:    r.URL.Query().Get("sort"),
	}

	result, err := h.repo.List(r.Context(), userID, params)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list filter papers")
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

	var input CreateFilterPaperInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	if input.Name == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "name is required")
		return
	}

	fp, err := h.repo.Create(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, ErrFilterPaperDuplicate) {
			response.Error(w, http.StatusConflict, "CONFLICT", "filter paper with this name already exists")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create filter paper")
		return
	}

	response.JSON(w, http.StatusCreated, fp)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	filterPaperID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid filter paper id")
		return
	}

	fp, err := h.repo.GetByID(r.Context(), userID, filterPaperID)
	if err != nil {
		if errors.Is(err, ErrFilterPaperNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "filter paper not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get filter paper")
		return
	}

	response.JSON(w, http.StatusOK, fp)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	filterPaperID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid filter paper id")
		return
	}

	var input UpdateFilterPaperInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	// Validate name is not empty if provided
	if input.Name != nil && *input.Name == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "name cannot be empty")
		return
	}

	fp, err := h.repo.Update(r.Context(), userID, filterPaperID, input)
	if err != nil {
		if errors.Is(err, ErrFilterPaperNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "filter paper not found")
			return
		}
		if errors.Is(err, ErrFilterPaperDuplicate) {
			response.Error(w, http.StatusConflict, "CONFLICT", "filter paper with this name already exists")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update filter paper")
		return
	}

	response.JSON(w, http.StatusOK, fp)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	filterPaperID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid filter paper id")
		return
	}

	err = h.repo.Delete(r.Context(), userID, filterPaperID)
	if err != nil {
		if errors.Is(err, ErrFilterPaperNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "filter paper not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to delete filter paper")
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
