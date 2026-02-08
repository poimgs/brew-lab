package defaults

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
)

const testSecret = "test-jwt-secret-key"

// --- Mock Repository ---

type mockRepo struct {
	defaults     map[string]string   // field_name -> value
	pourDefaults []PourDefault
	userID       string
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		defaults:     make(map[string]string),
		pourDefaults: []PourDefault{},
		userID:       "user-123",
	}
}

func (m *mockRepo) Get(_ context.Context, userID string) (*DefaultsResponse, error) {
	if userID != m.userID {
		return &DefaultsResponse{PourDefaults: []PourDefault{}}, nil
	}

	resp := &DefaultsResponse{PourDefaults: []PourDefault{}}
	for fieldName, value := range m.defaults {
		applyFieldToResponse(resp, fieldName, value)
	}
	resp.PourDefaults = append(resp.PourDefaults, m.pourDefaults...)
	return resp, nil
}

func (m *mockRepo) Put(_ context.Context, userID string, req UpdateRequest) (*DefaultsResponse, error) {
	if userID != m.userID {
		return &DefaultsResponse{PourDefaults: []PourDefault{}}, nil
	}

	// Clear and replace
	m.defaults = make(map[string]string)
	fields := buildFieldMap(req)
	for k, v := range fields {
		m.defaults[k] = v
	}

	m.pourDefaults = nil
	for _, pd := range req.PourDefaults {
		m.pourDefaults = append(m.pourDefaults, PourDefault{
			PourNumber:  pd.PourNumber,
			WaterAmount: pd.WaterAmount,
			PourStyle:   pd.PourStyle,
			WaitTime:    pd.WaitTime,
		})
	}

	return m.Get(context.Background(), userID)
}

func (m *mockRepo) DeleteField(_ context.Context, userID, fieldName string) error {
	if userID != m.userID {
		return pgx.ErrNoRows
	}
	if _, ok := m.defaults[fieldName]; !ok {
		return pgx.ErrNoRows
	}
	delete(m.defaults, fieldName)
	return nil
}

// Error-returning mock

type errorRepo struct{}

func (e *errorRepo) Get(_ context.Context, _ string) (*DefaultsResponse, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Put(_ context.Context, _ string, _ UpdateRequest) (*DefaultsResponse, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) DeleteField(_ context.Context, _, _ string) error {
	return errors.New("database error")
}

// --- Helpers ---

func generateTestAccessToken(userID string) string {
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": "test@example.com",
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, _ := token.SignedString([]byte(testSecret))
	return s
}

func setupRouter(h *Handler) *chi.Mux {
	r := chi.NewRouter()
	r.Route("/api/v1/defaults", func(r chi.Router) {
		r.Use(middleware.RequireAuth(testSecret))
		r.Get("/", h.Get)
		r.Put("/", h.Put)
		r.Delete("/{field}", h.DeleteField)
	})
	return r
}

func authRequest(method, url string, body string) *http.Request {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, url, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, url, nil)
	}
	req.Header.Set("Authorization", "Bearer "+generateTestAccessToken("user-123"))
	return req
}

func float64Ptr(v float64) *float64 { return &v }
func strPtr(s string) *string       { return &s }
func intPtr(v int) *int             { return &v }

// --- Get Tests ---

func TestGet_EmptyDefaults(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/defaults", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp DefaultsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.CoffeeWeight != nil {
		t.Error("expected coffee_weight to be nil")
	}
	if resp.Ratio != nil {
		t.Error("expected ratio to be nil")
	}
	if resp.PourDefaults == nil || len(resp.PourDefaults) != 0 {
		t.Errorf("expected empty pour_defaults array, got %v", resp.PourDefaults)
	}
}

