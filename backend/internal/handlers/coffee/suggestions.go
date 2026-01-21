package coffee

import (
	"net/http"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/coffee"
)

type SuggestionsHandler struct {
	coffeeSvc *coffee.CoffeeService
}

func NewSuggestionsHandler(coffeeSvc *coffee.CoffeeService) *SuggestionsHandler {
	return &SuggestionsHandler{coffeeSvc: coffeeSvc}
}

type SuggestionsResponse struct {
	Suggestions []string `json:"suggestions"`
}

func (h *SuggestionsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	field := r.URL.Query().Get("field")
	if field == "" {
		response.BadRequest(w, "field parameter is required")
		return
	}

	query := r.URL.Query().Get("q")

	suggestions, err := h.coffeeSvc.GetSuggestions(r.Context(), userID, field, query)
	if err != nil {
		if err.Error() == "invalid field: "+field {
			response.BadRequest(w, "invalid field parameter")
			return
		}
		response.InternalServerError(w, "failed to get suggestions")
		return
	}

	if suggestions == nil {
		suggestions = []string{}
	}

	response.OK(w, SuggestionsResponse{Suggestions: suggestions})
}
