package recommendation

import (
	"net/http"
	"strconv"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	recommendationservice "github.com/poimgs/coffee-tracker/backend/internal/services/recommendation"
)

type WithGapsHandler struct {
	svc *recommendationservice.RecommendationService
}

func NewWithGapsHandler(svc *recommendationservice.RecommendationService) *WithGapsHandler {
	return &WithGapsHandler{svc: svc}
}

func (h *WithGapsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	// Parse pagination parameters
	page := 1
	pageSize := 20

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}

	result, err := h.svc.ListExperimentsWithGaps(r.Context(), userID, page, pageSize)
	if err != nil {
		response.InternalServerError(w, "failed to list experiments with gaps")
		return
	}

	response.OK(w, result)
}
