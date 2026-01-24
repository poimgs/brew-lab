package effectmapping

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/effectmapping"
)

type RelevantHandler struct {
	svc      *effectmapping.EffectMappingService
	validate *validator.Validate
}

func NewRelevantHandler(svc *effectmapping.EffectMappingService, validate *validator.Validate) *RelevantHandler {
	return &RelevantHandler{
		svc:      svc,
		validate: validate,
	}
}

func (h *RelevantHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	var input models.FindRelevantInput
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
			case "min":
				if field == "Gaps" {
					validationErrors[field] = "at least one gap is required"
				} else {
					validationErrors[field] = field + " must be at least 0"
				}
			case "max":
				validationErrors[field] = field + " must be at most 10"
			default:
				validationErrors[field] = "invalid " + field
			}
		}
		response.ValidationError(w, validationErrors)
		return
	}

	result, err := h.svc.FindRelevant(r.Context(), userID, &input)
	if err != nil {
		switch {
		case errors.Is(err, effectmapping.ErrInvalidOutputVariable):
			response.BadRequest(w, "invalid output variable in gaps")
		default:
			response.InternalServerError(w, "failed to find relevant mappings")
		}
		return
	}

	response.OK(w, result)
}
