package experiments

import (
	"encoding/json"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/experiment"
)

type CompareHandler struct {
	experimentSvc *experiment.ExperimentService
	validate      *validator.Validate
}

func NewCompareHandler(experimentSvc *experiment.ExperimentService, validate *validator.Validate) *CompareHandler {
	return &CompareHandler{experimentSvc: experimentSvc, validate: validate}
}

func (h *CompareHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	var input models.CompareExperimentsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validate.Struct(input); err != nil {
		response.BadRequest(w, "experiment_ids must contain 2-4 experiment IDs")
		return
	}

	result, err := h.experimentSvc.Compare(r.Context(), userID, &input)
	if err != nil {
		response.InternalServerError(w, "failed to compare experiments: "+err.Error())
		return
	}

	response.OK(w, result)
}
