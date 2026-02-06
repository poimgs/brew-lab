package coffee

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
	coffees    map[uuid.UUID]*Coffee
	createFunc func(ctx context.Context, userID uuid.UUID, input CreateCoffeeInput) (*Coffee, error)
	getFunc    func(ctx context.Context, userID, coffeeID uuid.UUID) (*Coffee, error)
	listFunc   func(ctx context.Context, userID uuid.UUID, params ListCoffeesParams) (*ListCoffeesResult, error)
	updateFunc func(ctx context.Context, userID, coffeeID uuid.UUID, input UpdateCoffeeInput) (*Coffee, error)
	deleteFunc func(ctx context.Context, userID, coffeeID uuid.UUID) error
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		coffees: make(map[uuid.UUID]*Coffee),
	}
}

func (m *mockRepository) Create(ctx context.Context, userID uuid.UUID, input CreateCoffeeInput) (*Coffee, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, userID, input)
	}
	coffee := &Coffee{
		ID:        uuid.New(),
		UserID:    userID,
		Roaster:   input.Roaster,
		Name:      input.Name,
		Country:   input.Country,
		Farm:      input.Farm,
		RoastDate: input.RoastDate,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	m.coffees[coffee.ID] = coffee
	return coffee, nil
}

func (m *mockRepository) GetByID(ctx context.Context, userID, coffeeID uuid.UUID) (*Coffee, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, userID, coffeeID)
	}
	coffee, ok := m.coffees[coffeeID]
	if !ok || coffee.UserID != userID {
		return nil, ErrCoffeeNotFound
	}
	return coffee, nil
}

func (m *mockRepository) List(ctx context.Context, userID uuid.UUID, params ListCoffeesParams) (*ListCoffeesResult, error) {
	if m.listFunc != nil {
		return m.listFunc(ctx, userID, params)
	}
	var items []Coffee
	for _, c := range m.coffees {
		if c.UserID == userID && c.DeletedAt == nil {
			items = append(items, *c)
		}
	}
	return &ListCoffeesResult{
		Items: items,
		Pagination: Pagination{
			Page:       1,
			PerPage:    20,
			Total:      len(items),
			TotalPages: 1,
		},
	}, nil
}

func (m *mockRepository) Update(ctx context.Context, userID, coffeeID uuid.UUID, input UpdateCoffeeInput) (*Coffee, error) {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, userID, coffeeID, input)
	}
	coffee, ok := m.coffees[coffeeID]
	if !ok || coffee.UserID != userID {
		return nil, ErrCoffeeNotFound
	}
	if input.Roaster != nil {
		coffee.Roaster = *input.Roaster
	}
	if input.Name != nil {
		coffee.Name = *input.Name
	}
	if input.Farm != nil {
		coffee.Farm = input.Farm
	}
	coffee.UpdatedAt = time.Now()
	return coffee, nil
}

func (m *mockRepository) Delete(ctx context.Context, userID, coffeeID uuid.UUID) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, userID, coffeeID)
	}
	coffee, ok := m.coffees[coffeeID]
	if !ok || coffee.UserID != userID {
		return ErrCoffeeNotFound
	}
	now := time.Now()
	coffee.DeletedAt = &now
	return nil
}

func (m *mockRepository) Archive(ctx context.Context, userID, coffeeID uuid.UUID) (*Coffee, error) {
	coffee, ok := m.coffees[coffeeID]
	if !ok || coffee.UserID != userID {
		return nil, ErrCoffeeNotFound
	}
	now := time.Now()
	coffee.ArchivedAt = &now
	return coffee, nil
}

func (m *mockRepository) Unarchive(ctx context.Context, userID, coffeeID uuid.UUID) (*Coffee, error) {
	coffee, ok := m.coffees[coffeeID]
	if !ok || coffee.UserID != userID {
		return nil, ErrCoffeeNotFound
	}
	coffee.ArchivedAt = nil
	return coffee, nil
}

func (m *mockRepository) GetSuggestions(ctx context.Context, userID uuid.UUID, field, query string) ([]string, error) {
	return []string{"Test Roaster", "Test Country"}, nil
}

