package coffee

import (
	"net/http"
	"strconv"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/coffee"
)

type ListHandler struct {
	coffeeSvc *coffee.CoffeeService
}

func NewListHandler(coffeeSvc *coffee.CoffeeService) *ListHandler {
	return &ListHandler{coffeeSvc: coffeeSvc}
}

func (h *ListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	query := r.URL.Query()

	input := &coffee.ListCoffeesInput{
		SortBy:  query.Get("sort_by"),
		SortDir: query.Get("sort_dir"),
		Page:    1,
		PageSize: 20,
	}

	if roaster := query.Get("roaster"); roaster != "" {
		input.Roaster = &roaster
	}
	if country := query.Get("country"); country != "" {
		input.Country = &country
	}
	if process := query.Get("process"); process != "" {
		input.Process = &process
	}
	if search := query.Get("search"); search != "" {
		input.Search = &search
	}
	if page := query.Get("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil {
			input.Page = p
		}
	}
	if pageSize := query.Get("page_size"); pageSize != "" {
		if ps, err := strconv.Atoi(pageSize); err == nil {
			input.PageSize = ps
		}
	}

	result, err := h.coffeeSvc.List(r.Context(), userID, input)
	if err != nil {
		response.InternalServerError(w, "failed to list coffees")
		return
	}

	response.OK(w, result)
}
