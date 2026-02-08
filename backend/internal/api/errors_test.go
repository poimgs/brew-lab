package api

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
)

func TestValidationError(t *testing.T) {
	w := httptest.NewRecorder()
	ValidationError(w, []FieldError{
		{Field: "email", Message: "is required"},
		{Field: "password", Message: "too short"},
	})

	if w.Code != 400 {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var result ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if result.Error.Code != CodeValidationError {
		t.Errorf("expected code VALIDATION_ERROR, got %s", result.Error.Code)
	}
	if len(result.Error.Details) != 2 {
		t.Errorf("expected 2 details, got %d", len(result.Error.Details))
	}
	if result.Error.Details[0].Field != "email" {
		t.Errorf("expected first field 'email', got %s", result.Error.Details[0].Field)
	}
}

func TestNotFoundError(t *testing.T) {
	w := httptest.NewRecorder()
	NotFoundError(w, "Coffee not found")

	if w.Code != 404 {
		t.Errorf("expected status 404, got %d", w.Code)
	}

	var result ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &result)

	if result.Error.Code != CodeNotFound {
		t.Errorf("expected code NOT_FOUND, got %s", result.Error.Code)
	}
	if result.Error.Message != "Coffee not found" {
		t.Errorf("expected message 'Coffee not found', got %s", result.Error.Message)
	}
}

func TestUnauthorizedError(t *testing.T) {
	w := httptest.NewRecorder()
	UnauthorizedError(w, "Invalid token")

	if w.Code != 401 {
		t.Errorf("expected status 401, got %d", w.Code)
	}

	var result ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &result)

	if result.Error.Code != CodeUnauthorized {
		t.Errorf("expected code UNAUTHORIZED, got %s", result.Error.Code)
	}
}

func TestConflictError(t *testing.T) {
	w := httptest.NewRecorder()
	ConflictError(w, "Already exists")

	if w.Code != 409 {
		t.Errorf("expected status 409, got %d", w.Code)
	}

	var result ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &result)

	if result.Error.Code != CodeConflict {
		t.Errorf("expected code CONFLICT, got %s", result.Error.Code)
	}
}

func TestInternalError(t *testing.T) {
	w := httptest.NewRecorder()
	InternalError(w)

	if w.Code != 500 {
		t.Errorf("expected status 500, got %d", w.Code)
	}

	var result ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &result)

	if result.Error.Code != CodeInternalError {
		t.Errorf("expected code INTERNAL_ERROR, got %s", result.Error.Code)
	}
}

func TestForbiddenError(t *testing.T) {
	w := httptest.NewRecorder()
	ForbiddenError(w, "Not allowed")

	if w.Code != 403 {
		t.Errorf("expected status 403, got %d", w.Code)
	}

	var result ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &result)

	if result.Error.Code != CodeForbidden {
		t.Errorf("expected code FORBIDDEN, got %s", result.Error.Code)
	}
}
