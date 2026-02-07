package session

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
	sessions    map[uuid.UUID]*Session
	brews map[uuid.UUID]*mockBrew // brew ID -> mock brew
	links       map[uuid.UUID][]uuid.UUID    // session ID -> brew IDs

	createFunc          func(ctx context.Context, userID uuid.UUID, input CreateSessionInput) (*Session, error)
	getByIDFunc         func(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error)
	listFunc            func(ctx context.Context, userID uuid.UUID, params ListSessionsParams) (*ListSessionsResult, error)
	updateFunc          func(ctx context.Context, userID, sessionID uuid.UUID, input UpdateSessionInput) (*Session, error)
	deleteFunc          func(ctx context.Context, userID, sessionID uuid.UUID) error
	linkFunc            func(ctx context.Context, userID, sessionID uuid.UUID, brewIDs []uuid.UUID) (*Session, error)
	unlinkFunc          func(ctx context.Context, userID, sessionID, brewID uuid.UUID) error
}

type mockBrew struct {
	ID       uuid.UUID
	CoffeeID uuid.UUID
	UserID   uuid.UUID
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		sessions:    make(map[uuid.UUID]*Session),
		brews: make(map[uuid.UUID]*mockBrew),
		links:       make(map[uuid.UUID][]uuid.UUID),
	}
}

func (m *mockRepository) Create(ctx context.Context, userID uuid.UUID, input CreateSessionInput) (*Session, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, userID, input)
	}
	s := &Session{
		ID:             uuid.New(),
		UserID:         userID,
		CoffeeID:       input.CoffeeID,
		Name:           input.Name,
		VariableTested: input.VariableTested,
		Hypothesis:     input.Hypothesis,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	if len(input.BrewIDs) > 0 {
		// Validate brews belong to same coffee
		for _, expID := range input.BrewIDs {
			exp, ok := m.brews[expID]
			if !ok {
				return nil, ErrBrewNotFound
			}
			if exp.CoffeeID != input.CoffeeID {
				return nil, ErrBrewWrongCoffee
			}
		}
		s.BrewCount = len(input.BrewIDs)
		m.links[s.ID] = input.BrewIDs
	}
	m.sessions[s.ID] = s
	return s, nil
}

func (m *mockRepository) GetByID(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, userID, sessionID)
	}
	s, ok := m.sessions[sessionID]
	if !ok || s.UserID != userID {
		return nil, ErrSessionNotFound
	}
	// Populate brews from links
	if expIDs, ok := m.links[sessionID]; ok {
		s.BrewCount = len(expIDs)
		var exps []BrewSummary
		for _, id := range expIDs {
			exps = append(exps, BrewSummary{
				ID:       id,
				BrewDate: time.Now(),
			})
		}
		s.Brews = exps
	}
	return s, nil
}

func (m *mockRepository) List(ctx context.Context, userID uuid.UUID, params ListSessionsParams) (*ListSessionsResult, error) {
	if m.listFunc != nil {
		return m.listFunc(ctx, userID, params)
	}
	var items []Session
	for _, s := range m.sessions {
		if s.UserID == userID && s.CoffeeID == params.CoffeeID {
			items = append(items, *s)
		}
	}
	if items == nil {
		items = []Session{}
	}
	return &ListSessionsResult{
		Items: items,
		Pagination: Pagination{
			Page:       1,
			PerPage:    20,
			Total:      len(items),
			TotalPages: 1,
		},
	}, nil
}

func (m *mockRepository) Update(ctx context.Context, userID, sessionID uuid.UUID, input UpdateSessionInput) (*Session, error) {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, userID, sessionID, input)
	}
	s, ok := m.sessions[sessionID]
	if !ok || s.UserID != userID {
		return nil, ErrSessionNotFound
	}
	if input.Name != nil {
		s.Name = *input.Name
	}
	if input.VariableTested != nil {
		s.VariableTested = *input.VariableTested
	}
	if input.Hypothesis != nil {
		s.Hypothesis = input.Hypothesis
	}
	if input.Conclusion != nil {
		s.Conclusion = input.Conclusion
	}
	s.UpdatedAt = time.Now()
	return s, nil
}

