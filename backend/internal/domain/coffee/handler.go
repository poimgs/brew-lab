package coffee

import (
	"fmt"
	"log"
	"net/http"
	"strings"

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

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	pagination := api.ParsePagination(r)
	q := r.URL.Query()

	params := ListParams{
		Page:         pagination.Page,
		PerPage:      pagination.PerPage,
		Search:       q.Get("search"),
		Roaster:      q.Get("roaster"),
		Country:      q.Get("country"),
		Process:      q.Get("process"),
		ArchivedOnly: q.Get("archived_only") == "true",
	}

	coffees, total, err := h.repo.List(r.Context(), userID, params)
	if err != nil {
		log.Printf("error listing coffees: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusOK, api.PaginatedResponse{
		Items: coffees,
		Pagination: api.PaginationMeta{
			Page:       pagination.Page,
			PerPage:    pagination.PerPage,
			Total:      total,
			TotalPages: api.TotalPages(total, pagination.PerPage),
		},
	})
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	coffee, err := h.repo.GetByID(r.Context(), userID, id)
	if err != nil {
		log.Printf("error getting coffee: %v", err)
		api.InternalError(w)
		return
	}
	if coffee == nil {
		api.NotFoundError(w, "Coffee not found")
		return
	}

	api.WriteJSON(w, http.StatusOK, coffee)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req CreateRequest
	if err := api.DecodeJSON(r, &req); err != nil {
		api.ValidationError(w, []api.FieldError{{Field: "body", Message: "Invalid request body"}})
		return
	}

	req.Roaster = strings.TrimSpace(req.Roaster)
	req.Name = strings.TrimSpace(req.Name)

	var fieldErrors []api.FieldError
	if req.Roaster == "" {
		fieldErrors = append(fieldErrors, api.FieldError{Field: "roaster", Message: "Roaster is required"})
	}
	if req.Name == "" {
		fieldErrors = append(fieldErrors, api.FieldError{Field: "name", Message: "Name is required"})
	}
	if len(fieldErrors) > 0 {
		api.ValidationError(w, fieldErrors)
		return
	}

	coffee, err := h.repo.Create(r.Context(), userID, req)
	if err != nil {
		log.Printf("error creating coffee: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusCreated, coffee)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	var req UpdateRequest
	if err := api.DecodeJSON(r, &req); err != nil {
		api.ValidationError(w, []api.FieldError{{Field: "body", Message: "Invalid request body"}})
		return
	}

	req.Roaster = strings.TrimSpace(req.Roaster)
	req.Name = strings.TrimSpace(req.Name)

	var fieldErrors []api.FieldError
	if req.Roaster == "" {
		fieldErrors = append(fieldErrors, api.FieldError{Field: "roaster", Message: "Roaster is required"})
	}
	if req.Name == "" {
		fieldErrors = append(fieldErrors, api.FieldError{Field: "name", Message: "Name is required"})
	}
	if len(fieldErrors) > 0 {
		api.ValidationError(w, fieldErrors)
		return
	}

	coffee, err := h.repo.Update(r.Context(), userID, id, req)
	if err != nil {
		log.Printf("error updating coffee: %v", err)
		api.InternalError(w)
		return
	}
	if coffee == nil {
		api.NotFoundError(w, "Coffee not found")
		return
	}

	api.WriteJSON(w, http.StatusOK, coffee)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	err := h.repo.Delete(r.Context(), userID, id)
	if err != nil {
		if err == pgx.ErrNoRows {
			api.NotFoundError(w, "Coffee not found")
			return
		}
		log.Printf("error deleting coffee: %v", err)
		api.InternalError(w)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Archive(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	coffee, err := h.repo.Archive(r.Context(), userID, id)
	if err != nil {
		log.Printf("error archiving coffee: %v", err)
		api.InternalError(w)
		return
	}
	if coffee == nil {
		api.NotFoundError(w, "Coffee not found or already archived")
		return
	}

	api.WriteJSON(w, http.StatusOK, coffee)
}

func (h *Handler) Unarchive(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	coffee, err := h.repo.Unarchive(r.Context(), userID, id)
	if err != nil {
		log.Printf("error unarchiving coffee: %v", err)
		api.InternalError(w)
		return
	}
	if coffee == nil {
		api.NotFoundError(w, "Coffee not found or not archived")
		return
	}

	api.WriteJSON(w, http.StatusOK, coffee)
}

func (h *Handler) SetReferenceBrew(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	var req SetReferenceRequest
	if err := api.DecodeJSON(r, &req); err != nil {
		api.ValidationError(w, []api.FieldError{{Field: "body", Message: "Invalid request body"}})
		return
	}

	coffee, err := h.repo.SetReferenceBrew(r.Context(), userID, id, req.BrewID)
	if err != nil {
		if isInvalidBrewError(err) {
			api.ValidationError(w, []api.FieldError{{Field: "brew_id", Message: "Brew does not belong to this coffee"}})
			return
		}
		log.Printf("error setting reference brew: %v", err)
		api.InternalError(w)
		return
	}
	if coffee == nil {
		api.NotFoundError(w, "Coffee not found")
		return
	}

	api.WriteJSON(w, http.StatusOK, coffee)
}

func (h *Handler) Suggestions(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	field := r.URL.Query().Get("field")
	query := r.URL.Query().Get("q")

	if field == "" {
		api.ValidationError(w, []api.FieldError{{Field: "field", Message: "Field parameter is required"}})
		return
	}

	validFields := map[string]bool{"roaster": true, "country": true, "process": true}
	if !validFields[field] {
		api.ValidationError(w, []api.FieldError{{Field: "field", Message: fmt.Sprintf("Invalid field: %s. Supported: roaster, country, process", field)}})
		return
	}

	items, err := h.repo.Suggestions(r.Context(), userID, field, query)
	if err != nil {
		log.Printf("error getting suggestions: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusOK, SuggestionsResponse{Items: items})
}

func isInvalidBrewError(err error) bool {
	return strings.Contains(err.Error(), "brew does not belong to this coffee")
}
