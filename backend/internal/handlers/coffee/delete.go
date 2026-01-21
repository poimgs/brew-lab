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

type DeleteHandler struct {
	coffeeSvc *coffee.CoffeeService
}

func NewDeleteHandler(coffeeSvc *coffee.CoffeeService) *DeleteHandler {
	return &DeleteHandler{coffeeSvc: coffeeSvc}
}

func (h *DeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	cascade := r.URL.Query().Get("cascade") == "true"

	err = h.coffeeSvc.Delete(r.Context(), userID, coffeeID, cascade)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrCoffeeNotFound):
			response.NotFound(w, "coffee not found")
		case errors.Is(err, coffee.ErrCoffeeHasExperiments):
			response.Conflict(w, "coffee has associated experiments, use cascade=true to delete")
		default:
			response.InternalServerError(w, "failed to delete coffee")
		}
		return
	}

	response.NoContent(w)
}
