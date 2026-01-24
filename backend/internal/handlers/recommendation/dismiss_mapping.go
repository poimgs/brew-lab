package recommendation

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
	recommendationservice "github.com/poimgs/coffee-tracker/backend/internal/services/recommendation"
)

type DismissMappingHandler struct {
	svc      *recommendationservice.RecommendationService
	validate *validator.Validate
}

func NewDismissMappingHandler(svc *recommendationservice.RecommendationService, validate *validator.Validate) *DismissMappingHandler {
	return &DismissMappingHandler{svc: svc, validate: validate}
}

func (h *DismissMappingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	var input models.DismissMappingInput
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
			default:
				validationErrors[field] = field + " is invalid"
			}
		}
		response.ValidationError(w, validationErrors)
		return
	}

	err = h.svc.DismissMapping(r.Context(), userID, experimentID, input.MappingID)
	if err != nil {
		if errors.Is(err, recommendationservice.ErrExperimentNotFound) {
			response.NotFound(w, "experiment not found")
			return
		}
		if errors.Is(err, recommendationservice.ErrMappingNotFound) {
			response.NotFound(w, "mapping not found")
			return
		}
		response.InternalServerError(w, "failed to dismiss mapping")
		return
	}

	response.NoContent(w)
}
