package recommendation

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	recommendationservice "github.com/poimgs/coffee-tracker/backend/internal/services/recommendation"
)

type RecommendationsHandler struct {
	svc      *recommendationservice.RecommendationService
	validate *validator.Validate
}

func NewRecommendationsHandler(svc *recommendationservice.RecommendationService, validate *validator.Validate) *RecommendationsHandler {
	return &RecommendationsHandler{svc: svc, validate: validate}
}

func (h *RecommendationsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	var input models.GetRecommendationsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validate.Struct(input); err != nil {
		validationErrors := make(map[string]string)
		for _, err := range err.(validator.ValidationErrors) {
			field := err.Field()
			switch err.Tag() {
			case "required":
				validationErrors[field] = field + " is required"
			default:
				validationErrors[field] = field + " is invalid"
			}
		}
		response.ValidationError(w, validationErrors)
		return
	}

	recommendations, err := h.svc.GetRecommendations(r.Context(), userID, input.ExperimentID)
	if err != nil {
		if errors.Is(err, recommendationservice.ErrExperimentNotFound) {
			response.NotFound(w, "experiment not found")
			return
		}
		response.InternalServerError(w, "failed to get recommendations")
		return
	}

	response.OK(w, recommendations)
}
