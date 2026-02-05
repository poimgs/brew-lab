package mineral_profile

import (
	"errors"
	"net/http"

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
	result, err := h.repo.List(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list mineral profiles")
		return
	}

	response.JSON(w, http.StatusOK, result)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	profileID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid mineral profile id")
		return
	}

	mp, err := h.repo.GetByID(r.Context(), profileID)
	if err != nil {
		if errors.Is(err, ErrMineralProfileNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "mineral profile not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get mineral profile")
		return
	}

	response.JSON(w, http.StatusOK, mp)
}
