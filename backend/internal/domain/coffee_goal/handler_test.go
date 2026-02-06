package coffee_goal

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"coffee-tracker/internal/auth"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// mockRepository implements Repository interface for testing
type mockRepository struct {
	goals map[uuid.UUID]*CoffeeGoal // keyed by coffeeID
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		goals: make(map[uuid.UUID]*CoffeeGoal),
	}
}

func (m *mockRepository) GetByCoffeeID(ctx context.Context, userID, coffeeID uuid.UUID) (*CoffeeGoal, error) {
	goal, ok := m.goals[coffeeID]
	if !ok {
		return nil, ErrCoffeeGoalNotFound
	}
	if goal.UserID != userID {
		return nil, ErrCoffeeNotFound
	}
	return goal, nil
}

func (m *mockRepository) Upsert(ctx context.Context, userID, coffeeID uuid.UUID, input UpsertInput) (*CoffeeGoal, error) {
	goal := &CoffeeGoal{
		ID:                   uuid.New(),
		CoffeeID:             coffeeID,
		UserID:               userID,
		CoffeeMl:             input.CoffeeMl,
		TDS:                  input.TDS,
		ExtractionYield:      input.ExtractionYield,
		AromaIntensity:       input.AromaIntensity,
		SweetnessIntensity:   input.SweetnessIntensity,
		BodyIntensity:        input.BodyIntensity,
		FlavorIntensity:      input.FlavorIntensity,
		BrightnessIntensity:  input.BrightnessIntensity,
		CleanlinessIntensity: input.CleanlinessIntensity,
		ComplexityIntensity:  input.ComplexityIntensity,
		BalanceIntensity:     input.BalanceIntensity,
		AftertasteIntensity:  input.AftertasteIntensity,
		OverallScore:         input.OverallScore,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}
	m.goals[coffeeID] = goal
	return goal, nil
}

func (m *mockRepository) Delete(ctx context.Context, userID, coffeeID uuid.UUID) error {
	goal, ok := m.goals[coffeeID]
	if !ok {
		return ErrCoffeeGoalNotFound
	}
	if goal.UserID != userID {
		return ErrCoffeeNotFound
	}
	delete(m.goals, coffeeID)
	return nil
}

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

