package filterpaper

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/filterpaper"
)

type UpdateHandler struct {
	filterPaperSvc *filterpaper.FilterPaperService
	validate       *validator.Validate
}

func NewUpdateHandler(filterPaperSvc *filterpaper.FilterPaperService, validate *validator.Validate) *UpdateHandler {
	return &UpdateHandler{
		filterPaperSvc: filterPaperSvc,
		validate:       validate,
	}
}

func (h *UpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	idStr := chi.URLParam(r, "id")
	filterPaperID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid filter paper ID")
		return
	}

	var input models.UpdateFilterPaperInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validate.Struct(input); err != nil {
		validationErrors := make(map[string]string)
		for _, err := range err.(validator.ValidationErrors) {
			field := err.Field()
			switch err.Tag() {
			case "max":
				validationErrors[field] = field + " is too long"
			default:
				validationErrors[field] = "invalid " + field
			}
		}
		response.ValidationError(w, validationErrors)
		return
	}

	updated, err := h.filterPaperSvc.Update(r.Context(), userID, filterPaperID, input)
	if err != nil {
		switch {
		case errors.Is(err, filterpaper.ErrNotFound):
			response.NotFound(w, "filter paper not found")
		case errors.Is(err, filterpaper.ErrNameRequired):
			response.BadRequest(w, "name is required")
		case errors.Is(err, filterpaper.ErrNameTooLong):
			response.BadRequest(w, "name must be 100 characters or less")
		case errors.Is(err, filterpaper.ErrNameExists):
			response.Conflict(w, "a filter paper with this name already exists")
		default:
			response.InternalServerError(w, "failed to update filter paper")
		}
		return
	}

	response.OK(w, updated)
}
