package tags

import (
	"net/http"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/tags"
)

type ListHandler struct {
	tagsSvc *tags.TagsService
}

func NewListHandler(tagsSvc *tags.TagsService) *ListHandler {
	return &ListHandler{tagsSvc: tagsSvc}
}

func (h *ListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	result, err := h.tagsSvc.List(r.Context(), userID)
	if err != nil {
		response.InternalServerError(w, "failed to list tags")
		return
	}

	response.OK(w, map[string]interface{}{
		"tags": result,
	})
}