func TestHandler_Upsert_WithCoffeeMl(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	coffeeMl := 180.0
	tds := 1.38
	extraction := 20.5
	sweetness := 8
	overall := 9

	body, _ := json.Marshal(UpsertInput{
		CoffeeMl:           &coffeeMl,
		TDS:                &tds,
		ExtractionYield:    &extraction,
		SweetnessIntensity: &sweetness,
		OverallScore:       &overall,
	})

	req := createRequestWithUser("PUT", "/coffees/"+coffeeID.String()+"/goals", body, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Put("/coffees/{id}/goals", handler.Upsert)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	// Verify response contains coffee_ml
	var raw map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if raw["coffee_ml"] != float64(180) {
		t.Errorf("expected coffee_ml 180, got %v", raw["coffee_ml"])
	}
	if raw["tds"] != 1.38 {
		t.Errorf("expected tds 1.38, got %v", raw["tds"])
	}
	if raw["sweetness_intensity"] != float64(8) {
		t.Errorf("expected sweetness_intensity 8, got %v", raw["sweetness_intensity"])
	}
	if raw["overall_score"] != float64(9) {
		t.Errorf("expected overall_score 9, got %v", raw["overall_score"])
	}

	// Verify notes field is NOT present in response
	if _, exists := raw["notes"]; exists {
		t.Error("response should not contain 'notes' field")
	}
}

func TestHandler_Upsert_NoNotesField(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	// Send a body with a "notes" field — it should be silently ignored
	body := []byte(`{"tds":1.38,"notes":"this should be ignored"}`)

	req := createRequestWithUser("PUT", "/coffees/"+coffeeID.String()+"/goals", body, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Put("/coffees/{id}/goals", handler.Upsert)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	// Verify response does not contain notes
	var raw map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if _, exists := raw["notes"]; exists {
		t.Error("response should not contain 'notes' field — notes was removed from goals")
	}
}

func TestHandler_Upsert_InvalidIntensity(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	invalidScore := 11
	body, _ := json.Marshal(UpsertInput{
		OverallScore: &invalidScore,
	})

	req := createRequestWithUser("PUT", "/coffees/"+coffeeID.String()+"/goals", body, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Put("/coffees/{id}/goals", handler.Upsert)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status %d for invalid intensity, got %d: %s", http.StatusBadRequest, rr.Code, rr.Body.String())
	}
}

func TestHandler_Upsert_InvalidCoffeeID(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	body := []byte(`{"tds":1.38}`)
	req := createRequestWithUser("PUT", "/coffees/invalid/goals", body, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Put("/coffees/{id}/goals", handler.Upsert)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestHandler_Get(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()
	coffeeMl := 180.0
	tds := 1.38

	// Add a goal to the mock repo
	repo.goals[coffeeID] = &CoffeeGoal{
		ID:       uuid.New(),
		CoffeeID: coffeeID,
		UserID:   userID,
		CoffeeMl: &coffeeMl,
		TDS:      &tds,
	}

	req := createRequestWithUser("GET", "/coffees/"+coffeeID.String()+"/goals", nil, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/coffees/{id}/goals", handler.Get)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if raw["coffee_ml"] != float64(180) {
		t.Errorf("expected coffee_ml 180, got %v", raw["coffee_ml"])
	}
	if raw["tds"] != 1.38 {
		t.Errorf("expected tds 1.38, got %v", raw["tds"])
	}
}

func TestHandler_Get_NotFound(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	req := createRequestWithUser("GET", "/coffees/"+coffeeID.String()+"/goals", nil, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/coffees/{id}/goals", handler.Get)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected status %d, got %d", http.StatusNotFound, rr.Code)
	}
}

func TestHandler_Delete_Goals(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	repo.goals[coffeeID] = &CoffeeGoal{
		ID:       uuid.New(),
		CoffeeID: coffeeID,
		UserID:   userID,
	}

	req := createRequestWithUser("DELETE", "/coffees/"+coffeeID.String()+"/goals", nil, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Delete("/coffees/{id}/goals", handler.Delete)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Errorf("expected status %d, got %d: %s", http.StatusNoContent, rr.Code, rr.Body.String())
	}

	// Verify goals were deleted
	if _, exists := repo.goals[coffeeID]; exists {
		t.Error("expected goals to be deleted")
	}
}

func TestHandler_Upsert_AllGoalFields(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	coffeeMl := 180.0
	tds := 1.38
	extraction := 20.5
	aroma := 7
	sweetness := 8
	body := 7
	flavor := 8
	brightness := 7
	cleanliness := 7
	complexity := 6
	balance := 8
	aftertaste := 7
	overall := 9

	input := UpsertInput{
		CoffeeMl:             &coffeeMl,
		TDS:                  &tds,
		ExtractionYield:      &extraction,
		AromaIntensity:       &aroma,
		SweetnessIntensity:   &sweetness,
		BodyIntensity:        &body,
		FlavorIntensity:      &flavor,
		BrightnessIntensity:  &brightness,
		CleanlinessIntensity: &cleanliness,
		ComplexityIntensity:  &complexity,
		BalanceIntensity:     &balance,
		AftertasteIntensity:  &aftertaste,
		OverallScore:         &overall,
	}

	reqBody, _ := json.Marshal(input)
	req := createRequestWithUser("PUT", "/coffees/"+coffeeID.String()+"/goals", reqBody, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Put("/coffees/{id}/goals", handler.Upsert)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify all 13 target fields are present (3 quantitative + 9 sensory + overall)
	expected := map[string]float64{
		"coffee_ml":            180.0,
		"tds":                  1.38,
		"extraction_yield":     20.5,
		"aroma_intensity":      7,
		"sweetness_intensity":  8,
		"body_intensity":       7,
		"flavor_intensity":     8,
		"brightness_intensity": 7,
		"cleanliness_intensity": 7,
		"complexity_intensity": 6,
		"balance_intensity":    8,
		"aftertaste_intensity": 7,
		"overall_score":        9,
	}

	for field, expectedVal := range expected {
		if raw[field] != expectedVal {
			t.Errorf("expected %s to be %v, got %v", field, expectedVal, raw[field])
		}
	}
}