func TestGet_WithDefaults(t *testing.T) {
	repo := newMockRepo()
	repo.defaults["coffee_weight"] = "15"
	repo.defaults["ratio"] = "15.5"
	repo.defaults["grind_size"] = "3.5"
	repo.defaults["water_temperature"] = "93"
	repo.defaults["filter_paper_id"] = "fp-uuid-123"
	repo.pourDefaults = []PourDefault{
		{PourNumber: 1, WaterAmount: float64Ptr(45), PourStyle: strPtr("center"), WaitTime: intPtr(30)},
		{PourNumber: 2, WaterAmount: float64Ptr(90), PourStyle: strPtr("circular")},
	}
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/defaults", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp DefaultsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.CoffeeWeight == nil || *resp.CoffeeWeight != 15 {
		t.Errorf("expected coffee_weight 15, got %v", resp.CoffeeWeight)
	}
	if resp.Ratio == nil || *resp.Ratio != 15.5 {
		t.Errorf("expected ratio 15.5, got %v", resp.Ratio)
	}
	if resp.GrindSize == nil || *resp.GrindSize != 3.5 {
		t.Errorf("expected grind_size 3.5, got %v", resp.GrindSize)
	}
	if resp.WaterTemperature == nil || *resp.WaterTemperature != 93 {
		t.Errorf("expected water_temperature 93, got %v", resp.WaterTemperature)
	}
	if resp.FilterPaperID == nil || *resp.FilterPaperID != "fp-uuid-123" {
		t.Errorf("expected filter_paper_id fp-uuid-123, got %v", resp.FilterPaperID)
	}
	if len(resp.PourDefaults) != 2 {
		t.Fatalf("expected 2 pour defaults, got %d", len(resp.PourDefaults))
	}
	if resp.PourDefaults[0].PourNumber != 1 {
		t.Errorf("expected pour #1, got %d", resp.PourDefaults[0].PourNumber)
	}
	if resp.PourDefaults[0].WaterAmount == nil || *resp.PourDefaults[0].WaterAmount != 45 {
		t.Errorf("expected pour #1 water_amount 45, got %v", resp.PourDefaults[0].WaterAmount)
	}
	if resp.PourDefaults[0].PourStyle == nil || *resp.PourDefaults[0].PourStyle != "center" {
		t.Errorf("expected pour #1 style center, got %v", resp.PourDefaults[0].PourStyle)
	}
	if resp.PourDefaults[0].WaitTime == nil || *resp.PourDefaults[0].WaitTime != 30 {
		t.Errorf("expected pour #1 wait_time 30, got %v", resp.PourDefaults[0].WaitTime)
	}
}

