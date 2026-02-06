package defaults

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"coffee-tracker/internal/auth"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// mockRepository implements Repository interface for testing
type mockRepository struct {
	defaults    map[uuid.UUID]Defaults
	getAllFunc  func(ctx context.Context, userID uuid.UUID) (Defaults, error)
	upsertFunc  func(ctx context.Context, userID uuid.UUID, input UpdateDefaultsInput) (Defaults, error)
	deleteFunc  func(ctx context.Context, userID uuid.UUID, fieldName string) error
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		defaults: make(map[uuid.UUID]Defaults),
	}
}

func (m *mockRepository) GetAll(ctx context.Context, userID uuid.UUID) (Defaults, error) {
	if m.getAllFunc != nil {
		return m.getAllFunc(ctx, userID)
	}
	if d, ok := m.defaults[userID]; ok {
		return d, nil
	}
	return Defaults{}, nil
}

func (m *mockRepository) Upsert(ctx context.Context, userID uuid.UUID, input UpdateDefaultsInput) (Defaults, error) {
	if m.upsertFunc != nil {
		return m.upsertFunc(ctx, userID, input)
	}
	if m.defaults[userID] == nil {
		m.defaults[userID] = make(Defaults)
	}
	for k, v := range input {
		if IsValidField(k) {
			m.defaults[userID][k] = v
		}
	}
	return m.defaults[userID], nil
}

func (m *mockRepository) DeleteField(ctx context.Context, userID uuid.UUID, fieldName string) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, userID, fieldName)
	}
	if d, ok := m.defaults[userID]; ok {
		if _, exists := d[fieldName]; exists {
			delete(d, fieldName)
			return nil
		}
	}
	return ErrDefaultNotFound
}

