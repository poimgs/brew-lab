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

	futureDate := time.Now().Add(24 * time.Hour)
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
