package coffee

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/coffee"
)

type CreateHandler struct {
	coffeeSvc *coffee.CoffeeService
	validate  *validator.Validate
}

func NewCreateHandler(coffeeSvc *coffee.CoffeeService, validate *validator.Validate) *CreateHandler {
	return &CreateHandler{
		coffeeSvc: coffeeSvc,
		validate:  validate,
	}
}

func (h *CreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	var input coffee.CreateCoffeeInput
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
			default:
				validationErrors[field] = "invalid " + field
			}
		}
		response.ValidationError(w, validationErrors)
		return
	}

	created, err := h.coffeeSvc.Create(r.Context(), userID, &input)
	if err != nil {
		switch {
		case errors.Is(err, coffee.ErrRoasterRequired):
			response.BadRequest(w, "roaster is required")
		case errors.Is(err, coffee.ErrNameRequired):
			response.BadRequest(w, "name is required")
		case errors.Is(err, coffee.ErrInvalidRoastLevel):
			response.BadRequest(w, "invalid roast level")
		case errors.Is(err, coffee.ErrRoastDateInFuture):
			response.BadRequest(w, "roast date cannot be in the future")
		case errors.Is(err, coffee.ErrPurchaseBeforeRoast):
			response.BadRequest(w, "purchase date cannot be before roast date")
		default:
			response.InternalServerError(w, "failed to create coffee")
		}
		return
	}

	response.Created(w, created)
}
