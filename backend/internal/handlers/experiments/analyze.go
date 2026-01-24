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

type AnalyzeHandler struct {
	experimentSvc *experiment.ExperimentService
	validate      *validator.Validate
}

func NewAnalyzeHandler(experimentSvc *experiment.ExperimentService, validate *validator.Validate) *AnalyzeHandler {
	return &AnalyzeHandler{experimentSvc: experimentSvc, validate: validate}
}

func (h *AnalyzeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	var input models.AnalyzeExperimentsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validate.Struct(input); err != nil {
		response.BadRequest(w, "experiment_ids must contain at least 5 experiment IDs")
		return
	}

	result, err := h.experimentSvc.Analyze(r.Context(), userID, &input)
	if err != nil {
		response.InternalServerError(w, "failed to analyze experiments: "+err.Error())
		return
	}

	response.OK(w, result)
}