func (m *mockRepository) Delete(ctx context.Context, userID, sessionID uuid.UUID) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, userID, sessionID)
	}
	s, ok := m.sessions[sessionID]
	if !ok || s.UserID != userID {
		return ErrSessionNotFound
	}
	delete(m.sessions, sessionID)
	delete(m.links, sessionID)
	return nil
}

func (m *mockRepository) LinkBrews(ctx context.Context, userID, sessionID uuid.UUID, brewIDs []uuid.UUID) (*Session, error) {
	if m.linkFunc != nil {
		return m.linkFunc(ctx, userID, sessionID, brewIDs)
	}
	s, ok := m.sessions[sessionID]
	if !ok || s.UserID != userID {
		return nil, ErrSessionNotFound
	}
	for _, bID := range brewIDs {
		b, ok := m.brews[bID]
		if !ok {
			return nil, ErrBrewNotFound
		}
		if b.CoffeeID != s.CoffeeID {
			return nil, ErrBrewWrongCoffee
		}
	}
	existing := m.links[sessionID]
	for _, id := range brewIDs {
		found := false
		for _, e := range existing {
			if e == id {
				found = true
				break
			}
		}
		if !found {
			existing = append(existing, id)
		}
	}
	m.links[sessionID] = existing
	s.BrewCount = len(existing)
	return s, nil
}

