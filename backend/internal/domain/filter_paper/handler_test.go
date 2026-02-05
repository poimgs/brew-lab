package filter_paper

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
	filterPapers map[uuid.UUID]*FilterPaper
	createFunc   func(ctx context.Context, userID uuid.UUID, input CreateFilterPaperInput) (*FilterPaper, error)
	getFunc      func(ctx context.Context, userID, filterPaperID uuid.UUID) (*FilterPaper, error)
	listFunc     func(ctx context.Context, userID uuid.UUID, params ListFilterPapersParams) (*ListFilterPapersResult, error)
	updateFunc   func(ctx context.Context, userID, filterPaperID uuid.UUID, input UpdateFilterPaperInput) (*FilterPaper, error)
	deleteFunc   func(ctx context.Context, userID, filterPaperID uuid.UUID) error
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		filterPapers: make(map[uuid.UUID]*FilterPaper),
	}
}

func (m *mockRepository) Create(ctx context.Context, userID uuid.UUID, input CreateFilterPaperInput) (*FilterPaper, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, userID, input)
	}

	// Check for duplicates
	for _, fp := range m.filterPapers {
		if fp.UserID == userID && fp.Name == input.Name && fp.DeletedAt == nil {
			return nil, ErrFilterPaperDuplicate
		}
	}

	fp := &FilterPaper{
		ID:        uuid.New(),
		UserID:    userID,
		Name:      input.Name,
		Brand:     input.Brand,
		Notes:     input.Notes,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	m.filterPapers[fp.ID] = fp
	return fp, nil
}

func (m *mockRepository) GetByID(ctx context.Context, userID, filterPaperID uuid.UUID) (*FilterPaper, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, userID, filterPaperID)
	}
	fp, ok := m.filterPapers[filterPaperID]
	if !ok || fp.UserID != userID || fp.DeletedAt != nil {
		return nil, ErrFilterPaperNotFound
	}
	return fp, nil
}

func (m *mockRepository) List(ctx context.Context, userID uuid.UUID, params ListFilterPapersParams) (*ListFilterPapersResult, error) {
	if m.listFunc != nil {
		return m.listFunc(ctx, userID, params)
	}
	var items []FilterPaper
	for _, fp := range m.filterPapers {
		if fp.UserID == userID && fp.DeletedAt == nil {
			items = append(items, *fp)
		}
	}
	return &ListFilterPapersResult{
		Items: items,
		Pagination: Pagination{
			Page:       1,
			PerPage:    20,
			Total:      len(items),
			TotalPages: 1,
		},
	}, nil
}

func (m *mockRepository) Update(ctx context.Context, userID, filterPaperID uuid.UUID, input UpdateFilterPaperInput) (*FilterPaper, error) {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, userID, filterPaperID, input)
	}
	fp, ok := m.filterPapers[filterPaperID]
	if !ok || fp.UserID != userID || fp.DeletedAt != nil {
		return nil, ErrFilterPaperNotFound
	}

	// Check for duplicates if name is being changed
	if input.Name != nil {
		for _, other := range m.filterPapers {
			if other.ID != filterPaperID && other.UserID == userID && other.Name == *input.Name && other.DeletedAt == nil {
				return nil, ErrFilterPaperDuplicate
			}
		}
		fp.Name = *input.Name
	}
	if input.Brand != nil {
		fp.Brand = input.Brand
	}
	if input.Notes != nil {
		fp.Notes = input.Notes
	}
	fp.UpdatedAt = time.Now()
	return fp, nil
}

