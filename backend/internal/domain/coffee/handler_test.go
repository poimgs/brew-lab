package coffee

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"

	"github.com/poimgs/coffee-tracker/backend/internal/api"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
)

const testSecret = "test-jwt-secret-key"

// --- Mock Repository ---

type mockRepo struct {
	coffees map[string]*Coffee
	nextID  int
}

func newMockRepo() *mockRepo {
	return &mockRepo{coffees: make(map[string]*Coffee), nextID: 1}
}

func (m *mockRepo) List(_ context.Context, userID string, params ListParams) ([]Coffee, int, error) {
	var result []Coffee
	for _, c := range m.coffees {
		if c.UserID != userID {
			continue
		}
		if params.ArchivedOnly {
			if c.ArchivedAt == nil {
				continue
			}
		} else {
			if c.ArchivedAt != nil {
				continue
			}
		}
		if params.Search != "" {
			search := strings.ToLower(params.Search)
			if !strings.Contains(strings.ToLower(c.Roaster), search) && !strings.Contains(strings.ToLower(c.Name), search) {
				continue
			}
		}
		if params.Roaster != "" && c.Roaster != params.Roaster {
			continue
		}
		if params.Country != "" && (c.Country == nil || *c.Country != params.Country) {
			continue
		}
		if params.Process != "" && (c.Process == nil || *c.Process != params.Process) {
			continue
		}
		result = append(result, *c)
	}
	total := len(result)

	offset := (params.Page - 1) * params.PerPage
	if offset >= len(result) {
		return []Coffee{}, total, nil
	}
	end := offset + params.PerPage
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], total, nil
}

func (m *mockRepo) GetByID(_ context.Context, userID, id string) (*Coffee, error) {
	c := m.coffees[id]
	if c == nil || c.UserID != userID {
		return nil, nil
	}
	return c, nil
}

