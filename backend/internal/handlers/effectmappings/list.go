package effectmappings

import (
	"net/http"
	"strconv"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/effectmapping"
)

type ListHandler struct {
	svc *effectmapping.EffectMappingService
}

func NewListHandler(svc *effectmapping.EffectMappingService) *ListHandler {
	return &ListHandler{svc: svc}
}

func (h *ListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	query := r.URL.Query()
	input := &effectmapping.ListEffectMappingsInput{
		Page:     1,
		PageSize: 20,
	}

	if variable := query.Get("variable"); variable != "" {
		input.Variable = &variable
	}
	if activeStr := query.Get("active"); activeStr != "" {
		active := activeStr == "true"
		input.Active = &active
	}
	if search := query.Get("search"); search != "" {
		input.Search = &search
	}
	if page := query.Get("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil {
			input.Page = p
		}
	}
	if pageSize := query.Get("per_page"); pageSize != "" {
		if ps, err := strconv.Atoi(pageSize); err == nil {
			input.PageSize = ps
		}
	}

	result, err := h.svc.List(r.Context(), userID, input)
	if err != nil {
		response.InternalServerError(w, "failed to list effect mappings")
		return
	}

	response.OK(w, result)
}
