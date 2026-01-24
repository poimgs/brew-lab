package effectmappings

import (
	"encoding/json"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/effectmapping"
)

type RelevantHandler struct {
	svc      *effectmapping.EffectMappingService
	validate *validator.Validate
}

func NewRelevantHandler(svc *effectmapping.EffectMappingService, validate *validator.Validate) *RelevantHandler {
	return &RelevantHandler{svc: svc, validate: validate}
}

func (h *RelevantHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "user not authenticated")
		return
	}

	var input effectmapping.RelevantMappingsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validate.Struct(input); err != nil {
		response.BadRequest(w, "gaps array is required with at least one gap")
		return
	}

	results, err := h.svc.GetRelevant(r.Context(), userID, &input)
	if err != nil {
		response.InternalServerError(w, "failed to find relevant mappings")
		return
	}

	response.OK(w, map[string]interface{}{"data": results})
}
