package effectmapping

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
	"github.com/poimgs/coffee-tracker/backend/internal/services/effectmapping"
)

type UpdateHandler struct {
	svc      *effectmapping.EffectMappingService
	validate *validator.Validate
}

func NewUpdateHandler(svc *effectmapping.EffectMappingService, validate *validator.Validate) *UpdateHandler {
	return &UpdateHandler{
		svc:      svc,
		validate: validate,
	}
}

func (h *UpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	mappingIDStr := chi.URLParam(r, "id")
	mappingID, err := uuid.Parse(mappingIDStr)
	if err != nil {
		response.BadRequest(w, "invalid effect mapping ID")
		return
	}

	var input models.UpdateEffectMappingInput
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
			case "min":
				validationErrors[field] = field + " requires at least one item"
			default:
				validationErrors[field] = "invalid " + field
			}
		}
		response.ValidationError(w, validationErrors)
		return
	}

	updated, err := h.svc.Update(r.Context(), userID, mappingID, &input)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrEffectMappingNotFound):
			response.NotFound(w, "effect mapping not found")
		case errors.Is(err, effectmapping.ErrNameRequired):
			response.BadRequest(w, "name is required")
		case errors.Is(err, effectmapping.ErrInvalidVariable):
			response.BadRequest(w, "invalid input variable")
		case errors.Is(err, effectmapping.ErrInvalidDirection):
			response.BadRequest(w, "invalid direction")
		case errors.Is(err, effectmapping.ErrTickDescriptionRequired):
			response.BadRequest(w, "tick description is required")
		case errors.Is(err, effectmapping.ErrEffectsRequired):
			response.BadRequest(w, "at least one effect is required")
		case errors.Is(err, effectmapping.ErrInvalidOutputVariable):
			response.BadRequest(w, "invalid output variable")
		case errors.Is(err, effectmapping.ErrInvalidEffectDirection):
			response.BadRequest(w, "invalid effect direction")
		case errors.Is(err, effectmapping.ErrInvalidConfidence):
			response.BadRequest(w, "invalid confidence level")
		case errors.Is(err, effectmapping.ErrInvalidRange):
			response.BadRequest(w, "range_min must be less than or equal to range_max")
		default:
			response.InternalServerError(w, "failed to update effect mapping")
		}
		return
	}

	response.OK(w, updated)
}