func TestGet_Unauthenticated(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/defaults", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestGet_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/defaults", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

// --- Put Tests ---

func TestPut_SetAllDefaults(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{
		"coffee_weight": 15,
		"ratio": 15.5,
		"grind_size": 3.5,
		"water_temperature": 93,
		"filter_paper_id": "fp-uuid-123",
		"pour_defaults": [
			{"pour_number": 1, "water_amount": 45, "pour_style": "center", "wait_time": 30},
			{"pour_number": 2, "water_amount": 90, "pour_style": "circular"}
		]
	}`
	req := authRequest(http.MethodPut, "/api/v1/defaults", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp DefaultsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.CoffeeWeight == nil || *resp.CoffeeWeight != 15 {
		t.Errorf("expected coffee_weight 15, got %v", resp.CoffeeWeight)
	}
	if resp.Ratio == nil || *resp.Ratio != 15.5 {
		t.Errorf("expected ratio 15.5, got %v", resp.Ratio)
	}
	if len(resp.PourDefaults) != 2 {
		t.Errorf("expected 2 pour defaults, got %d", len(resp.PourDefaults))
	}
}

func TestPut_PartialDefaults(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_weight": 18, "ratio": 16}`
	req := authRequest(http.MethodPut, "/api/v1/defaults", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp DefaultsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.CoffeeWeight == nil || *resp.CoffeeWeight != 18 {
		t.Errorf("expected coffee_weight 18, got %v", resp.CoffeeWeight)
	}
	if resp.Ratio == nil || *resp.Ratio != 16 {
		t.Errorf("expected ratio 16, got %v", resp.Ratio)
	}
	if resp.GrindSize != nil {
		t.Errorf("expected grind_size nil, got %v", *resp.GrindSize)
	}
	if resp.WaterTemperature != nil {
		t.Errorf("expected water_temperature nil, got %v", *resp.WaterTemperature)
	}
	if resp.FilterPaperID != nil {
		t.Errorf("expected filter_paper_id nil, got %v", *resp.FilterPaperID)
	}
}

func TestPut_EmptyBodyClearsAll(t *testing.T) {
	repo := newMockRepo()
	repo.defaults["coffee_weight"] = "15"
	repo.defaults["ratio"] = "15"
	repo.pourDefaults = []PourDefault{{PourNumber: 1, WaterAmount: float64Ptr(45)}}
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{}`
	req := authRequest(http.MethodPut, "/api/v1/defaults", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp DefaultsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.CoffeeWeight != nil {
		t.Errorf("expected coffee_weight nil after clear, got %v", *resp.CoffeeWeight)
	}
	if resp.Ratio != nil {
		t.Errorf("expected ratio nil after clear, got %v", *resp.Ratio)
	}
	if len(resp.PourDefaults) != 0 {
		t.Errorf("expected 0 pour defaults after clear, got %d", len(resp.PourDefaults))
	}
}

func TestPut_ReplacesExistingDefaults(t *testing.T) {
	repo := newMockRepo()
	repo.defaults["coffee_weight"] = "15"
	repo.defaults["ratio"] = "15"
	h := NewHandler(repo)
	router := setupRouter(h)

	// PUT with only coffee_weight — ratio should be removed
	body := `{"coffee_weight": 20}`
	req := authRequest(http.MethodPut, "/api/v1/defaults", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp DefaultsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.CoffeeWeight == nil || *resp.CoffeeWeight != 20 {
		t.Errorf("expected coffee_weight 20, got %v", resp.CoffeeWeight)
	}
	if resp.Ratio != nil {
		t.Errorf("expected ratio nil (removed), got %v", *resp.Ratio)
	}
}

func TestPut_InvalidJSON(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodPut, "/api/v1/defaults", "not json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestPut_InvalidPourNumber_Zero(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"pour_defaults": [{"pour_number": 0, "water_amount": 45}]}`
	req := authRequest(http.MethodPut, "/api/v1/defaults", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for pour_number 0, got %d", w.Code)
	}
}

func TestPut_InvalidPourStyle(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"pour_defaults": [{"pour_number": 1, "pour_style": "pulse"}]}`
	req := authRequest(http.MethodPut, "/api/v1/defaults", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid pour_style, got %d", w.Code)
	}
}

func TestPut_NonSequentialPourNumbers(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"pour_defaults": [{"pour_number": 1}, {"pour_number": 3}]}`
	req := authRequest(http.MethodPut, "/api/v1/defaults", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for non-sequential pour numbers, got %d", w.Code)
	}
}

func TestPut_NoPourDefaults(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_weight": 15}`
	req := authRequest(http.MethodPut, "/api/v1/defaults", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp DefaultsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if len(resp.PourDefaults) != 0 {
		t.Errorf("expected 0 pour defaults, got %d", len(resp.PourDefaults))
	}
}

func TestPut_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	body := `{"coffee_weight": 15}`
	req := authRequest(http.MethodPut, "/api/v1/defaults", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

func TestPut_Unauthenticated(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodPut, "/api/v1/defaults", strings.NewReader(`{"coffee_weight": 15}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

// --- DeleteField Tests ---

func TestDeleteField_Success(t *testing.T) {
	repo := newMockRepo()
	repo.defaults["coffee_weight"] = "15"
	repo.defaults["ratio"] = "15"
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/defaults/coffee_weight", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}

	// Verify it was removed
	if _, ok := repo.defaults["coffee_weight"]; ok {
		t.Error("expected coffee_weight to be deleted")
	}
	// Verify other defaults remain
	if _, ok := repo.defaults["ratio"]; !ok {
		t.Error("expected ratio to remain")
	}
}

func TestDeleteField_AllValidFields(t *testing.T) {
	validFields := []string{"coffee_weight", "ratio", "grind_size", "water_temperature", "filter_paper_id"}
	for _, field := range validFields {
		repo := newMockRepo()
		repo.defaults[field] = "test"
		h := NewHandler(repo)
		router := setupRouter(h)

		req := authRequest(http.MethodDelete, "/api/v1/defaults/"+field, "")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusNoContent {
			t.Errorf("expected 204 for field %s, got %d", field, w.Code)
		}
	}
}

func TestDeleteField_UnknownField(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/defaults/nonexistent_field", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown field, got %d", w.Code)
	}
}

func TestDeleteField_NotSet(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/defaults/coffee_weight", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unset default, got %d", w.Code)
	}
}

func TestDeleteField_Unauthenticated(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/defaults/coffee_weight", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestDeleteField_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/defaults/coffee_weight", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

// --- Response Format Tests ---

func TestGet_ResponseIncludesPourDefaultsArray(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/defaults", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Even with no data, pour_defaults should be an empty array (not null)
	body := w.Body.String()
	if !strings.Contains(body, `"pour_defaults":[]`) && !strings.Contains(body, `"pour_defaults": []`) {
		t.Errorf("expected pour_defaults to be empty array, got: %s", body)
	}
}

func TestGet_ResponseNullFieldsForUnsetDefaults(t *testing.T) {
	repo := newMockRepo()
	repo.defaults["coffee_weight"] = "15"
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/defaults", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var raw map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &raw)

	if raw["coffee_weight"] == nil {
		t.Error("expected coffee_weight to be set")
	}
	if raw["ratio"] != nil {
		t.Errorf("expected ratio to be null, got %v", raw["ratio"])
	}
	if raw["grind_size"] != nil {
		t.Errorf("expected grind_size to be null, got %v", raw["grind_size"])
	}
}

func TestPut_PourDefaultsWithOptionalFields(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	// Pour with only pour_number (all others nil)
	body := `{"pour_defaults": [{"pour_number": 1}]}`
	req := authRequest(http.MethodPut, "/api/v1/defaults", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp DefaultsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if len(resp.PourDefaults) != 1 {
		t.Fatalf("expected 1 pour default, got %d", len(resp.PourDefaults))
	}
	if resp.PourDefaults[0].WaterAmount != nil {
		t.Error("expected water_amount nil")
	}
	if resp.PourDefaults[0].PourStyle != nil {
		t.Error("expected pour_style nil")
	}
	if resp.PourDefaults[0].WaitTime != nil {
		t.Error("expected wait_time nil")
	}
}
