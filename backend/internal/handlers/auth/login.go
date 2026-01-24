package auth

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/poimgs/coffee-tracker/backend/internal/response"
	"github.com/poimgs/coffee-tracker/backend/internal/services/auth"
)

type LoginHandler struct {
	authSvc      *auth.AuthService
	validate     *validator.Validate
	cookieSecure bool
}

func NewLoginHandler(authSvc *auth.AuthService, validate *validator.Validate, cookieSecure bool) *LoginHandler {
	return &LoginHandler{
		authSvc:      authSvc,
		validate:     validate,
		cookieSecure: cookieSecure,
	}
}

func (h *LoginHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var input auth.LoginInput
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
			case "email":
				validationErrors[field] = "invalid email format"
			default:
				validationErrors[field] = "invalid " + field
			}
		}
		response.ValidationError(w, validationErrors)
		return
	}

	authResp, refreshToken, err := h.authSvc.Login(r.Context(), &input)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			response.Unauthorized(w, "invalid credentials")
			return
		}
		response.InternalServerError(w, "failed to login")
		return
	}

	SetRefreshTokenCookie(w, refreshToken, h.authSvc.GetJWTService().GetRefreshTokenExpiry(), h.cookieSecure)
	response.OK(w, authResp)
}
