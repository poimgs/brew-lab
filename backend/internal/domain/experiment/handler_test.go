package experiment

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
	experiments map[uuid.UUID]*Experiment
	createFunc  func(ctx context.Context, userID uuid.UUID, input CreateExperimentInput) (*Experiment, error)
	getFunc     func(ctx context.Context, userID, experimentID uuid.UUID) (*Experiment, error)
	listFunc    func(ctx context.Context, userID uuid.UUID, params ListExperimentsParams) (*ListExperimentsResult, error)
	listAllFunc func(ctx context.Context, userID uuid.UUID, params ListExperimentsParams) ([]Experiment, error)
	updateFunc  func(ctx context.Context, userID, experimentID uuid.UUID, input UpdateExperimentInput) (*Experiment, error)
	deleteFunc  func(ctx context.Context, userID, experimentID uuid.UUID) error
	copyFunc    func(ctx context.Context, userID, experimentID uuid.UUID) (*Experiment, error)
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		experiments: make(map[uuid.UUID]*Experiment),
	}
}

func (m *mockRepository) Create(ctx context.Context, userID uuid.UUID, input CreateExperimentInput) (*Experiment, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, userID, input)
	}
	exp := &Experiment{
		ID:           uuid.New(),
		UserID:       userID,
		CoffeeID:     input.CoffeeID,
		BrewDate:     time.Now(),
		OverallNotes: input.OverallNotes,
		OverallScore: input.OverallScore,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		Coffee: &CoffeeSummary{
			ID:      input.CoffeeID,
			Roaster: "Test Roaster",
			Name:    "Test Coffee",
		},
	}
	m.experiments[exp.ID] = exp
	return exp, nil
}

func (m *mockRepository) GetByID(ctx context.Context, userID, experimentID uuid.UUID) (*Experiment, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, userID, experimentID)
	}
	exp, ok := m.experiments[experimentID]
	if !ok || exp.UserID != userID {
		return nil, ErrExperimentNotFound
	}
	return exp, nil
}

func (m *mockRepository) List(ctx context.Context, userID uuid.UUID, params ListExperimentsParams) (*ListExperimentsResult, error) {
	if m.listFunc != nil {
		return m.listFunc(ctx, userID, params)
	}
	var items []Experiment
	for _, e := range m.experiments {
		if e.UserID == userID {
			items = append(items, *e)
		}
	}
	return &ListExperimentsResult{
		Items: items,
		Pagination: Pagination{
			Page:       1,
			PerPage:    20,
			Total:      len(items),
			TotalPages: 1,
		},
	}, nil
}

func (m *mockRepository) ListAll(ctx context.Context, userID uuid.UUID, params ListExperimentsParams) ([]Experiment, error) {
	if m.listAllFunc != nil {
		return m.listAllFunc(ctx, userID, params)
	}
	var items []Experiment
	for _, e := range m.experiments {
		if e.UserID == userID {
			items = append(items, *e)
		}
	}
	return items, nil
}

func (m *mockRepository) Update(ctx context.Context, userID, experimentID uuid.UUID, input UpdateExperimentInput) (*Experiment, error) {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, userID, experimentID, input)
	}
	exp, ok := m.experiments[experimentID]
	if !ok || exp.UserID != userID {
		return nil, ErrExperimentNotFound
	}
	if input.OverallNotes != nil {
		exp.OverallNotes = *input.OverallNotes
	}
	if input.OverallScore != nil {
		exp.OverallScore = input.OverallScore
	}
	exp.UpdatedAt = time.Now()
	return exp, nil
}

func (m *mockRepository) Delete(ctx context.Context, userID, experimentID uuid.UUID) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, userID, experimentID)
	}
	exp, ok := m.experiments[experimentID]
	if !ok || exp.UserID != userID {
		return ErrExperimentNotFound
	}
	delete(m.experiments, experimentID)
	return nil
}

