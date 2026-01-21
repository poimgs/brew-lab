package coffee

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/coffee"
)

type GetHandler struct {
	coffeeSvc *coffee.CoffeeService
}

func NewGetHandler(coffeeSvc *coffee.CoffeeService) *GetHandler {
	return &GetHandler{coffeeSvc: coffeeSvc}
}

func (h *GetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	coffeeResp, err := h.coffeeSvc.GetByID(r.Context(), userID, coffeeID)
	if err != nil {
		if errors.Is(err, repository.ErrCoffeeNotFound) {
			response.NotFound(w, "coffee not found")
			return
		}
		response.InternalServerError(w, "failed to get coffee")
		return
	}

	response.OK(w, coffeeResp)
}
