package experiments

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/experiment"
)

type UpdateHandler struct {
	experimentSvc *experiment.ExperimentService
	validate      *validator.Validate
}

func NewUpdateHandler(experimentSvc *experiment.ExperimentService, validate *validator.Validate) *UpdateHandler {
	return &UpdateHandler{
		experimentSvc: experimentSvc,
		validate:      validate,
	}
}

func (h *UpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	experimentIDStr := chi.URLParam(r, "id")
	experimentID, err := uuid.Parse(experimentIDStr)
	if err != nil {
		response.BadRequest(w, "invalid experiment ID")
		return
	}

	var input models.UpdateExperimentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validate.Struct(input); err != nil {
		validationErrors := make(map[string]string)
		for _, err := range err.(validator.ValidationErrors) {
			field := err.Field()
			switch err.Tag() {
			case "min":
				validationErrors[field] = field + " is too short"
			case "max":
				validationErrors[field] = field + " is too long"
			case "gt":
				validationErrors[field] = field + " must be greater than 0"
			default:
				validationErrors[field] = "invalid " + field
			}
		}
		response.ValidationError(w, validationErrors)
		return
	}

	updated, err := h.experimentSvc.Update(r.Context(), userID, experimentID, &input)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrExperimentNotFound):
			response.NotFound(w, "experiment not found")
		case errors.Is(err, experiment.ErrOverallNotesTooShort):
			response.BadRequest(w, "overall notes must be at least 10 characters")
		case errors.Is(err, experiment.ErrInvalidScore):
			response.BadRequest(w, "score must be between 1 and 10")
		case errors.Is(err, experiment.ErrCoffeeNotFound):
			response.BadRequest(w, "coffee not found")
		default:
			response.InternalServerError(w, "failed to update experiment")
		}
		return
	}

	response.OK(w, updated)
}