func (m *mockRepo) Create(_ context.Context, userID string, req CreateRequest) (*Coffee, error) {
	m.nextID++
	id := fmt.Sprintf("coffee-%d", m.nextID)
	now := time.Now()
	c := &Coffee{
		ID:           id,
		UserID:       userID,
		Roaster:      req.Roaster,
		Name:         req.Name,
		Country:      req.Country,
		Region:       req.Region,
		Farm:         req.Farm,
		Varietal:     req.Varietal,
		Elevation:    req.Elevation,
		Process:      req.Process,
		RoastLevel:   req.RoastLevel,
		TastingNotes: req.TastingNotes,
		RoastDate:    req.RoastDate,
		Notes:        req.Notes,
		BrewCount:    0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	m.coffees[id] = c
	return c, nil
}

func (m *mockRepo) Update(_ context.Context, userID, id string, req UpdateRequest) (*Coffee, error) {
	c := m.coffees[id]
	if c == nil || c.UserID != userID {
		return nil, nil
	}
	c.Roaster = req.Roaster
	c.Name = req.Name
	c.Country = req.Country
	c.Region = req.Region
	c.Farm = req.Farm
	c.Varietal = req.Varietal
	c.Elevation = req.Elevation
	c.Process = req.Process
	c.RoastLevel = req.RoastLevel
	c.TastingNotes = req.TastingNotes
	c.RoastDate = req.RoastDate
	c.Notes = req.Notes
	c.UpdatedAt = time.Now()
	return c, nil
}

func (m *mockRepo) Delete(_ context.Context, userID, id string) error {
	c := m.coffees[id]
	if c == nil || c.UserID != userID {
		return pgx.ErrNoRows
	}
	delete(m.coffees, id)
	return nil
}

func (m *mockRepo) Archive(_ context.Context, userID, id string) (*Coffee, error) {
	c := m.coffees[id]
	if c == nil || c.UserID != userID || c.ArchivedAt != nil {
		return nil, nil
	}
	now := time.Now()
	c.ArchivedAt = &now
	c.UpdatedAt = now
	return c, nil
}

func (m *mockRepo) Unarchive(_ context.Context, userID, id string) (*Coffee, error) {
	c := m.coffees[id]
	if c == nil || c.UserID != userID || c.ArchivedAt == nil {
		return nil, nil
	}
	c.ArchivedAt = nil
	c.UpdatedAt = time.Now()
	return c, nil
}

func (m *mockRepo) SetReferenceBrew(_ context.Context, userID, id string, brewID *string) (*Coffee, error) {
	c := m.coffees[id]
	if c == nil || c.UserID != userID {
		return nil, nil
	}
	if brewID != nil && *brewID == "invalid-brew" {
		return nil, errors.New("brew does not belong to this coffee")
	}
	c.ReferenceBrewID = brewID
	c.UpdatedAt = time.Now()
	return c, nil
}

func (m *mockRepo) Suggestions(_ context.Context, userID, field, query string) ([]string, error) {
	seen := make(map[string]bool)
	var items []string
	for _, c := range m.coffees {
		if c.UserID != userID {
			continue
		}
		var val *string
		switch field {
		case "roaster":
			val = &c.Roaster
		case "country":
			val = c.Country
		case "process":
			val = c.Process
		}
		if val == nil {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(*val), strings.ToLower(query)) {
			continue
		}
		if !seen[*val] {
			seen[*val] = true
			items = append(items, *val)
		}
	}
	if items == nil {
		items = []string{}
	}
	return items, nil
}

// Error-returning mock

type errorRepo struct{}

func (e *errorRepo) List(_ context.Context, _ string, _ ListParams) ([]Coffee, int, error) {
	return nil, 0, errors.New("database error")
}
func (e *errorRepo) GetByID(_ context.Context, _, _ string) (*Coffee, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Create(_ context.Context, _ string, _ CreateRequest) (*Coffee, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Update(_ context.Context, _, _ string, _ UpdateRequest) (*Coffee, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Delete(_ context.Context, _, _ string) error {
	return errors.New("database error")
}
func (e *errorRepo) Archive(_ context.Context, _, _ string) (*Coffee, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Unarchive(_ context.Context, _, _ string) (*Coffee, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) SetReferenceBrew(_ context.Context, _, _ string, _ *string) (*Coffee, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Suggestions(_ context.Context, _, _, _ string) ([]string, error) {
	return nil, errors.New("database error")
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
	r.Route("/api/v1/coffees", func(r chi.Router) {
		r.Use(middleware.RequireAuth(testSecret))
		r.Get("/", h.List)
		r.Post("/", h.Create)
		r.Get("/suggestions", h.Suggestions)
		r.Get("/{id}", h.GetByID)
		r.Put("/{id}", h.Update)
		r.Delete("/{id}", h.Delete)
		r.Post("/{id}/archive", h.Archive)
		r.Post("/{id}/unarchive", h.Unarchive)
		r.Post("/{id}/reference-brew", h.SetReferenceBrew)
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

func seedCoffee(repo *mockRepo, id, userID, roaster, name string) *Coffee {
	now := time.Now()
	c := &Coffee{
		ID:        id,
		UserID:    userID,
		Roaster:   roaster,
		Name:      name,
		BrewCount: 0,
		CreatedAt: now,
		UpdatedAt: now,
	}
	repo.coffees[id] = c
	return c
}

func strPtr(s string) *string { return &s }

// --- List Tests ---

func TestList_Success(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	seedCoffee(repo, "c-2", "user-123", "SEY", "Worka Sakaro")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 2 {
		t.Errorf("expected 2 items, got %d", len(items))
	}
	if resp.Pagination.Total != 2 {
		t.Errorf("expected total 2, got %d", resp.Pagination.Total)
	}
}

func TestList_ExcludesArchived(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	archived := seedCoffee(repo, "c-2", "user-123", "SEY", "Worka Sakaro")
	now := time.Now()
	archived.ArchivedAt = &now
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 1 {
		t.Errorf("expected 1 item (excluding archived), got %d", len(items))
	}
}

func TestList_ArchivedOnly(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	archived := seedCoffee(repo, "c-2", "user-123", "SEY", "Worka Sakaro")
	now := time.Now()
	archived.ArchivedAt = &now
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees?archived_only=true", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 1 {
		t.Errorf("expected 1 archived item, got %d", len(items))
	}
}

func TestList_SearchFilter(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	seedCoffee(repo, "c-2", "user-123", "SEY", "Worka Sakaro")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees?search=cata", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 1 {
		t.Errorf("expected 1 item matching search, got %d", len(items))
	}
}

func TestList_ExcludesOtherUsers(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Mine", "My Coffee")
	seedCoffee(repo, "c-2", "user-456", "Theirs", "Their Coffee")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 1 {
		t.Errorf("expected 1 item (own user only), got %d", len(items))
	}
}

func TestList_EmptyResult(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 0 {
		t.Errorf("expected 0 items, got %d", len(items))
	}
}

func TestList_Unauthenticated(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/coffees", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestList_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- GetByID Tests ---

func TestGetByID_Success(t *testing.T) {
	repo := newMockRepo()
	c := seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	c.Country = strPtr("Kenya")
	c.Process = strPtr("Washed")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Name != "Kiamaina" {
		t.Errorf("expected name Kiamaina, got %s", resp.Name)
	}
	if resp.Country == nil || *resp.Country != "Kenya" {
		t.Errorf("expected country Kenya, got %v", resp.Country)
	}
}

func TestGetByID_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/nonexistent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestGetByID_OtherUserCoffee(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-456", "Theirs", "Their Coffee")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for other user's coffee, got %d", w.Code)
	}
}

func TestGetByID_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- Create Tests ---

func TestCreate_Success(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"Cata Coffee","name":"Kiamaina","country":"Kenya","process":"Washed","roast_level":"Light"}`
	req := authRequest(http.MethodPost, "/api/v1/coffees", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Roaster != "Cata Coffee" {
		t.Errorf("expected roaster Cata Coffee, got %s", resp.Roaster)
	}
	if resp.Name != "Kiamaina" {
		t.Errorf("expected name Kiamaina, got %s", resp.Name)
	}
	if resp.ID == "" {
		t.Error("expected non-empty ID")
	}
	if resp.BrewCount != 0 {
		t.Errorf("expected brew_count 0, got %d", resp.BrewCount)
	}
}

func TestCreate_MinimalFields(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"Cata Coffee","name":"Kiamaina"}`
	req := authRequest(http.MethodPost, "/api/v1/coffees", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Country != nil {
		t.Errorf("expected nil country, got %v", *resp.Country)
	}
}

func TestCreate_MissingRoaster(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"Kiamaina"}`
	req := authRequest(http.MethodPost, "/api/v1/coffees", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestCreate_MissingName(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"Cata Coffee"}`
	req := authRequest(http.MethodPost, "/api/v1/coffees", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestCreate_EmptyRoasterAndName(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"","name":""}`
	req := authRequest(http.MethodPost, "/api/v1/coffees", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var resp api.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Error.Details) != 2 {
		t.Errorf("expected 2 field errors, got %d", len(resp.Error.Details))
	}
}

func TestCreate_WhitespaceOnlyFields(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"   ","name":"   "}`
	req := authRequest(http.MethodPost, "/api/v1/coffees", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for whitespace-only fields, got %d", w.Code)
	}
}

func TestCreate_InvalidJSON(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/coffees", "not json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestCreate_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	body := `{"roaster":"Cata Coffee","name":"Kiamaina"}`
	req := authRequest(http.MethodPost, "/api/v1/coffees", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- Update Tests ---

func TestUpdate_Success(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"Cata Coffee","name":"Kiamaina v2","country":"Kenya","process":"Natural"}`
	req := authRequest(http.MethodPut, "/api/v1/coffees/c-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Name != "Kiamaina v2" {
		t.Errorf("expected name Kiamaina v2, got %s", resp.Name)
	}
	if resp.Country == nil || *resp.Country != "Kenya" {
		t.Errorf("expected country Kenya, got %v", resp.Country)
	}
}

func TestUpdate_ClearsOptionalFields(t *testing.T) {
	repo := newMockRepo()
	c := seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	c.Country = strPtr("Kenya")
	c.Process = strPtr("Washed")
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"Cata Coffee","name":"Kiamaina"}`
	req := authRequest(http.MethodPut, "/api/v1/coffees/c-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Country != nil {
		t.Errorf("expected nil country after PUT without country, got %v", *resp.Country)
	}
	if resp.Process != nil {
		t.Errorf("expected nil process after PUT without process, got %v", *resp.Process)
	}
}

func TestUpdate_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"Cata Coffee","name":"Kiamaina"}`
	req := authRequest(http.MethodPut, "/api/v1/coffees/nonexistent", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestUpdate_MissingRequiredFields(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"","name":""}`
	req := authRequest(http.MethodPut, "/api/v1/coffees/c-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestUpdate_OtherUserCoffee(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-456", "Theirs", "Their Coffee")
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"Hijacked","name":"Stolen"}`
	req := authRequest(http.MethodPut, "/api/v1/coffees/c-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for other user's coffee, got %d", w.Code)
	}
}

// --- Delete Tests ---

func TestDelete_Success(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/coffees/c-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d: %s", w.Code, w.Body.String())
	}

	if _, exists := repo.coffees["c-1"]; exists {
		t.Error("expected coffee to be deleted from store")
	}
}

func TestDelete_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/coffees/nonexistent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestDelete_OtherUserCoffee(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-456", "Theirs", "Their Coffee")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/coffees/c-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for other user's coffee, got %d", w.Code)
	}
}

func TestDelete_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/coffees/c-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- Archive Tests ---

func TestArchive_Success(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/coffees/c-1/archive", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.ArchivedAt == nil {
		t.Error("expected archived_at to be set")
	}
}

func TestArchive_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/coffees/nonexistent/archive", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestArchive_AlreadyArchived(t *testing.T) {
	repo := newMockRepo()
	c := seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	now := time.Now()
	c.ArchivedAt = &now
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/coffees/c-1/archive", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for already archived, got %d", w.Code)
	}
}

func TestArchive_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/coffees/c-1/archive", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- Unarchive Tests ---

func TestUnarchive_Success(t *testing.T) {
	repo := newMockRepo()
	c := seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	now := time.Now()
	c.ArchivedAt = &now
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/coffees/c-1/unarchive", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.ArchivedAt != nil {
		t.Error("expected archived_at to be nil after unarchive")
	}
}

func TestUnarchive_NotArchived(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/coffees/c-1/unarchive", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for non-archived coffee, got %d", w.Code)
	}
}

func TestUnarchive_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/coffees/c-1/unarchive", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- SetReferenceBrew Tests ---

func TestSetReferenceBrew_Success(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"brew_id":"brew-1"}`
	req := authRequest(http.MethodPost, "/api/v1/coffees/c-1/reference-brew", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.ReferenceBrewID == nil || *resp.ReferenceBrewID != "brew-1" {
		t.Errorf("expected reference_brew_id brew-1, got %v", resp.ReferenceBrewID)
	}
}

func TestSetReferenceBrew_ClearReference(t *testing.T) {
	repo := newMockRepo()
	c := seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	c.ReferenceBrewID = strPtr("brew-1")
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"brew_id":null}`
	req := authRequest(http.MethodPost, "/api/v1/coffees/c-1/reference-brew", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.ReferenceBrewID != nil {
		t.Errorf("expected nil reference_brew_id, got %v", *resp.ReferenceBrewID)
	}
}

func TestSetReferenceBrew_InvalidBrew(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"brew_id":"invalid-brew"}`
	req := authRequest(http.MethodPost, "/api/v1/coffees/c-1/reference-brew", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for invalid brew, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSetReferenceBrew_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"brew_id":"brew-1"}`
	req := authRequest(http.MethodPost, "/api/v1/coffees/nonexistent/reference-brew", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestSetReferenceBrew_InvalidJSON(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/coffees/c-1/reference-brew", "not json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestSetReferenceBrew_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	body := `{"brew_id":"brew-1"}`
	req := authRequest(http.MethodPost, "/api/v1/coffees/c-1/reference-brew", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- Suggestions Tests ---

func TestSuggestions_Success(t *testing.T) {
	repo := newMockRepo()
	c1 := seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	c1.Country = strPtr("Kenya")
	c2 := seedCoffee(repo, "c-2", "user-123", "Catalyst", "Blend")
	c2.Country = strPtr("Ethiopia")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/suggestions?field=roaster&q=cat", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp SuggestionsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Items) != 2 {
		t.Errorf("expected 2 suggestions, got %d", len(resp.Items))
	}
}

func TestSuggestions_MissingField(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/suggestions?q=cat", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestSuggestions_InvalidField(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/suggestions?field=invalid&q=test", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestSuggestions_EmptyResult(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/suggestions?field=roaster&q=zzz", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp SuggestionsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Items) != 0 {
		t.Errorf("expected 0 suggestions, got %d", len(resp.Items))
	}
}

func TestSuggestions_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/suggestions?field=roaster&q=cat", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- Response Format Tests ---

func TestCreate_ResponseExcludesUserID(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"Cata Coffee","name":"Kiamaina"}`
	req := authRequest(http.MethodPost, "/api/v1/coffees", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	responseBody := w.Body.String()
	if strings.Contains(responseBody, "user_id") {
		t.Error("response should not contain user_id")
	}
}

func TestGetByID_ResponseIncludesBrewCount(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.BrewCount != 0 {
		t.Errorf("expected brew_count 0 for new coffee, got %d", resp.BrewCount)
	}

	// Verify brew_count is in the JSON
	if !strings.Contains(w.Body.String(), "brew_count") {
		t.Error("response should contain brew_count field")
	}
}

func TestList_Pagination(t *testing.T) {
	repo := newMockRepo()
	for i := 0; i < 5; i++ {
		seedCoffee(repo, fmt.Sprintf("c-%d", i), "user-123", "Roaster", fmt.Sprintf("Coffee %d", i))
	}
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees?page=1&per_page=2", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 2 {
		t.Errorf("expected 2 items per page, got %d", len(items))
	}
	if resp.Pagination.Total != 5 {
		t.Errorf("expected total 5, got %d", resp.Pagination.Total)
	}
	if resp.Pagination.TotalPages != 3 {
		t.Errorf("expected 3 total pages, got %d", resp.Pagination.TotalPages)
	}
}

// --- Roast Date Tests (Issue #1: roast_date DATE scan) ---

func TestCreate_WithRoastDate(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"roaster":"Cata Coffee","name":"Kiamaina","roast_date":"2026-01-15"}`
	req := authRequest(http.MethodPost, "/api/v1/coffees", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.RoastDate == nil {
		t.Fatal("expected roast_date to be present in response")
	}
	if *resp.RoastDate != "2026-01-15" {
		t.Errorf("expected roast_date 2026-01-15, got %s", *resp.RoastDate)
	}
}

func TestGetByID_WithRoastDate(t *testing.T) {
	repo := newMockRepo()
	c := seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	c.RoastDate = strPtr("2026-01-10")
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.RoastDate == nil {
		t.Fatal("expected roast_date to be present in response")
	}
	if *resp.RoastDate != "2026-01-10" {
		t.Errorf("expected roast_date 2026-01-10, got %s", *resp.RoastDate)
	}
}

func TestList_WithRoastDate(t *testing.T) {
	repo := newMockRepo()
	c := seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina")
	c.RoastDate = strPtr("2026-01-10")
	seedCoffee(repo, "c-2", "user-123", "SEY", "Worka Sakaro") // no roast date
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 2 {
		t.Errorf("expected 2 items (mix of with/without roast_date), got %d", len(items))
	}
}

func TestGetByID_WithoutRoastDate(t *testing.T) {
	repo := newMockRepo()
	seedCoffee(repo, "c-1", "user-123", "Cata Coffee", "Kiamaina") // no roast date
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Coffee
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.RoastDate != nil {
		t.Errorf("expected nil roast_date, got %s", *resp.RoastDate)
	}
}
