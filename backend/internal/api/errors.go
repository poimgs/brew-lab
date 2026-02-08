package api

import "net/http"

const (
	CodeValidationError = "VALIDATION_ERROR"
	CodeNotFound        = "NOT_FOUND"
	CodeUnauthorized    = "UNAUTHORIZED"
	CodeForbidden       = "FORBIDDEN"
	CodeConflict        = "CONFLICT"
	CodeInternalError   = "INTERNAL_ERROR"
)

type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

type ErrorBody struct {
	Code    string        `json:"code"`
	Message string        `json:"message"`
	Details []FieldError  `json:"details,omitempty"`
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func ValidationError(w http.ResponseWriter, details []FieldError) {
	WriteJSON(w, http.StatusBadRequest, ErrorResponse{
		Error: ErrorBody{
			Code:    CodeValidationError,
			Message: "Invalid request data",
			Details: details,
		},
	})
}

func NotFoundError(w http.ResponseWriter, message string) {
	WriteJSON(w, http.StatusNotFound, ErrorResponse{
		Error: ErrorBody{
			Code:    CodeNotFound,
			Message: message,
		},
	})
}

func UnauthorizedError(w http.ResponseWriter, message string) {
	WriteJSON(w, http.StatusUnauthorized, ErrorResponse{
		Error: ErrorBody{
			Code:    CodeUnauthorized,
			Message: message,
		},
	})
}

func ForbiddenError(w http.ResponseWriter, message string) {
	WriteJSON(w, http.StatusForbidden, ErrorResponse{
		Error: ErrorBody{
			Code:    CodeForbidden,
			Message: message,
		},
	})
}

func ConflictError(w http.ResponseWriter, message string) {
	WriteJSON(w, http.StatusConflict, ErrorResponse{
		Error: ErrorBody{
			Code:    CodeConflict,
			Message: message,
		},
	})
}

func InternalError(w http.ResponseWriter) {
	WriteJSON(w, http.StatusInternalServerError, ErrorResponse{
		Error: ErrorBody{
			Code:    CodeInternalError,
			Message: "An internal error occurred",
		},
	})
}