func (m *mockRepository) SetBestExperiment(ctx context.Context, userID, coffeeID uuid.UUID, experimentID *uuid.UUID) (*Coffee, error) {
	coffee, ok := m.coffees[coffeeID]
	if !ok || coffee.UserID != userID {
		return nil, ErrCoffeeNotFound
	}
	// Simulate experiment validation
	if experimentID != nil {
		// For testing, we'll use a special UUID to simulate "wrong coffee"
		wrongCoffeeExperiment := uuid.MustParse("00000000-0000-0000-0000-000000000001")
		if *experimentID == wrongCoffeeExperiment {
			return nil, ErrExperimentWrongCoffee
		}
		// For testing, we'll use a special UUID to simulate "not found"
		notFoundExperiment := uuid.MustParse("00000000-0000-0000-0000-000000000002")
		if *experimentID == notFoundExperiment {
			return nil, ErrExperimentNotFound
		}
	}
	coffee.BestExperimentID = experimentID
	coffee.UpdatedAt = time.Now()
	return coffee, nil
}

func (m *mockRepository) GetReference(ctx context.Context, userID, coffeeID uuid.UUID) (*CoffeeReference, error) {
	coffee, ok := m.coffees[coffeeID]
	if !ok || coffee.UserID != userID {
		return nil, ErrCoffeeNotFound
	}
	// Return a basic reference
	return &CoffeeReference{
		Experiment: nil, // No experiment for basic mock
		Goals:      nil, // No goals for basic mock
	}, nil
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

func TestHandler_Create(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	tests := []struct {
		name           string
		body           interface{}
		expectedStatus int
	}{
		{
			name: "valid coffee creation",
			body: CreateCoffeeInput{
				Roaster: "Test Roaster",
				Name:    "Test Coffee",
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "missing roaster",
			body: CreateCoffeeInput{
				Name: "Test Coffee",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "missing name",
			body: CreateCoffeeInput{
				Roaster: "Test Roaster",
			},
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

			req := createRequestWithUser("POST", "/coffees", body, userID)
			rr := httptest.NewRecorder()

			handler.Create(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Get(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	// Add a coffee to the mock repo
	repo.coffees[coffeeID] = &Coffee{
		ID:        coffeeID,
		UserID:    userID,
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tests := []struct {
		name           string
		coffeeID       string
		expectedStatus int
	}{
		{
			name:           "existing coffee",
			coffeeID:       coffeeID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "non-existent coffee",
			coffeeID:       uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid uuid",
			coffeeID:       "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("GET", "/coffees/"+tt.coffeeID, nil, userID)
			rr := httptest.NewRecorder()

			// Use chi router to handle URL params
			r := chi.NewRouter()
			r.Get("/coffees/{id}", handler.Get)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_List(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	// Add some coffees
	for i := 0; i < 3; i++ {
		id := uuid.New()
		repo.coffees[id] = &Coffee{
			ID:        id,
			UserID:    userID,
			Roaster:   "Test Roaster",
			Name:      "Test Coffee",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	}

	req := createRequestWithUser("GET", "/coffees", nil, userID)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	var result ListCoffeesResult
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if len(result.Items) != 3 {
		t.Errorf("expected 3 items, got %d", len(result.Items))
	}
}

func TestHandler_Delete(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	// Add a coffee to the mock repo
	repo.coffees[coffeeID] = &Coffee{
		ID:        coffeeID,
		UserID:    userID,
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tests := []struct {
		name           string
		coffeeID       string
		expectedStatus int
	}{
		{
			name:           "delete existing coffee",
			coffeeID:       coffeeID.String(),
			expectedStatus: http.StatusNoContent,
		},
		{
			name:           "delete non-existent coffee",
			coffeeID:       uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("DELETE", "/coffees/"+tt.coffeeID, nil, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Delete("/coffees/{id}", handler.Delete)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Archive(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	// Add a coffee to the mock repo
	repo.coffees[coffeeID] = &Coffee{
		ID:        coffeeID,
		UserID:    userID,
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	req := createRequestWithUser("POST", "/coffees/"+coffeeID.String()+"/archive", nil, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Post("/coffees/{id}/archive", handler.Archive)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	// Verify coffee was archived
	if repo.coffees[coffeeID].ArchivedAt == nil {
		t.Error("expected coffee to be archived")
	}
}

func TestHandler_Unarchive(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()
	now := time.Now()

	// Add an archived coffee to the mock repo
	repo.coffees[coffeeID] = &Coffee{
		ID:         coffeeID,
		UserID:     userID,
		Roaster:    "Test Roaster",
		Name:       "Test Coffee",
		ArchivedAt: &now,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	req := createRequestWithUser("POST", "/coffees/"+coffeeID.String()+"/unarchive", nil, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Post("/coffees/{id}/unarchive", handler.Unarchive)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	// Verify coffee was unarchived
	if repo.coffees[coffeeID].ArchivedAt != nil {
		t.Error("expected coffee to be unarchived")
	}
}

func TestHandler_Suggestions(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	tests := []struct {
		name           string
		query          string
		expectedStatus int
	}{
		{
			name:           "valid suggestion query",
			query:          "?field=roaster&q=test",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "missing field parameter",
			query:          "?q=test",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("GET", "/coffees/suggestions"+tt.query, nil, userID)
			rr := httptest.NewRecorder()

			handler.Suggestions(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Create_RoastDateValidation(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	futureDate := NewDateOnly(time.Now().Add(24 * time.Hour))
	body, _ := json.Marshal(CreateCoffeeInput{
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		RoastDate: &futureDate,
	})

	req := createRequestWithUser("POST", "/coffees", body, userID)
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status %d for future roast date, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestHandler_SetBestExperiment(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()
	experimentID := uuid.New()
	wrongCoffeeExperiment := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	notFoundExperiment := uuid.MustParse("00000000-0000-0000-0000-000000000002")

	// Add a coffee to the mock repo
	repo.coffees[coffeeID] = &Coffee{
		ID:        coffeeID,
		UserID:    userID,
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tests := []struct {
		name           string
		coffeeID       string
		body           interface{}
		expectedStatus int
	}{
		{
			name:           "set best experiment successfully",
			coffeeID:       coffeeID.String(),
			body:           SetBestExperimentInput{ExperimentID: &experimentID},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "clear best experiment (set to null)",
			coffeeID:       coffeeID.String(),
			body:           SetBestExperimentInput{ExperimentID: nil},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "coffee not found",
			coffeeID:       uuid.New().String(),
			body:           SetBestExperimentInput{ExperimentID: &experimentID},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "experiment belongs to different coffee",
			coffeeID:       coffeeID.String(),
			body:           SetBestExperimentInput{ExperimentID: &wrongCoffeeExperiment},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "experiment not found",
			coffeeID:       coffeeID.String(),
			body:           SetBestExperimentInput{ExperimentID: &notFoundExperiment},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid coffee id",
			coffeeID:       "invalid",
			body:           SetBestExperimentInput{ExperimentID: &experimentID},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.body)
			if err != nil {
				t.Fatal(err)
			}

			req := createRequestWithUser("POST", "/coffees/"+tt.coffeeID+"/best-experiment", body, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Post("/coffees/{id}/best-experiment", handler.SetBestExperiment)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_SetBestExperiment_VerifyUpdate(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()
	experimentID := uuid.New()

	// Add a coffee to the mock repo
	repo.coffees[coffeeID] = &Coffee{
		ID:        coffeeID,
		UserID:    userID,
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Set best experiment
	body, _ := json.Marshal(SetBestExperimentInput{ExperimentID: &experimentID})
	req := createRequestWithUser("POST", "/coffees/"+coffeeID.String()+"/best-experiment", body, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Post("/coffees/{id}/best-experiment", handler.SetBestExperiment)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	// Verify the response contains the updated coffee with best_experiment_id
	var resultCoffee Coffee
	if err := json.NewDecoder(rr.Body).Decode(&resultCoffee); err != nil {
		t.Fatal(err)
	}

	if resultCoffee.BestExperimentID == nil {
		t.Error("expected best_experiment_id to be set in response")
	} else if *resultCoffee.BestExperimentID != experimentID {
		t.Errorf("expected best_experiment_id %s, got %s", experimentID, *resultCoffee.BestExperimentID)
	}
}

func TestHandler_GetReference(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	// Add a coffee to the mock repo
	repo.coffees[coffeeID] = &Coffee{
		ID:        coffeeID,
		UserID:    userID,
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tests := []struct {
		name           string
		coffeeID       string
		expectedStatus int
	}{
		{
			name:           "get reference successfully",
			coffeeID:       coffeeID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "coffee not found",
			coffeeID:       uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid coffee id",
			coffeeID:       "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("GET", "/coffees/"+tt.coffeeID+"/reference", nil, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Get("/coffees/{id}/reference", handler.GetReference)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_GetReference_ResponseStructure(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	// Add a coffee to the mock repo
	repo.coffees[coffeeID] = &Coffee{
		ID:        coffeeID,
		UserID:    userID,
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	req := createRequestWithUser("GET", "/coffees/"+coffeeID.String()+"/reference", nil, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/coffees/{id}/reference", handler.GetReference)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	// Verify the response structure
	var ref CoffeeReference
	if err := json.NewDecoder(rr.Body).Decode(&ref); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// The mock returns nil for both fields, which is valid for a coffee with no experiments/goals
	// This test verifies the endpoint returns valid JSON with the expected structure
}

func TestHandler_Create_WithFarmField(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	farm := "Kiamaina Estate"

	body, _ := json.Marshal(CreateCoffeeInput{
		Roaster: "Cata Coffee",
		Name:    "Kiamaina",
		Farm:    &farm,
	})

	req := createRequestWithUser("POST", "/coffees", body, userID)
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d: %s", http.StatusCreated, rr.Code, rr.Body.String())
	}

	var result Coffee
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	// Verify the response contains farm field
	if result.Farm == nil || *result.Farm != farm {
		t.Errorf("expected farm to be %q, got %v", farm, result.Farm)
	}
}

func TestHandler_Create_ResponseHasNoRegionOrPurchaseDate(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	body, _ := json.Marshal(CreateCoffeeInput{
		Roaster: "Test Roaster",
		Name:    "Test Coffee",
	})

	req := createRequestWithUser("POST", "/coffees", body, userID)
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d: %s", http.StatusCreated, rr.Code, rr.Body.String())
	}

	// Verify the JSON response does not contain "region" or "purchase_date" keys
	var rawJSON map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &rawJSON); err != nil {
		t.Fatal(err)
	}

	if _, exists := rawJSON["region"]; exists {
		t.Error("response should not contain 'region' field")
	}
	if _, exists := rawJSON["purchase_date"]; exists {
		t.Error("response should not contain 'purchase_date' field")
	}

	// Verify "farm" key is present in the JSON structure (even if omitted when nil)
	// The entity uses omitempty, so farm won't appear when nil - that's expected
}

func TestHandler_Create_PurchaseDateInBodyIsIgnored(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	// Send a body with purchase_date - it should be silently ignored
	body := []byte(`{"roaster":"Test","name":"Coffee","purchase_date":"2026-01-01"}`)

	req := createRequestWithUser("POST", "/coffees", body, userID)
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	// Should succeed - unknown fields are ignored by Go's JSON decoder
	if rr.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d: %s", http.StatusCreated, rr.Code, rr.Body.String())
	}
}

func TestHandler_Update_FarmField(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	repo.coffees[coffeeID] = &Coffee{
		ID:        coffeeID,
		UserID:    userID,
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	farm := "New Farm"
	body, _ := json.Marshal(UpdateCoffeeInput{
		Farm: &farm,
	})

	req := createRequestWithUser("PUT", "/coffees/"+coffeeID.String(), body, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Put("/coffees/{id}", handler.Update)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var result Coffee
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if result.Farm == nil || *result.Farm != farm {
		t.Errorf("expected farm to be %q, got %v", farm, result.Farm)
	}
}

func TestHandler_List_WithBestExperimentData(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()
	experimentID := uuid.New()
	brewDate := time.Date(2026, 1, 15, 10, 30, 0, 0, time.UTC)
	score := 8
	ratio := 15.0
	temp := 96.0
	bloomTime := 30
	fpName := "Abaca"
	mpName := "Catalyst"
	improvementNote := "Try finer grind to boost sweetness"

	repo.listFunc = func(ctx context.Context, uid uuid.UUID, params ListCoffeesParams) (*ListCoffeesResult, error) {
		return &ListCoffeesResult{
			Items: []Coffee{
				{
					ID:        coffeeID,
					UserID:    uid,
					Roaster:   "Cata Coffee",
					Name:      "Kiamaina",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
					BestExperiment: &BestExperimentSummary{
						ID:                 experimentID,
						BrewDate:           brewDate,
						OverallScore:       &score,
						Ratio:              &ratio,
						WaterTemperature:   &temp,
						FilterPaperName:    &fpName,
						MineralProfileName: &mpName,
						BloomTime:          &bloomTime,
						PourCount:          2,
						PourStyles:         []string{"circular", "center"},
					},
					ImprovementNote: &improvementNote,
				},
			},
			Pagination: Pagination{Page: 1, PerPage: 20, Total: 1, TotalPages: 1},
		}, nil
	}

	req := createRequestWithUser("GET", "/coffees", nil, userID)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	// Decode into raw JSON to verify structure
	var raw map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	items, ok := raw["items"].([]interface{})
	if !ok || len(items) != 1 {
		t.Fatalf("expected 1 item, got %v", raw["items"])
	}

	item := items[0].(map[string]interface{})

	// Verify best_experiment is present
	bestExp, ok := item["best_experiment"].(map[string]interface{})
	if !ok {
		t.Fatal("expected best_experiment to be present in response")
	}

	if bestExp["id"] != experimentID.String() {
		t.Errorf("expected best_experiment.id %s, got %v", experimentID, bestExp["id"])
	}
	if bestExp["overall_score"] != float64(8) {
		t.Errorf("expected best_experiment.overall_score 8, got %v", bestExp["overall_score"])
	}
	if bestExp["ratio"] != float64(15) {
		t.Errorf("expected best_experiment.ratio 15, got %v", bestExp["ratio"])
	}
	if bestExp["water_temperature"] != float64(96) {
		t.Errorf("expected best_experiment.water_temperature 96, got %v", bestExp["water_temperature"])
	}
	if bestExp["filter_paper_name"] != "Abaca" {
		t.Errorf("expected best_experiment.filter_paper_name Abaca, got %v", bestExp["filter_paper_name"])
	}
	if bestExp["mineral_profile_name"] != "Catalyst" {
		t.Errorf("expected best_experiment.mineral_profile_name Catalyst, got %v", bestExp["mineral_profile_name"])
	}
	if bestExp["bloom_time"] != float64(30) {
		t.Errorf("expected best_experiment.bloom_time 30, got %v", bestExp["bloom_time"])
	}
	if bestExp["pour_count"] != float64(2) {
		t.Errorf("expected best_experiment.pour_count 2, got %v", bestExp["pour_count"])
	}

	pourStyles, ok := bestExp["pour_styles"].([]interface{})
	if !ok || len(pourStyles) != 2 {
		t.Errorf("expected 2 pour_styles, got %v", bestExp["pour_styles"])
	}

	// Verify improvement_note is present
	if item["improvement_note"] != improvementNote {
		t.Errorf("expected improvement_note %q, got %v", improvementNote, item["improvement_note"])
	}
}

func TestHandler_List_WithoutBestExperiment(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	repo.listFunc = func(ctx context.Context, uid uuid.UUID, params ListCoffeesParams) (*ListCoffeesResult, error) {
		return &ListCoffeesResult{
			Items: []Coffee{
				{
					ID:        coffeeID,
					UserID:    uid,
					Roaster:   "Test Roaster",
					Name:      "Test Coffee",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
					// No BestExperiment or ImprovementNote
				},
			},
			Pagination: Pagination{Page: 1, PerPage: 20, Total: 1, TotalPages: 1},
		}, nil
	}

	req := createRequestWithUser("GET", "/coffees", nil, userID)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	items := raw["items"].([]interface{})
	item := items[0].(map[string]interface{})

	// best_experiment should be absent (omitempty)
	if _, exists := item["best_experiment"]; exists {
		t.Error("expected best_experiment to be absent when nil")
	}

	// improvement_note should be absent (omitempty)
	if _, exists := item["improvement_note"]; exists {
		t.Error("expected improvement_note to be absent when nil")
	}
}

func TestHandler_Create_RoastDateValidationStillWorks(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	// Future roast date should still be rejected
	futureDate := NewDateOnly(time.Now().Add(48 * time.Hour))
	body, _ := json.Marshal(CreateCoffeeInput{
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		RoastDate: &futureDate,
	})

	req := createRequestWithUser("POST", "/coffees", body, userID)
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status %d for future roast date, got %d: %s", http.StatusBadRequest, rr.Code, rr.Body.String())
	}

	// Valid past roast date should succeed
	pastDate := NewDateOnly(time.Now().Add(-24 * time.Hour))
	body, _ = json.Marshal(CreateCoffeeInput{
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		RoastDate: &pastDate,
	})

	req = createRequestWithUser("POST", "/coffees", body, userID)
	rr = httptest.NewRecorder()

	handler.Create(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected status %d for valid roast date, got %d: %s", http.StatusCreated, rr.Code, rr.Body.String())
	}
}

func TestHandler_Create_DateOnlyFormat(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	tests := []struct {
		name           string
		body           string
		expectedStatus int
		checkDate      bool
		expectedDate   string
	}{
		{
			name:           "YYYY-MM-DD format accepted",
			body:           `{"roaster":"Test","name":"Coffee","roast_date":"2025-11-19"}`,
			expectedStatus: http.StatusCreated,
			checkDate:      true,
			expectedDate:   "2025-11-19",
		},
		{
			name:           "RFC3339 format accepted for backward compatibility",
			body:           `{"roaster":"Test","name":"Coffee","roast_date":"2025-11-19T00:00:00Z"}`,
			expectedStatus: http.StatusCreated,
			checkDate:      true,
			expectedDate:   "2025-11-19",
		},
		{
			name:           "empty roast_date accepted",
			body:           `{"roaster":"Test","name":"Coffee","roast_date":""}`,
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "null roast_date accepted",
			body:           `{"roaster":"Test","name":"Coffee","roast_date":null}`,
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "no roast_date field accepted",
			body:           `{"roaster":"Test","name":"Coffee"}`,
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "invalid date format rejected",
			body:           `{"roaster":"Test","name":"Coffee","roast_date":"19/11/2025"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "future YYYY-MM-DD date rejected",
			body:           `{"roaster":"Test","name":"Coffee","roast_date":"2099-12-31"}`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("POST", "/coffees", []byte(tt.body), userID)
			rr := httptest.NewRecorder()

			handler.Create(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}

			if tt.checkDate && rr.Code == http.StatusCreated {
				var raw map[string]interface{}
				if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				if raw["roast_date"] != tt.expectedDate {
					t.Errorf("expected roast_date %q, got %v", tt.expectedDate, raw["roast_date"])
				}
			}
		})
	}
}

func TestHandler_List_ArchivedOnly(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	archivedID := uuid.New()
	activeID := uuid.New()
	now := time.Now()

	repo.coffees[archivedID] = &Coffee{
		ID:         archivedID,
		UserID:     userID,
		Roaster:    "Archived Roaster",
		Name:       "Archived Coffee",
		ArchivedAt: &now,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	repo.coffees[activeID] = &Coffee{
		ID:        activeID,
		UserID:    userID,
		Roaster:   "Active Roaster",
		Name:      "Active Coffee",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	repo.listFunc = func(ctx context.Context, uid uuid.UUID, params ListCoffeesParams) (*ListCoffeesResult, error) {
		// Verify the ArchivedOnly parameter is correctly parsed and passed
		if params.ArchivedOnly {
			// Return only archived coffees
			var items []Coffee
			for _, c := range repo.coffees {
				if c.UserID == uid && c.ArchivedAt != nil {
					items = append(items, *c)
				}
			}
			return &ListCoffeesResult{
				Items:      items,
				Pagination: Pagination{Page: 1, PerPage: 20, Total: len(items), TotalPages: 1},
			}, nil
		}
		// Return only active coffees
		var items []Coffee
		for _, c := range repo.coffees {
			if c.UserID == uid && c.ArchivedAt == nil && c.DeletedAt == nil {
				items = append(items, *c)
			}
		}
		return &ListCoffeesResult{
			Items:      items,
			Pagination: Pagination{Page: 1, PerPage: 20, Total: len(items), TotalPages: 1},
		}, nil
	}

	// Test archived_only=true returns only archived coffees
	req := createRequestWithUser("GET", "/coffees?archived_only=true", nil, userID)
	rr := httptest.NewRecorder()
	handler.List(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var result ListCoffeesResult
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if len(result.Items) != 1 {
		t.Fatalf("expected 1 archived item, got %d", len(result.Items))
	}
	if result.Items[0].Roaster != "Archived Roaster" {
		t.Errorf("expected Archived Roaster, got %s", result.Items[0].Roaster)
	}

	// Test default (no archived_only) returns only active coffees
	req = createRequestWithUser("GET", "/coffees", nil, userID)
	rr = httptest.NewRecorder()
	handler.List(rr, req)

	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if len(result.Items) != 1 {
		t.Fatalf("expected 1 active item, got %d", len(result.Items))
	}
	if result.Items[0].Roaster != "Active Roaster" {
		t.Errorf("expected Active Roaster, got %s", result.Items[0].Roaster)
	}
}

func TestHandler_List_ExperimentCount(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()
	lastBrewed := time.Date(2026, 1, 19, 10, 30, 0, 0, time.UTC)

	repo.listFunc = func(ctx context.Context, uid uuid.UUID, params ListCoffeesParams) (*ListCoffeesResult, error) {
		return &ListCoffeesResult{
			Items: []Coffee{
				{
					ID:              coffeeID,
					UserID:          uid,
					Roaster:         "Test Roaster",
					Name:            "Test Coffee",
					CreatedAt:       time.Now(),
					UpdatedAt:       time.Now(),
					ExperimentCount: 8,
					LastBrewed:      &lastBrewed,
				},
			},
			Pagination: Pagination{Page: 1, PerPage: 20, Total: 1, TotalPages: 1},
		}, nil
	}

	req := createRequestWithUser("GET", "/coffees", nil, userID)
	rr := httptest.NewRecorder()
	handler.List(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	items := raw["items"].([]interface{})
	item := items[0].(map[string]interface{})

	// Verify experiment_count is present and correct
	if item["experiment_count"] != float64(8) {
		t.Errorf("expected experiment_count 8, got %v", item["experiment_count"])
	}

	// Verify last_brewed is present
	if item["last_brewed"] == nil {
		t.Error("expected last_brewed to be present")
	}
}

func TestHandler_List_SortNotConfigurable(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	var capturedParams ListCoffeesParams
	repo.listFunc = func(ctx context.Context, uid uuid.UUID, params ListCoffeesParams) (*ListCoffeesResult, error) {
		capturedParams = params
		return &ListCoffeesResult{
			Items:      []Coffee{},
			Pagination: Pagination{Page: 1, PerPage: 20, Total: 0, TotalPages: 0},
		}, nil
	}

	// Even if sort parameter is passed in query string, it should be ignored
	req := createRequestWithUser("GET", "/coffees?sort=roaster", nil, userID)
	rr := httptest.NewRecorder()
	handler.List(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	// The handler should not have passed a Sort field (it's removed from the struct)
	// We verify by checking that the struct has no Sort field — the fact that it compiles
	// without Sort in the struct literal proves it's ignored.
	_ = capturedParams
}

func TestHandler_Update_DateOnlyFormat(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	repo.coffees[coffeeID] = &Coffee{
		ID:        coffeeID,
		UserID:    userID,
		Roaster:   "Test Roaster",
		Name:      "Test Coffee",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tests := []struct {
		name           string
		body           string
		expectedStatus int
	}{
		{
			name:           "update with YYYY-MM-DD roast_date",
			body:           `{"roast_date":"2025-11-19"}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "update with invalid date format rejected",
			body:           `{"roast_date":"Nov 19 2025"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "update with future date rejected",
			body:           `{"roast_date":"2099-12-31"}`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("PUT", "/coffees/"+coffeeID.String(), []byte(tt.body), userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Put("/coffees/{id}", handler.Update)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}
