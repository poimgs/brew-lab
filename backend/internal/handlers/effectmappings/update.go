package effectmappings

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/effectmapping"
)

type UpdateHandler struct {
	svc      *effectmapping.EffectMappingService
	validate *validator.Validate
}

func NewUpdateHandler(svc *effectmapping.EffectMappingService, validate *validator.Validate) *UpdateHandler {
	return &UpdateHandler{svc: svc, validate: validate}
}

func (h *UpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid mapping ID")
		return
	}

	var input effectmapping.UpdateEffectMappingInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validate.Struct(input); err != nil {
		validationErrors := make(map[string]string)
		for _, err := range err.(validator.ValidationErrors) {
			field := err.Field()
			switch err.Tag() {
			case "required":
				validationErrors[field] = field + " is required"
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

	updated, err := h.svc.Update(r.Context(), userID, id, &input)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrEffectMappingNotFound):
			response.NotFound(w, "effect mapping not found")
		case errors.Is(err, effectmapping.ErrInvalidVariable):
			response.BadRequest(w, "invalid variable")
		case errors.Is(err, effectmapping.ErrInvalidDirection):
			response.BadRequest(w, "invalid direction")
		case errors.Is(err, effectmapping.ErrInvalidOutputVariable):
			response.BadRequest(w, "invalid output variable in effects")
		case errors.Is(err, effectmapping.ErrInvalidEffectDirection):
			response.BadRequest(w, "invalid effect direction")
		case errors.Is(err, effectmapping.ErrInvalidConfidence):
			response.BadRequest(w, "invalid confidence level")
		default:
			response.InternalServerError(w, "failed to update effect mapping")
		}
		return
	}

	response.OK(w, updated)
}
