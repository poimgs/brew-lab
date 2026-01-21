package defaults

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/defaults"
)

type UpdateHandler struct {
	defaultsSvc *defaults.DefaultsService
	validate    *validator.Validate
}

func NewUpdateHandler(defaultsSvc *defaults.DefaultsService, validate *validator.Validate) *UpdateHandler {
	return &UpdateHandler{
		defaultsSvc: defaultsSvc,
		validate:    validate,
	}
}

func (h *UpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	var input models.SetUserDefaultsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if len(input.Defaults) == 0 {
		response.BadRequest(w, "defaults is required")
		return
	}

	result, err := h.defaultsSvc.Set(r.Context(), userID, &input)
	if err != nil {
		switch {
		case errors.Is(err, defaults.ErrInvalidFieldName):
			response.BadRequest(w, "invalid field name")
		case errors.Is(err, defaults.ErrFieldValueEmpty):
			response.BadRequest(w, "field value cannot be empty")
		default:
			response.InternalServerError(w, "failed to update defaults")
		}
		return
	}

	response.OK(w, result)
}
