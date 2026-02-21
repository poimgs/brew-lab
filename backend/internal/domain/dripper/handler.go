package dripper

import (
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
	sort := r.URL.Query().Get("sort")

	drippers, total, err := h.repo.List(r.Context(), userID, pagination.Page, pagination.PerPage, sort)
	if err != nil {
		log.Printf("error listing drippers: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusOK, api.PaginatedResponse{
		Items: drippers,
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

	d, err := h.repo.GetByID(r.Context(), userID, id)
	if err != nil {
		log.Printf("error getting dripper: %v", err)
		api.InternalError(w)
		return
	}
	if d == nil {
		api.NotFoundError(w, "Dripper not found")
		return
	}

	api.WriteJSON(w, http.StatusOK, d)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req CreateRequest
	if err := api.DecodeJSON(r, &req); err != nil {
		api.ValidationError(w, []api.FieldError{{Field: "body", Message: "Invalid request body"}})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		api.ValidationError(w, []api.FieldError{{Field: "name", Message: "Name is required"}})
		return
	}

	d, err := h.repo.Create(r.Context(), userID, req)
	if err != nil {
		if isDuplicateNameError(err) {
			api.ConflictError(w, "A dripper with this name already exists")
			return
		}
		log.Printf("error creating dripper: %v", err)
		api.InternalError(w)
		return
	}

	api.WriteJSON(w, http.StatusCreated, d)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	var req UpdateRequest
	if err := api.DecodeJSON(r, &req); err != nil {
		api.ValidationError(w, []api.FieldError{{Field: "body", Message: "Invalid request body"}})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		api.ValidationError(w, []api.FieldError{{Field: "name", Message: "Name is required"}})
		return
	}

	d, err := h.repo.Update(r.Context(), userID, id, req)
	if err != nil {
		if isDuplicateNameError(err) {
			api.ConflictError(w, "A dripper with this name already exists")
			return
		}
		log.Printf("error updating dripper: %v", err)
		api.InternalError(w)
		return
	}
	if d == nil {
		api.NotFoundError(w, "Dripper not found")
		return
	}

	api.WriteJSON(w, http.StatusOK, d)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	err := h.repo.SoftDelete(r.Context(), userID, id)
	if err != nil {
		if err == pgx.ErrNoRows {
			api.NotFoundError(w, "Dripper not found")
			return
		}
		log.Printf("error deleting dripper: %v", err)
		api.InternalError(w)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func isDuplicateNameError(err error) bool {
	return strings.Contains(err.Error(), "idx_drippers_user_name")
}
