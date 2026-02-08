package brew

import (
	"log"
	"net/http"
	"strconv"
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
		Page:     pagination.Page,
		PerPage:  pagination.PerPage,
		Sort:     q.Get("sort"),
		CoffeeID: q.Get("coffee_id"),
		DateFrom: nilIfEmpty(q.Get("date_from")),
		DateTo:   nilIfEmpty(q.Get("date_to")),
	}

	if v := q.Get("score_gte"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			params.ScoreGTE = &n
		}
	}
	if v := q.Get("score_lte"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			params.ScoreLTE = &n
		}
	}
	if v := q.Get("has_tds"); v != "" {
		b := v == "true"
		params.HasTDS = &b
	}

	brews, total, err := h.repo.List(r.Context(), userID, params)
	if err != nil {
		log.Printf("error listing brews: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusOK, api.PaginatedResponse{
		Items: brews,
		Pagination: api.PaginationMeta{
			Page:       pagination.Page,
			PerPage:    pagination.PerPage,
			Total:      total,
			TotalPages: api.TotalPages(total, pagination.PerPage),
		},
	})
}

func (h *Handler) ListByCoffee(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	coffeeID := chi.URLParam(r, "id")
	pagination := api.ParsePagination(r)
	q := r.URL.Query()

	params := ListParams{
		Page:     pagination.Page,
		PerPage:  pagination.PerPage,
		Sort:     q.Get("sort"),
		CoffeeID: coffeeID,
		DateFrom: nilIfEmpty(q.Get("date_from")),
		DateTo:   nilIfEmpty(q.Get("date_to")),
	}

	if v := q.Get("score_gte"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			params.ScoreGTE = &n
		}
	}
	if v := q.Get("score_lte"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			params.ScoreLTE = &n
		}
	}
	if v := q.Get("has_tds"); v != "" {
		b := v == "true"
		params.HasTDS = &b
	}

	brews, total, err := h.repo.List(r.Context(), userID, params)
	if err != nil {
		log.Printf("error listing coffee brews: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusOK, api.PaginatedResponse{
		Items: brews,
		Pagination: api.PaginationMeta{
			Page:       pagination.Page,
			PerPage:    pagination.PerPage,
			Total:      total,
			TotalPages: api.TotalPages(total, pagination.PerPage),
		},
	})
}

func (h *Handler) Recent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	limit := 5
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > 20 {
		limit = 20
	}

	brews, err := h.repo.Recent(r.Context(), userID, limit)
	if err != nil {
		log.Printf("error getting recent brews: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"items": brews,
	})
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	brew, err := h.repo.GetByID(r.Context(), userID, id)
	if err != nil {
		log.Printf("error getting brew: %v", err)
		api.InternalError(w)
		return
	}
	if brew == nil {
		api.NotFoundError(w, "Brew not found")
		return
	}

	api.WriteJSON(w, http.StatusOK, brew)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req CreateRequest
	if err := api.DecodeJSON(r, &req); err != nil {
		api.ValidationError(w, []api.FieldError{{Field: "body", Message: "Invalid request body"}})
		return
	}

	req.CoffeeID = strings.TrimSpace(req.CoffeeID)
	if req.CoffeeID == "" {
		api.ValidationError(w, []api.FieldError{{Field: "coffee_id", Message: "Coffee is required"}})
		return
	}

	brew, err := h.repo.Create(r.Context(), userID, req)
	if err != nil {
		if isCoffeeNotFoundError(err) {
			api.NotFoundError(w, "Coffee not found")
			return
		}
		log.Printf("error creating brew: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusCreated, brew)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	var req UpdateRequest
	if err := api.DecodeJSON(r, &req); err != nil {
		api.ValidationError(w, []api.FieldError{{Field: "body", Message: "Invalid request body"}})
		return
	}

	req.CoffeeID = strings.TrimSpace(req.CoffeeID)
	if req.CoffeeID == "" {
		api.ValidationError(w, []api.FieldError{{Field: "coffee_id", Message: "Coffee is required"}})
		return
	}

	brew, err := h.repo.Update(r.Context(), userID, id, req)
	if err != nil {
		log.Printf("error updating brew: %v", err)
		api.InternalError(w)
		return
	}
	if brew == nil {
		api.NotFoundError(w, "Brew not found")
		return
	}

	api.WriteJSON(w, http.StatusOK, brew)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	err := h.repo.Delete(r.Context(), userID, id)
	if err != nil {
		if err == pgx.ErrNoRows {
			api.NotFoundError(w, "Brew not found")
			return
		}
		log.Printf("error deleting brew: %v", err)
		api.InternalError(w)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetReference(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	coffeeID := chi.URLParam(r, "id")

	brew, source, err := h.repo.GetReference(r.Context(), userID, coffeeID)
	if err != nil {
		if isCoffeeNotFoundError(err) {
			api.NotFoundError(w, "Coffee not found")
			return
		}
		log.Printf("error getting reference: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusOK, ReferenceResponse{
		Brew:   brew,
		Source: source,
	})
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func isCoffeeNotFoundError(err error) bool {
	return strings.Contains(err.Error(), "coffee not found")
}
