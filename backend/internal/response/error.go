package response

import (
	"encoding/json"
	"net/http"
)

type ErrorResponse struct {
	Error   string            `json:"error"`
	Details map[string]string `json:"details,omitempty"`
}

func Error(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}

func ErrorWithDetails(w http.ResponseWriter, status int, message string, details map[string]string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message, Details: details})
}

func BadRequest(w http.ResponseWriter, message string) {
	Error(w, http.StatusBadRequest, message)
}

func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnauthorized, message)
}

func Forbidden(w http.ResponseWriter, message string) {
	Error(w, http.StatusForbidden, message)
}

func NotFound(w http.ResponseWriter, message string) {
	Error(w, http.StatusNotFound, message)
}

func Conflict(w http.ResponseWriter, message string) {
	Error(w, http.StatusConflict, message)
}

func TooManyRequests(w http.ResponseWriter, message string) {
	Error(w, http.StatusTooManyRequests, message)
}

func InternalServerError(w http.ResponseWriter, message string) {
	Error(w, http.StatusInternalServerError, message)
}

func ValidationError(w http.ResponseWriter, details map[string]string) {
	ErrorWithDetails(w, http.StatusBadRequest, "validation failed", details)
}
