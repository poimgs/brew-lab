package coffee

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
	"github.com/poimgs/coffee-tracker/backend/internal/services/coffee"
)

type UpdateHandler struct {
	coffeeSvc *coffee.CoffeeService
	validate  *validator.Validate
}

func NewUpdateHandler(coffeeSvc *coffee.CoffeeService, validate *validator.Validate) *UpdateHandler {
	return &UpdateHandler{
		coffeeSvc: coffeeSvc,
		validate:  validate,
	}
}

func (h *UpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	coffeeIDStr := chi.URLParam(r, "id")
	coffeeID, err := uuid.Parse(coffeeIDStr)
	if err != nil {
		response.BadRequest(w, "invalid coffee ID")
		return
	}

	var input coffee.UpdateCoffeeInput
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

	updated, err := h.coffeeSvc.Update(r.Context(), userID, coffeeID, &input)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrCoffeeNotFound):
			response.NotFound(w, "coffee not found")
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
			response.InternalServerError(w, "failed to update coffee")
		}
		return
	}

	response.OK(w, updated)
}
