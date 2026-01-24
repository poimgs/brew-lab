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

type AnalyzeDetailHandler struct {
	experimentSvc *experiment.ExperimentService
	validate      *validator.Validate
}

func NewAnalyzeDetailHandler(experimentSvc *experiment.ExperimentService, validate *validator.Validate) *AnalyzeDetailHandler {
	return &AnalyzeDetailHandler{experimentSvc: experimentSvc, validate: validate}
}

func (h *AnalyzeDetailHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	var input models.AnalyzeDetailInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validate.Struct(input); err != nil {
		response.BadRequest(w, "invalid input: experiment_ids must contain at least 5 IDs, and input_variable and outcome_variable are required")
		return
	}

	result, err := h.experimentSvc.AnalyzeDetail(r.Context(), userID, &input)
	if err != nil {
		response.InternalServerError(w, "failed to get correlation details: "+err.Error())
		return
	}

	response.OK(w, result)
}