func (m *mockRepository) CopyAsTemplate(ctx context.Context, userID, experimentID uuid.UUID) (*Experiment, error) {
	if m.copyFunc != nil {
		return m.copyFunc(ctx, userID, experimentID)
	}
	original, ok := m.experiments[experimentID]
	if !ok || original.UserID != userID {
		return nil, ErrExperimentNotFound
	}
	newExp := &Experiment{
		ID:           uuid.New(),
		UserID:       userID,
		CoffeeID:     original.CoffeeID,
		BrewDate:     time.Now(),
		CoffeeWeight: original.CoffeeWeight,
		WaterWeight:  original.WaterWeight,
		Ratio:        original.Ratio,
		GrindSize:    original.GrindSize,
		OverallNotes: "", // Cleared
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		Coffee:       original.Coffee,
	}
	m.experiments[newExp.ID] = newExp
	return newExp, nil
}

func (m *mockRepository) GetByIDs(ctx context.Context, userID uuid.UUID, experimentIDs []uuid.UUID) ([]Experiment, error) {
	var result []Experiment
	for _, id := range experimentIDs {
		if exp, ok := m.experiments[id]; ok && exp.UserID == userID {
			result = append(result, *exp)
		}
	}
	if result == nil {
		result = []Experiment{}
	}
	return result, nil
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
	coffeeID := uuid.New()

	tests := []struct {
		name           string
		body           interface{}
		expectedStatus int
	}{
		{
			name: "valid experiment creation with minimal fields",
			body: CreateExperimentInput{
				CoffeeID:     coffeeID,
				OverallNotes: "This was a great brew with bright acidity",
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "valid experiment with all fields",
			body: CreateExperimentInput{
				CoffeeID:         coffeeID,
				OverallNotes:     "Excellent brew with complex flavors",
				OverallScore:     intPtr(8),
				CoffeeWeight:     floatPtr(15.0),
				WaterWeight:      floatPtr(225.0),
				Ratio:            floatPtr(15.0),
				GrindSize:        floatPtr(3.5),
				WaterTemperature: floatPtr(92.0),
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "missing coffee_id",
			body: CreateExperimentInput{
				OverallNotes: "This is a test note for the experiment",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "overall_notes too short",
			body: CreateExperimentInput{
				CoffeeID:     coffeeID,
				OverallNotes: "Short",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "invalid overall_score (too high)",
			body: CreateExperimentInput{
				CoffeeID:     coffeeID,
				OverallNotes: "This is a valid test note for the experiment",
				OverallScore: intPtr(11),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "invalid overall_score (too low)",
			body: CreateExperimentInput{
				CoffeeID:     coffeeID,
				OverallNotes: "This is a valid test note for the experiment",
				OverallScore: intPtr(0),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "invalid water_temperature (too high)",
			body: CreateExperimentInput{
				CoffeeID:         coffeeID,
				OverallNotes:     "This is a valid test note for the experiment",
				WaterTemperature: floatPtr(150.0),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "negative coffee_weight",
			body: CreateExperimentInput{
				CoffeeID:     coffeeID,
				OverallNotes: "This is a valid test note for the experiment",
				CoffeeWeight: floatPtr(-5.0),
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

			req := createRequestWithUser("POST", "/experiments", body, userID)
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
	experimentID := uuid.New()
	coffeeID := uuid.New()

	// Add an experiment to the mock repo
	repo.experiments[experimentID] = &Experiment{
		ID:           experimentID,
		UserID:       userID,
		CoffeeID:     coffeeID,
		BrewDate:     time.Now(),
		OverallNotes: "Test notes for this experiment",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		Coffee: &CoffeeSummary{
			ID:      coffeeID,
			Roaster: "Test Roaster",
			Name:    "Test Coffee",
		},
	}

	tests := []struct {
		name           string
		experimentID   string
		expectedStatus int
	}{
		{
			name:           "existing experiment",
			experimentID:   experimentID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "non-existent experiment",
			experimentID:   uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid uuid",
			experimentID:   "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("GET", "/experiments/"+tt.experimentID, nil, userID)
			rr := httptest.NewRecorder()

			// Use chi router to handle URL params
			r := chi.NewRouter()
			r.Get("/experiments/{id}", handler.Get)
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
	coffeeID := uuid.New()

	// Add some experiments
	for i := 0; i < 3; i++ {
		id := uuid.New()
		repo.experiments[id] = &Experiment{
			ID:           id,
			UserID:       userID,
			CoffeeID:     coffeeID,
			BrewDate:     time.Now(),
			OverallNotes: "Test notes for experiment",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}
	}

	req := createRequestWithUser("GET", "/experiments", nil, userID)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	var result ListExperimentsResult
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if len(result.Items) != 3 {
		t.Errorf("expected 3 items, got %d", len(result.Items))
	}
}

func TestHandler_List_WithFilters(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	// Test with various query parameters
	tests := []struct {
		name           string
		query          string
		expectedStatus int
	}{
		{
			name:           "filter by coffee_id",
			query:          "?coffee_id=" + uuid.New().String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by score range",
			query:          "?score_gte=5&score_lte=8",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by has_tds",
			query:          "?has_tds=true",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by date range",
			query:          "?date_from=2024-01-01&date_to=2024-12-31",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "with pagination",
			query:          "?page=1&per_page=10",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "with sort",
			query:          "?sort=-brew_date",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("GET", "/experiments"+tt.query, nil, userID)
			rr := httptest.NewRecorder()

			handler.List(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Update(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	experimentID := uuid.New()
	coffeeID := uuid.New()

	// Add an experiment to the mock repo
	repo.experiments[experimentID] = &Experiment{
		ID:           experimentID,
		UserID:       userID,
		CoffeeID:     coffeeID,
		BrewDate:     time.Now(),
		OverallNotes: "Original notes for this experiment",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	tests := []struct {
		name           string
		experimentID   string
		body           interface{}
		expectedStatus int
	}{
		{
			name:         "update overall_notes",
			experimentID: experimentID.String(),
			body: UpdateExperimentInput{
				OverallNotes: strPtr("Updated notes for this experiment"),
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:         "update overall_score",
			experimentID: experimentID.String(),
			body: UpdateExperimentInput{
				OverallScore: intPtr(9),
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:         "invalid score (too high)",
			experimentID: experimentID.String(),
			body: UpdateExperimentInput{
				OverallScore: intPtr(15),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:         "overall_notes too short",
			experimentID: experimentID.String(),
			body: UpdateExperimentInput{
				OverallNotes: strPtr("Short"),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "non-existent experiment",
			experimentID:   uuid.New().String(),
			body:           UpdateExperimentInput{},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.body)
			if err != nil {
				t.Fatal(err)
			}

			req := createRequestWithUser("PUT", "/experiments/"+tt.experimentID, body, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Put("/experiments/{id}", handler.Update)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Delete(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	experimentID := uuid.New()
	coffeeID := uuid.New()

	// Add an experiment to the mock repo
	repo.experiments[experimentID] = &Experiment{
		ID:           experimentID,
		UserID:       userID,
		CoffeeID:     coffeeID,
		BrewDate:     time.Now(),
		OverallNotes: "Test notes for the experiment",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	tests := []struct {
		name           string
		experimentID   string
		expectedStatus int
	}{
		{
			name:           "delete existing experiment",
			experimentID:   experimentID.String(),
			expectedStatus: http.StatusNoContent,
		},
		{
			name:           "delete non-existent experiment",
			experimentID:   uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("DELETE", "/experiments/"+tt.experimentID, nil, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Delete("/experiments/{id}", handler.Delete)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Copy(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	experimentID := uuid.New()
	coffeeID := uuid.New()

	// Add an experiment to the mock repo
	coffeeWeight := 15.0
	waterWeight := 225.0
	repo.experiments[experimentID] = &Experiment{
		ID:           experimentID,
		UserID:       userID,
		CoffeeID:     coffeeID,
		BrewDate:     time.Now(),
		CoffeeWeight: &coffeeWeight,
		WaterWeight:  &waterWeight,
		OverallNotes: "Original notes for the experiment",
		OverallScore: intPtr(8),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		Coffee: &CoffeeSummary{
			ID:      coffeeID,
			Roaster: "Test Roaster",
			Name:    "Test Coffee",
		},
	}

	tests := []struct {
		name           string
		experimentID   string
		expectedStatus int
	}{
		{
			name:           "copy existing experiment",
			experimentID:   experimentID.String(),
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "copy non-existent experiment",
			experimentID:   uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid uuid",
			experimentID:   "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("POST", "/experiments/"+tt.experimentID+"/copy", nil, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Post("/experiments/{id}/copy", handler.Copy)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}

			// For successful copy, verify response structure
			if tt.expectedStatus == http.StatusCreated {
				var exp Experiment
				if err := json.NewDecoder(rr.Body).Decode(&exp); err != nil {
					t.Fatal(err)
				}
				// Verify notes were cleared
				if exp.OverallNotes != "" {
					t.Error("expected overall_notes to be cleared in copied experiment")
				}
				// Verify parameters were copied
				if exp.CoffeeWeight == nil || *exp.CoffeeWeight != coffeeWeight {
					t.Error("expected coffee_weight to be copied")
				}
			}
		})
	}
}

func TestHandler_Create_Unauthorized(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	// Create request without user context
	body, _ := json.Marshal(CreateExperimentInput{
		CoffeeID:     uuid.New(),
		OverallNotes: "This is a test note for the experiment",
	})

	req := httptest.NewRequest("POST", "/experiments", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

func TestHandler_IntensityValidation(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	tests := []struct {
		name           string
		intensity      *int
		fieldName      string
		expectedStatus int
	}{
		{
			name:           "valid aroma_intensity",
			intensity:      intPtr(5),
			fieldName:      "aroma_intensity",
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "aroma_intensity too low",
			intensity:      intPtr(0),
			fieldName:      "aroma_intensity",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "aroma_intensity too high",
			intensity:      intPtr(11),
			fieldName:      "aroma_intensity",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := CreateExperimentInput{
				CoffeeID:       coffeeID,
				OverallNotes:   "This is a valid test note for the experiment",
				AromaIntensity: tt.intensity,
			}

			body, err := json.Marshal(input)
			if err != nil {
				t.Fatal(err)
			}

			req := createRequestWithUser("POST", "/experiments", body, userID)
			rr := httptest.NewRecorder()

			handler.Create(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Export_CSV(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()
	experimentID := uuid.New()
	coffeeWeight := 15.0
	waterWeight := 225.0

	// Add an experiment to the mock repo
	repo.experiments[experimentID] = &Experiment{
		ID:           experimentID,
		UserID:       userID,
		CoffeeID:     coffeeID,
		BrewDate:     time.Date(2026, 1, 20, 10, 30, 0, 0, time.UTC),
		CoffeeWeight: &coffeeWeight,
		WaterWeight:  &waterWeight,
		OverallNotes: "Test notes for export",
		OverallScore: intPtr(8),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		Coffee: &CoffeeSummary{
			ID:      coffeeID,
			Roaster: "Test Roaster",
			Name:    "Test Coffee",
		},
	}

	req := createRequestWithUser("GET", "/experiments/export?format=csv", nil, userID)
	rr := httptest.NewRecorder()

	handler.Export(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	// Check Content-Type header
	contentType := rr.Header().Get("Content-Type")
	if contentType != "text/csv" {
		t.Errorf("expected Content-Type text/csv, got %s", contentType)
	}

	// Check Content-Disposition header
	contentDisposition := rr.Header().Get("Content-Disposition")
	if contentDisposition != "attachment; filename=experiments.csv" {
		t.Errorf("expected Content-Disposition with filename, got %s", contentDisposition)
	}

	// Check that CSV contains data
	body := rr.Body.String()
	if len(body) == 0 {
		t.Error("expected non-empty CSV body")
	}

	// Check header row contains expected columns
	if !contains(body, "id") || !contains(body, "brew_date") || !contains(body, "coffee_name") {
		t.Error("expected CSV header to contain standard columns")
	}

	// Check data row contains expected values
	if !contains(body, "Test Coffee") || !contains(body, "Test Roaster") {
		t.Error("expected CSV to contain experiment data")
	}
}

func TestHandler_Export_JSON(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()
	experimentID := uuid.New()
	coffeeWeight := 15.0

	// Add an experiment to the mock repo
	repo.experiments[experimentID] = &Experiment{
		ID:           experimentID,
		UserID:       userID,
		CoffeeID:     coffeeID,
		BrewDate:     time.Date(2026, 1, 20, 10, 30, 0, 0, time.UTC),
		CoffeeWeight: &coffeeWeight,
		OverallNotes: "Test notes for JSON export",
		OverallScore: intPtr(7),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		Coffee: &CoffeeSummary{
			ID:      coffeeID,
			Roaster: "JSON Roaster",
			Name:    "JSON Coffee",
		},
	}

	req := createRequestWithUser("GET", "/experiments/export?format=json", nil, userID)
	rr := httptest.NewRecorder()

	handler.Export(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	// Check Content-Type header
	contentType := rr.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", contentType)
	}

	// Check Content-Disposition header
	contentDisposition := rr.Header().Get("Content-Disposition")
	if contentDisposition != "attachment; filename=experiments.json" {
		t.Errorf("expected Content-Disposition with filename, got %s", contentDisposition)
	}

	// Parse JSON response
	var experiments []Experiment
	if err := json.NewDecoder(rr.Body).Decode(&experiments); err != nil {
		t.Fatalf("failed to decode JSON response: %v", err)
	}

	if len(experiments) != 1 {
		t.Errorf("expected 1 experiment, got %d", len(experiments))
	}

	if experiments[0].ID != experimentID {
		t.Errorf("expected experiment ID %s, got %s", experimentID, experiments[0].ID)
	}
}

func TestHandler_Export_DefaultFormat(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	// Request without format parameter should default to CSV
	req := createRequestWithUser("GET", "/experiments/export", nil, userID)
	rr := httptest.NewRecorder()

	handler.Export(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	contentType := rr.Header().Get("Content-Type")
	if contentType != "text/csv" {
		t.Errorf("expected default Content-Type text/csv, got %s", contentType)
	}
}

func TestHandler_Export_InvalidFormat(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	req := createRequestWithUser("GET", "/experiments/export?format=xml", nil, userID)
	rr := httptest.NewRecorder()

	handler.Export(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d: %s", http.StatusBadRequest, rr.Code, rr.Body.String())
	}
}

func TestHandler_Export_WithFilters(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	// Add multiple experiments
	for i := 0; i < 3; i++ {
		id := uuid.New()
		score := 5 + i
		repo.experiments[id] = &Experiment{
			ID:           id,
			UserID:       userID,
			CoffeeID:     coffeeID,
			BrewDate:     time.Now().AddDate(0, 0, -i),
			OverallNotes: "Test notes for experiment",
			OverallScore: &score,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
			Coffee: &CoffeeSummary{
				ID:      coffeeID,
				Roaster: "Filter Roaster",
				Name:    "Filter Coffee",
			},
		}
	}

	tests := []struct {
		name           string
		query          string
		expectedStatus int
	}{
		{
			name:           "filter by score_gte",
			query:          "?format=json&score_gte=6",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by date range",
			query:          "?format=json&date_from=2024-01-01&date_to=2027-12-31",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by coffee_id",
			query:          "?format=json&coffee_id=" + coffeeID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "sort by brew_date",
			query:          "?format=json&sort=-brew_date",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("GET", "/experiments/export"+tt.query, nil, userID)
			rr := httptest.NewRecorder()

			handler.Export(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Export_Unauthorized(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	// Create request without user context
	req := httptest.NewRequest("GET", "/experiments/export", nil)
	rr := httptest.NewRecorder()

	handler.Export(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

func TestHandler_Export_EmptyResult(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	// Empty repo - no experiments
	req := createRequestWithUser("GET", "/experiments/export?format=json", nil, userID)
	rr := httptest.NewRecorder()

	handler.Export(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var experiments []Experiment
	if err := json.NewDecoder(rr.Body).Decode(&experiments); err != nil {
		t.Fatalf("failed to decode JSON response: %v", err)
	}

	if len(experiments) != 0 {
		t.Errorf("expected 0 experiments, got %d", len(experiments))
	}
}

func TestHandler_Create_NewSensoryFields(t *testing.T) {
	repo := newMockRepository()
	repo.createFunc = func(ctx context.Context, userID uuid.UUID, input CreateExperimentInput) (*Experiment, error) {
		exp := &Experiment{
			ID:                   uuid.New(),
			UserID:               userID,
			CoffeeID:             input.CoffeeID,
			BrewDate:             time.Now(),
			OverallNotes:         input.OverallNotes,
			OverallScore:         input.OverallScore,
			BrightnessIntensity:  input.BrightnessIntensity,
			BrightnessNotes:      input.BrightnessNotes,
			CleanlinessIntensity: input.CleanlinessIntensity,
			CleanlinessNotes:     input.CleanlinessNotes,
			ComplexityIntensity:  input.ComplexityIntensity,
			ComplexityNotes:      input.ComplexityNotes,
			BalanceIntensity:     input.BalanceIntensity,
			BalanceNotes:         input.BalanceNotes,
			CoffeeMl:             input.CoffeeMl,
			CreatedAt:            time.Now(),
			UpdatedAt:            time.Now(),
			Coffee: &CoffeeSummary{
				ID:      input.CoffeeID,
				Roaster: "Test Roaster",
				Name:    "Test Coffee",
			},
		}
		if input.IsDraft != nil {
			exp.IsDraft = *input.IsDraft
		}
		return exp, nil
	}

	handler := NewHandler(repo)
	userID := uuid.New()
	coffeeID := uuid.New()

	tests := []struct {
		name           string
		body           CreateExperimentInput
		expectedStatus int
	}{
		{
			name: "valid with all new sensory fields",
			body: CreateExperimentInput{
				CoffeeID:             coffeeID,
				OverallNotes:         "A well-balanced cup with complex flavors",
				OverallScore:         intPtr(8),
				BrightnessIntensity:  intPtr(7),
				BrightnessNotes:      strPtr("Citric brightness"),
				CleanlinessIntensity: intPtr(8),
				CleanlinessNotes:     strPtr("Very clean finish"),
				ComplexityIntensity:  intPtr(6),
				ComplexityNotes:      strPtr("Multiple flavor layers"),
				BalanceIntensity:     intPtr(9),
				BalanceNotes:         strPtr("Harmonious overall"),
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "valid with coffee_ml and is_draft",
			body: CreateExperimentInput{
				CoffeeID:     coffeeID,
				OverallNotes: "Draft experiment for testing purposes",
				CoffeeMl:     floatPtr(180.5),
				IsDraft:      boolPtr(true),
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "brightness_intensity too high",
			body: CreateExperimentInput{
				CoffeeID:            coffeeID,
				OverallNotes:        "Testing brightness validation with high value",
				BrightnessIntensity: intPtr(11),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "brightness_intensity too low",
			body: CreateExperimentInput{
				CoffeeID:            coffeeID,
				OverallNotes:        "Testing brightness validation with low value",
				BrightnessIntensity: intPtr(0),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "cleanliness_intensity out of range",
			body: CreateExperimentInput{
				CoffeeID:             coffeeID,
				OverallNotes:         "Testing cleanliness validation boundary",
				CleanlinessIntensity: intPtr(15),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "complexity_intensity out of range",
			body: CreateExperimentInput{
				CoffeeID:            coffeeID,
				OverallNotes:        "Testing complexity validation boundary",
				ComplexityIntensity: intPtr(-1),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "balance_intensity out of range",
			body: CreateExperimentInput{
				CoffeeID:         coffeeID,
				OverallNotes:     "Testing balance validation boundary value",
				BalanceIntensity: intPtr(0),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "valid boundary values at 1 and 10",
			body: CreateExperimentInput{
				CoffeeID:             coffeeID,
				OverallNotes:         "Testing boundary values one and ten",
				BrightnessIntensity:  intPtr(1),
				CleanlinessIntensity: intPtr(10),
				ComplexityIntensity:  intPtr(1),
				BalanceIntensity:     intPtr(10),
			},
			expectedStatus: http.StatusCreated,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.body)
			req := createRequestWithUser("POST", "/experiments", body, userID)
			rr := httptest.NewRecorder()

			handler.Create(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}

			// For successful creates, verify the response includes the new fields
			if tt.expectedStatus == http.StatusCreated {
				var exp Experiment
				if err := json.NewDecoder(rr.Body).Decode(&exp); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}

				if tt.body.BrightnessIntensity != nil && (exp.BrightnessIntensity == nil || *exp.BrightnessIntensity != *tt.body.BrightnessIntensity) {
					t.Errorf("brightness_intensity mismatch: got %v, want %v", exp.BrightnessIntensity, *tt.body.BrightnessIntensity)
				}
				if tt.body.CleanlinessIntensity != nil && (exp.CleanlinessIntensity == nil || *exp.CleanlinessIntensity != *tt.body.CleanlinessIntensity) {
					t.Errorf("cleanliness_intensity mismatch: got %v, want %v", exp.CleanlinessIntensity, *tt.body.CleanlinessIntensity)
				}
				if tt.body.ComplexityIntensity != nil && (exp.ComplexityIntensity == nil || *exp.ComplexityIntensity != *tt.body.ComplexityIntensity) {
					t.Errorf("complexity_intensity mismatch: got %v, want %v", exp.ComplexityIntensity, *tt.body.ComplexityIntensity)
				}
				if tt.body.BalanceIntensity != nil && (exp.BalanceIntensity == nil || *exp.BalanceIntensity != *tt.body.BalanceIntensity) {
					t.Errorf("balance_intensity mismatch: got %v, want %v", exp.BalanceIntensity, *tt.body.BalanceIntensity)
				}
				if tt.body.CoffeeMl != nil && (exp.CoffeeMl == nil || *exp.CoffeeMl != *tt.body.CoffeeMl) {
					t.Errorf("coffee_ml mismatch: got %v, want %v", exp.CoffeeMl, *tt.body.CoffeeMl)
				}
				if tt.body.IsDraft != nil && exp.IsDraft != *tt.body.IsDraft {
					t.Errorf("is_draft mismatch: got %v, want %v", exp.IsDraft, *tt.body.IsDraft)
				}
			}
		})
	}
}

func TestHandler_Create_Draft(t *testing.T) {
	repo := newMockRepository()
	repo.createFunc = func(ctx context.Context, userID uuid.UUID, input CreateExperimentInput) (*Experiment, error) {
		exp := &Experiment{
			ID:           uuid.New(),
			UserID:       userID,
			CoffeeID:     input.CoffeeID,
			BrewDate:     time.Now(),
			OverallNotes: input.OverallNotes,
			OverallScore: input.OverallScore,
			CoffeeWeight: input.CoffeeWeight,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
			Coffee: &CoffeeSummary{
				ID:      input.CoffeeID,
				Roaster: "Test Roaster",
				Name:    "Test Coffee",
			},
		}
		if input.IsDraft != nil {
			exp.IsDraft = *input.IsDraft
		}
		return exp, nil
	}

	handler := NewHandler(repo)
	userID := uuid.New()
	coffeeID := uuid.New()

	tests := []struct {
		name           string
		body           CreateExperimentInput
		expectedStatus int
		checkResponse  func(t *testing.T, exp *Experiment)
	}{
		{
			name: "draft with empty overall_notes is allowed",
			body: CreateExperimentInput{
				CoffeeID:     coffeeID,
				OverallNotes: "",
				IsDraft:      boolPtr(true),
				CoffeeWeight: floatPtr(15.0),
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, exp *Experiment) {
				if !exp.IsDraft {
					t.Error("expected is_draft to be true")
				}
				if exp.OverallNotes != "" {
					t.Errorf("expected empty overall_notes, got %q", exp.OverallNotes)
				}
			},
		},
		{
			name: "draft with short overall_notes is allowed",
			body: CreateExperimentInput{
				CoffeeID:     coffeeID,
				OverallNotes: "Short",
				IsDraft:      boolPtr(true),
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, exp *Experiment) {
				if !exp.IsDraft {
					t.Error("expected is_draft to be true")
				}
				if exp.OverallNotes != "Short" {
					t.Errorf("expected overall_notes 'Short', got %q", exp.OverallNotes)
				}
			},
		},
		{
			name: "non-draft with short overall_notes is rejected",
			body: CreateExperimentInput{
				CoffeeID:     coffeeID,
				OverallNotes: "Short",
				IsDraft:      boolPtr(false),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "non-draft without is_draft field still validates notes",
			body: CreateExperimentInput{
				CoffeeID:     coffeeID,
				OverallNotes: "Too short",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "draft still validates intensity scores",
			body: CreateExperimentInput{
				CoffeeID:       coffeeID,
				OverallNotes:   "",
				IsDraft:        boolPtr(true),
				AromaIntensity: intPtr(15),
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "draft still requires coffee_id",
			body: CreateExperimentInput{
				OverallNotes: "",
				IsDraft:      boolPtr(true),
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.body)
			req := createRequestWithUser("POST", "/experiments", body, userID)
			rr := httptest.NewRecorder()

			handler.Create(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}

			if tt.checkResponse != nil && rr.Code == tt.expectedStatus {
				var exp Experiment
				if err := json.NewDecoder(rr.Body).Decode(&exp); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				tt.checkResponse(t, &exp)
			}
		})
	}
}

func TestHandler_Update_Draft(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	experimentID := uuid.New()
	coffeeID := uuid.New()

	// Add an experiment to the mock repo
	repo.experiments[experimentID] = &Experiment{
		ID:           experimentID,
		UserID:       userID,
		CoffeeID:     coffeeID,
		BrewDate:     time.Now(),
		IsDraft:      true,
		OverallNotes: "",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	tests := []struct {
		name           string
		body           UpdateExperimentInput
		expectedStatus int
	}{
		{
			name: "update draft with short notes is allowed",
			body: UpdateExperimentInput{
				OverallNotes: strPtr("Short"),
				IsDraft:      boolPtr(true),
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "finalize draft with valid notes succeeds",
			body: UpdateExperimentInput{
				OverallNotes: strPtr("This is a valid note with enough characters"),
				IsDraft:      boolPtr(false),
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "finalize draft with short notes is rejected",
			body: UpdateExperimentInput{
				OverallNotes: strPtr("Short"),
				IsDraft:      boolPtr(false),
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.body)
			req := createRequestWithUser("PUT", "/experiments/"+experimentID.String(), body, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Put("/experiments/{id}", handler.Update)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

// Helper function for string contains check
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Helper functions
func intPtr(i int) *int {
	return &i
}

func floatPtr(f float64) *float64 {
	return &f
}

func strPtr(s string) *string {
	return &s
}

func boolPtr(b bool) *bool {
	return &b
}
