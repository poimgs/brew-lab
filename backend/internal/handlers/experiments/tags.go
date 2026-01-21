package experiments

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/experiment"
)

type AddTagsInput struct {
	TagIDs []uuid.UUID `json:"tag_ids"`
}

type AddTagsHandler struct {
	experimentSvc *experiment.ExperimentService
}

func NewAddTagsHandler(experimentSvc *experiment.ExperimentService) *AddTagsHandler {
	return &AddTagsHandler{experimentSvc: experimentSvc}
}

func (h *AddTagsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	experimentIDStr := chi.URLParam(r, "id")
	experimentID, err := uuid.Parse(experimentIDStr)
	if err != nil {
		response.BadRequest(w, "invalid experiment ID")
		return
	}

	var input AddTagsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if len(input.TagIDs) == 0 {
		response.BadRequest(w, "tag_ids is required")
		return
	}

	exp, err := h.experimentSvc.AddTags(r.Context(), userID, experimentID, input.TagIDs)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrExperimentNotFound):
			response.NotFound(w, "experiment not found")
		case errors.Is(err, repository.ErrTagNotFound):
			response.BadRequest(w, "one or more tags not found")
		default:
			response.InternalServerError(w, "failed to add tags")
		}
		return
	}

	response.OK(w, exp)
}

type RemoveTagHandler struct {
	experimentSvc *experiment.ExperimentService
}

func NewRemoveTagHandler(experimentSvc *experiment.ExperimentService) *RemoveTagHandler {
	return &RemoveTagHandler{experimentSvc: experimentSvc}
}

func (h *RemoveTagHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	experimentIDStr := chi.URLParam(r, "id")
	experimentID, err := uuid.Parse(experimentIDStr)
	if err != nil {
		response.BadRequest(w, "invalid experiment ID")
		return
	}

	tagIDStr := chi.URLParam(r, "tagID")
	tagID, err := uuid.Parse(tagIDStr)
	if err != nil {
		response.BadRequest(w, "invalid tag ID")
		return
	}

	exp, err := h.experimentSvc.RemoveTag(r.Context(), userID, experimentID, tagID)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrExperimentNotFound):
			response.NotFound(w, "experiment not found")
		case errors.Is(err, repository.ErrTagNotFound):
			response.NotFound(w, "tag not found")
		default:
			response.InternalServerError(w, "failed to remove tag")
		}
		return
	}

	response.OK(w, exp)
}