func (m *mockRepository) Delete(ctx context.Context, userID, filterPaperID uuid.UUID) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, userID, filterPaperID)
	}
	fp, ok := m.filterPapers[filterPaperID]
	if !ok || fp.UserID != userID || fp.DeletedAt != nil {
		return ErrFilterPaperNotFound
	}
	now := time.Now()
	fp.DeletedAt = &now
	return nil
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
			name: "valid filter paper creation",
			body: CreateFilterPaperInput{
				Name: "Abaca",
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "valid filter paper with all fields",
			body: CreateFilterPaperInput{
				Name:  "Tabbed",
				Brand: strPtr("Hario"),
				Notes: strPtr("Standard V60 filter"),
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "missing name",
			body: CreateFilterPaperInput{
				Brand: strPtr("Cafec"),
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

			req := createRequestWithUser("POST", "/filter-papers", body, userID)
			rr := httptest.NewRecorder()

			handler.Create(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Create_Duplicate(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()

	// Create first filter paper
	id := uuid.New()
	repo.filterPapers[id] = &FilterPaper{
		ID:        id,
		UserID:    userID,
		Name:      "Abaca",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Try to create duplicate
	body, _ := json.Marshal(CreateFilterPaperInput{Name: "Abaca"})
	req := createRequestWithUser("POST", "/filter-papers", body, userID)
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	if rr.Code != http.StatusConflict {
		t.Errorf("expected status %d for duplicate, got %d: %s", http.StatusConflict, rr.Code, rr.Body.String())
	}
}

func TestHandler_Get(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	filterPaperID := uuid.New()

	// Add a filter paper to the mock repo
	repo.filterPapers[filterPaperID] = &FilterPaper{
		ID:        filterPaperID,
		UserID:    userID,
		Name:      "Abaca",
		Brand:     strPtr("Cafec"),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tests := []struct {
		name           string
		filterPaperID  string
		expectedStatus int
	}{
		{
			name:           "existing filter paper",
			filterPaperID:  filterPaperID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "non-existent filter paper",
			filterPaperID:  uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid uuid",
			filterPaperID:  "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("GET", "/filter-papers/"+tt.filterPaperID, nil, userID)
			rr := httptest.NewRecorder()

			// Use chi router to handle URL params
			r := chi.NewRouter()
			r.Get("/filter-papers/{id}", handler.Get)
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

	// Add some filter papers
	for i := 0; i < 3; i++ {
		id := uuid.New()
		repo.filterPapers[id] = &FilterPaper{
			ID:        id,
			UserID:    userID,
			Name:      "Test Filter",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	}

	req := createRequestWithUser("GET", "/filter-papers", nil, userID)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	var result ListFilterPapersResult
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if len(result.Items) != 3 {
		t.Errorf("expected 3 items, got %d", len(result.Items))
	}
}

func TestHandler_Update(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	filterPaperID := uuid.New()

	// Add a filter paper to the mock repo
	repo.filterPapers[filterPaperID] = &FilterPaper{
		ID:        filterPaperID,
		UserID:    userID,
		Name:      "Abaca",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tests := []struct {
		name           string
		filterPaperID  string
		body           interface{}
		expectedStatus int
	}{
		{
			name:          "update name",
			filterPaperID: filterPaperID.String(),
			body: UpdateFilterPaperInput{
				Name: strPtr("Tabbed"),
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:          "update brand",
			filterPaperID: filterPaperID.String(),
			body: UpdateFilterPaperInput{
				Brand: strPtr("Hario"),
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:          "non-existent filter paper",
			filterPaperID: uuid.New().String(),
			body: UpdateFilterPaperInput{
				Name: strPtr("New Name"),
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:          "empty name",
			filterPaperID: filterPaperID.String(),
			body: UpdateFilterPaperInput{
				Name: strPtr(""),
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.body)
			if err != nil {
				t.Fatal(err)
			}

			req := createRequestWithUser("PUT", "/filter-papers/"+tt.filterPaperID, body, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Put("/filter-papers/{id}", handler.Update)
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
	filterPaperID := uuid.New()

	// Add a filter paper to the mock repo
	repo.filterPapers[filterPaperID] = &FilterPaper{
		ID:        filterPaperID,
		UserID:    userID,
		Name:      "Abaca",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tests := []struct {
		name           string
		filterPaperID  string
		expectedStatus int
	}{
		{
			name:           "delete existing filter paper",
			filterPaperID:  filterPaperID.String(),
			expectedStatus: http.StatusNoContent,
		},
		{
			name:           "delete non-existent filter paper",
			filterPaperID:  uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("DELETE", "/filter-papers/"+tt.filterPaperID, nil, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Delete("/filter-papers/{id}", handler.Delete)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_UserIsolation(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	user1ID := uuid.New()
	user2ID := uuid.New()
	filterPaperID := uuid.New()

	// Add a filter paper for user1
	repo.filterPapers[filterPaperID] = &FilterPaper{
		ID:        filterPaperID,
		UserID:    user1ID,
		Name:      "Abaca",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Try to access with user2
	req := createRequestWithUser("GET", "/filter-papers/"+filterPaperID.String(), nil, user2ID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/filter-papers/{id}", handler.Get)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected status %d for cross-user access, got %d", http.StatusNotFound, rr.Code)
	}
}

func TestHandler_SoftDelete(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	filterPaperID := uuid.New()
	now := time.Now()

	// Add a soft-deleted filter paper
	repo.filterPapers[filterPaperID] = &FilterPaper{
		ID:        filterPaperID,
		UserID:    userID,
		Name:      "Deleted Filter",
		DeletedAt: &now,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Try to get deleted filter paper
	req := createRequestWithUser("GET", "/filter-papers/"+filterPaperID.String(), nil, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/filter-papers/{id}", handler.Get)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected status %d for soft-deleted filter paper, got %d", http.StatusNotFound, rr.Code)
	}
}

func TestHandler_Unauthorized(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	// Request without user context
	req := httptest.NewRequest("GET", "/filter-papers", nil)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

// Helper function to create string pointer
func strPtr(s string) *string {
	return &s
}