// Helper to create request with user context
func createRequestWithUser(method, path string, body []byte, userID uuid.UUID) *http.Request {
	var req *http.Request
	if body != nil {
		req = httptest.NewRequest(method, path, bytes.NewReader(body))
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	req.Header.Set("Content-Type", "application/json")
	ctx := auth.SetUserID(req.Context(), userID)
	return req.WithContext(ctx)
}

func TestHandler_GetAll(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	// Add some defaults
	repo.defaults[userID] = Defaults{
		"coffee_weight": "15",
		"ratio":         "1:15",
	}

	req := createRequestWithUser("GET", "/defaults", nil, userID)
	rr := httptest.NewRecorder()

	handler.GetAll(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var result Defaults
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if result["coffee_weight"] != "15" {
		t.Errorf("expected coffee_weight to be '15', got '%s'", result["coffee_weight"])
	}
	if result["ratio"] != "1:15" {
		t.Errorf("expected ratio to be '1:15', got '%s'", result["ratio"])
	}
}

func TestHandler_GetAll_Empty(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	req := createRequestWithUser("GET", "/defaults", nil, userID)
	rr := httptest.NewRecorder()

	handler.GetAll(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var result Defaults
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if len(result) != 0 {
		t.Errorf("expected empty defaults, got %d items", len(result))
	}
}

func TestHandler_GetAll_Unauthorized(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	// Request without user context
	req := httptest.NewRequest("GET", "/defaults", nil)
	rr := httptest.NewRecorder()

	handler.GetAll(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

func TestHandler_Update(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	tests := []struct {
		name           string
		body           interface{}
		expectedStatus int
	}{
		{
			name: "valid update single field",
			body: UpdateDefaultsInput{
				"coffee_weight": "15",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "valid update multiple fields",
			body: UpdateDefaultsInput{
				"coffee_weight":     "15",
				"ratio":             "1:16",
				"water_temperature": "93",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "invalid field name",
			body: UpdateDefaultsInput{
				"invalid_field": "value",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "empty body",
			body:           UpdateDefaultsInput{},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid JSON",
			body:           "not json",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body []byte
			var err error
			if s, ok := tt.body.(string); ok {
				body = []byte(s)
			} else {
				body, err = json.Marshal(tt.body)
				if err != nil {
					t.Fatal(err)
				}
			}

			req := createRequestWithUser("PUT", "/defaults", body, userID)
			rr := httptest.NewRecorder()

			handler.Update(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Update_Unauthorized(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	body, _ := json.Marshal(UpdateDefaultsInput{"coffee_weight": "15"})
	req := httptest.NewRequest("PUT", "/defaults", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

func TestHandler_DeleteField(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	// Add a default first
	repo.defaults[userID] = Defaults{
		"coffee_weight": "15",
		"ratio":         "1:15",
	}

	tests := []struct {
		name           string
		field          string
		expectedStatus int
	}{
		{
			name:           "delete existing field",
			field:          "coffee_weight",
			expectedStatus: http.StatusNoContent,
		},
		{
			name:           "delete non-existent field",
			field:          "bloom_time",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "delete invalid field name",
			field:          "invalid_field",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("DELETE", "/defaults/"+tt.field, nil, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Delete("/defaults/{field}", handler.DeleteField)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_DeleteField_Unauthorized(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	req := httptest.NewRequest("DELETE", "/defaults/coffee_weight", nil)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Delete("/defaults/{field}", handler.DeleteField)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

func TestHandler_Update_MergesWithExisting(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	// Add initial defaults
	repo.defaults[userID] = Defaults{
		"coffee_weight": "15",
	}

	// Update with new field
	body, _ := json.Marshal(UpdateDefaultsInput{
		"ratio": "1:16",
	})
	req := createRequestWithUser("PUT", "/defaults", body, userID)
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var result Defaults
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	// Both original and new values should be present
	if result["coffee_weight"] != "15" {
		t.Errorf("expected coffee_weight to be '15', got '%s'", result["coffee_weight"])
	}
	if result["ratio"] != "1:16" {
		t.Errorf("expected ratio to be '1:16', got '%s'", result["ratio"])
	}
}

func TestHandler_Update_PourDefaults(t *testing.T) {
	tests := []struct {
		name           string
		pourJSON       string
		expectedStatus int
	}{
		{
			name:           "valid pour defaults with two pours",
			pourJSON:       `[{"water_amount":90,"pour_style":"circular","notes":""},{"water_amount":90,"pour_style":"center"}]`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "valid pour defaults minimal",
			pourJSON:       `[{"water_amount":90}]`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "valid pour defaults with null fields",
			pourJSON:       `[{}]`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON",
			pourJSON:       `not json`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "empty array",
			pourJSON:       `[]`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "negative water amount",
			pourJSON:       `[{"water_amount":-5}]`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid pour style",
			pourJSON:       `[{"pour_style":"swirl"}]`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "too many pours",
			pourJSON:       `[{},{},{},{},{},{},{},{},{},{},{}]`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockRepository()
			handler := NewHandler(repo)
			userID := uuid.New()

			body, _ := json.Marshal(UpdateDefaultsInput{
				"pour_defaults": tt.pourJSON,
			})

			req := createRequestWithUser("PUT", "/defaults", body, userID)
			rr := httptest.NewRecorder()

			handler.Update(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Update_PourDefaultsStored(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)
	userID := uuid.New()

	pourJSON := `[{"water_amount":90,"pour_style":"circular"},{"water_amount":90,"pour_style":"center"}]`
	body, _ := json.Marshal(UpdateDefaultsInput{
		"pour_defaults": pourJSON,
	})

	req := createRequestWithUser("PUT", "/defaults", body, userID)
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var result Defaults
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if result["pour_defaults"] != pourJSON {
		t.Errorf("expected pour_defaults to be stored, got '%s'", result["pour_defaults"])
	}
}

func TestHandler_DeleteField_PourDefaults(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)
	userID := uuid.New()

	repo.defaults[userID] = Defaults{
		"pour_defaults": `[{"water_amount":90}]`,
	}

	req := createRequestWithUser("DELETE", "/defaults/pour_defaults", nil, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Delete("/defaults/{field}", handler.DeleteField)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Errorf("expected status %d, got %d: %s", http.StatusNoContent, rr.Code, rr.Body.String())
	}
}

func TestIsValidField(t *testing.T) {
	validFields := []string{
		"coffee_weight",
		"water_weight",
		"ratio",
		"grind_size",
		"water_temperature",
		"filter_paper_id",
		"bloom_water",
		"bloom_time",
		"pour_defaults",
	}

	invalidFields := []string{
		"invalid_field",
		"coffee_id",
		"user_id",
		"",
	}

	for _, field := range validFields {
		if !IsValidField(field) {
			t.Errorf("expected '%s' to be valid", field)
		}
	}

	for _, field := range invalidFields {
		if IsValidField(field) {
			t.Errorf("expected '%s' to be invalid", field)
		}
	}
}