func (m *mockRepository) UnlinkBrew(ctx context.Context, userID, sessionID, brewID uuid.UUID) error {
	if m.unlinkFunc != nil {
		return m.unlinkFunc(ctx, userID, sessionID, brewID)
	}
	s, ok := m.sessions[sessionID]
	if !ok || s.UserID != userID {
		return ErrSessionNotFound
	}
	bIDs := m.links[sessionID]
	var filtered []uuid.UUID
	for _, id := range bIDs {
		if id != brewID {
			filtered = append(filtered, id)
		}
	}
	m.links[sessionID] = filtered
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
	coffeeID := uuid.New()

	tests := []struct {
		name           string
		body           interface{}
		expectedStatus int
	}{
		{
			name: "valid session creation",
			body: CreateSessionInput{
				CoffeeID:       coffeeID,
				Name:           "Grind size sweep",
				VariableTested: "grind size",
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "with hypothesis",
			body: CreateSessionInput{
				CoffeeID:       coffeeID,
				Name:           "Temp sweep",
				VariableTested: "water temperature",
				Hypothesis:     strPtr("Higher temp = more brightness"),
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "missing coffee_id",
			body: CreateSessionInput{
				Name:           "Test",
				VariableTested: "grind",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "missing name",
			body: CreateSessionInput{
				CoffeeID:       coffeeID,
				VariableTested: "grind",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "missing variable_tested",
			body: CreateSessionInput{
				CoffeeID: coffeeID,
				Name:     "Test",
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

			req := createRequestWithUser("POST", "/sessions", body, userID)
			rr := httptest.NewRecorder()

			handler.Create(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Create_WithBrewLinking(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()
	expID1 := uuid.New()
	expID2 := uuid.New()
	wrongCoffeeExpID := uuid.New()
	otherCoffeeID := uuid.New()

	// Add brews to mock
	repo.brews[expID1] = &mockBrew{ID: expID1, CoffeeID: coffeeID, UserID: userID}
	repo.brews[expID2] = &mockBrew{ID: expID2, CoffeeID: coffeeID, UserID: userID}
	repo.brews[wrongCoffeeExpID] = &mockBrew{ID: wrongCoffeeExpID, CoffeeID: otherCoffeeID, UserID: userID}

	tests := []struct {
		name           string
		body           CreateSessionInput
		expectedStatus int
	}{
		{
			name: "with valid brew IDs",
			body: CreateSessionInput{
				CoffeeID:       coffeeID,
				Name:           "Grind sweep",
				VariableTested: "grind size",
				BrewIDs:  []uuid.UUID{expID1, expID2},
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "with brew from wrong coffee",
			body: CreateSessionInput{
				CoffeeID:       coffeeID,
				Name:           "Wrong coffee test",
				VariableTested: "grind size",
				BrewIDs:  []uuid.UUID{expID1, wrongCoffeeExpID},
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "with non-existent brew",
			body: CreateSessionInput{
				CoffeeID:       coffeeID,
				Name:           "Missing exp test",
				VariableTested: "grind size",
				BrewIDs:  []uuid.UUID{uuid.New()},
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.body)
			if err != nil {
				t.Fatal(err)
			}

			req := createRequestWithUser("POST", "/sessions", body, userID)
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
	sessionID := uuid.New()
	coffeeID := uuid.New()

	repo.sessions[sessionID] = &Session{
		ID:             sessionID,
		UserID:         userID,
		CoffeeID:       coffeeID,
		Name:           "Grind sweep",
		VariableTested: "grind size",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	tests := []struct {
		name           string
		sessionID      string
		expectedStatus int
	}{
		{
			name:           "existing session",
			sessionID:      sessionID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "non-existent session",
			sessionID:      uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid uuid",
			sessionID:      "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("GET", "/sessions/"+tt.sessionID, nil, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Get("/sessions/{id}", handler.Get)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Get_ResponseContainsBrews(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	sessionID := uuid.New()
	coffeeID := uuid.New()
	expID := uuid.New()

	repo.sessions[sessionID] = &Session{
		ID:             sessionID,
		UserID:         userID,
		CoffeeID:       coffeeID,
		Name:           "Grind sweep",
		VariableTested: "grind size",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	repo.links[sessionID] = []uuid.UUID{expID}

	req := createRequestWithUser("GET", "/sessions/"+sessionID.String(), nil, userID)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/sessions/{id}", handler.Get)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var result Session
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if result.BrewCount != 1 {
		t.Errorf("expected brew_count 1, got %d", result.BrewCount)
	}
	if len(result.Brews) != 1 {
		t.Errorf("expected 1 brew, got %d", len(result.Brews))
	}
}

func TestHandler_List(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	// Add sessions
	for i := 0; i < 3; i++ {
		id := uuid.New()
		repo.sessions[id] = &Session{
			ID:             id,
			UserID:         userID,
			CoffeeID:       coffeeID,
			Name:           "Session",
			VariableTested: "grind",
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
	}

	tests := []struct {
		name           string
		query          string
		expectedStatus int
		expectedCount  int
	}{
		{
			name:           "list with coffee_id",
			query:          "?coffee_id=" + coffeeID.String(),
			expectedStatus: http.StatusOK,
			expectedCount:  3,
		},
		{
			name:           "list with different coffee_id returns empty",
			query:          "?coffee_id=" + uuid.New().String(),
			expectedStatus: http.StatusOK,
			expectedCount:  0,
		},
		{
			name:           "missing coffee_id",
			query:          "",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid coffee_id",
			query:          "?coffee_id=invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("GET", "/sessions"+tt.query, nil, userID)
			rr := httptest.NewRecorder()

			handler.List(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}

			if tt.expectedStatus == http.StatusOK {
				var result ListSessionsResult
				if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
					t.Fatal(err)
				}
				if len(result.Items) != tt.expectedCount {
					t.Errorf("expected %d items, got %d", tt.expectedCount, len(result.Items))
				}
			}
		})
	}
}

func TestHandler_Update(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	sessionID := uuid.New()
	coffeeID := uuid.New()

	repo.sessions[sessionID] = &Session{
		ID:             sessionID,
		UserID:         userID,
		CoffeeID:       coffeeID,
		Name:           "Original Name",
		VariableTested: "grind size",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	tests := []struct {
		name           string
		sessionID      string
		body           interface{}
		expectedStatus int
	}{
		{
			name:      "update name",
			sessionID: sessionID.String(),
			body: UpdateSessionInput{
				Name: strPtr("Updated Name"),
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:      "add conclusion",
			sessionID: sessionID.String(),
			body: UpdateSessionInput{
				Conclusion: strPtr("3.0 grind was noticeably sweeter"),
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "session not found",
			sessionID:      uuid.New().String(),
			body:           UpdateSessionInput{Name: strPtr("Test")},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid session id",
			sessionID:      "invalid",
			body:           UpdateSessionInput{Name: strPtr("Test")},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.body)
			if err != nil {
				t.Fatal(err)
			}

			req := createRequestWithUser("PUT", "/sessions/"+tt.sessionID, body, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Put("/sessions/{id}", handler.Update)
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
	sessionID := uuid.New()
	coffeeID := uuid.New()

	repo.sessions[sessionID] = &Session{
		ID:             sessionID,
		UserID:         userID,
		CoffeeID:       coffeeID,
		Name:           "To Delete",
		VariableTested: "grind",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	tests := []struct {
		name           string
		sessionID      string
		expectedStatus int
	}{
		{
			name:           "delete existing session",
			sessionID:      sessionID.String(),
			expectedStatus: http.StatusNoContent,
		},
		{
			name:           "delete non-existent session",
			sessionID:      uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid session id",
			sessionID:      "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("DELETE", "/sessions/"+tt.sessionID, nil, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Delete("/sessions/{id}", handler.Delete)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_LinkBrews(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	sessionID := uuid.New()
	coffeeID := uuid.New()
	expID := uuid.New()
	wrongCoffeeExpID := uuid.New()
	otherCoffeeID := uuid.New()

	repo.sessions[sessionID] = &Session{
		ID:             sessionID,
		UserID:         userID,
		CoffeeID:       coffeeID,
		Name:           "Test Session",
		VariableTested: "grind",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	repo.brews[expID] = &mockBrew{ID: expID, CoffeeID: coffeeID, UserID: userID}
	repo.brews[wrongCoffeeExpID] = &mockBrew{ID: wrongCoffeeExpID, CoffeeID: otherCoffeeID, UserID: userID}

	tests := []struct {
		name           string
		sessionID      string
		body           interface{}
		expectedStatus int
	}{
		{
			name:           "link valid brew",
			sessionID:      sessionID.String(),
			body:           LinkBrewsInput{BrewIDs: []uuid.UUID{expID}},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "link brew from wrong coffee",
			sessionID:      sessionID.String(),
			body:           LinkBrewsInput{BrewIDs: []uuid.UUID{wrongCoffeeExpID}},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "link non-existent brew",
			sessionID:      sessionID.String(),
			body:           LinkBrewsInput{BrewIDs: []uuid.UUID{uuid.New()}},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "empty brew_ids",
			sessionID:      sessionID.String(),
			body:           LinkBrewsInput{BrewIDs: []uuid.UUID{}},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "session not found",
			sessionID:      uuid.New().String(),
			body:           LinkBrewsInput{BrewIDs: []uuid.UUID{expID}},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.body)
			if err != nil {
				t.Fatal(err)
			}

			req := createRequestWithUser("POST", "/sessions/"+tt.sessionID+"/brews", body, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Post("/sessions/{id}/brews", handler.LinkBrews)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_UnlinkBrew(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	sessionID := uuid.New()
	coffeeID := uuid.New()
	expID := uuid.New()

	repo.sessions[sessionID] = &Session{
		ID:             sessionID,
		UserID:         userID,
		CoffeeID:       coffeeID,
		Name:           "Test Session",
		VariableTested: "grind",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	repo.links[sessionID] = []uuid.UUID{expID}

	tests := []struct {
		name           string
		sessionID      string
		brewID   string
		expectedStatus int
	}{
		{
			name:           "unlink existing brew",
			sessionID:      sessionID.String(),
			brewID:   expID.String(),
			expectedStatus: http.StatusNoContent,
		},
		{
			name:           "session not found",
			sessionID:      uuid.New().String(),
			brewID:   expID.String(),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid session id",
			sessionID:      "invalid",
			brewID:   expID.String(),
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid brew id",
			sessionID:      sessionID.String(),
			brewID:   "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := createRequestWithUser("DELETE", "/sessions/"+tt.sessionID+"/brews/"+tt.brewID, nil, userID)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Delete("/sessions/{id}/brews/{brewId}", handler.UnlinkBrew)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Create_NameTooLong(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	userID := uuid.New()
	coffeeID := uuid.New()

	longName := make([]byte, 256)
	for i := range longName {
		longName[i] = 'a'
	}

	body, _ := json.Marshal(CreateSessionInput{
		CoffeeID:       coffeeID,
		Name:           string(longName),
		VariableTested: "grind",
	})

	req := createRequestWithUser("POST", "/sessions", body, userID)
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status %d for long name, got %d: %s", http.StatusBadRequest, rr.Code, rr.Body.String())
	}
}

func strPtr(s string) *string {
	return &s
}
