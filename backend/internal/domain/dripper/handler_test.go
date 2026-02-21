package dripper

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

	"github.com/poimgs/coffee-tracker/backend/internal/api"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
)

const testSecret = "test-jwt-secret-key"

// --- Mock Repository ---

type mockRepo struct {
	drippers map[string]*Dripper
	nextID   int
}

func newMockRepo() *mockRepo {
	return &mockRepo{drippers: make(map[string]*Dripper), nextID: 1}
}

func (m *mockRepo) List(_ context.Context, userID string, page, perPage int, sort string) ([]Dripper, int, error) {
	var result []Dripper
	for _, d := range m.drippers {
		if d.UserID == userID && d.DeletedAt == nil {
			result = append(result, *d)
		}
	}
	total := len(result)

	offset := (page - 1) * perPage
	if offset >= len(result) {
		return []Dripper{}, total, nil
	}
	end := offset + perPage
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], total, nil
}

func (m *mockRepo) GetByID(_ context.Context, userID, id string) (*Dripper, error) {
	d := m.drippers[id]
	if d == nil || d.UserID != userID || d.DeletedAt != nil {
		return nil, nil
	}
	return d, nil
}

func (m *mockRepo) Create(_ context.Context, userID string, req CreateRequest) (*Dripper, error) {
	// Check for duplicate name
	for _, d := range m.drippers {
		if d.UserID == userID && d.Name == req.Name && d.DeletedAt == nil {
			return nil, errors.New("duplicate key value violates unique constraint \"idx_drippers_user_name\"")
		}
	}

	m.nextID++
	id := "d-" + string(rune('0'+m.nextID))
	now := time.Now()
	d := &Dripper{
		ID:        id,
		UserID:    userID,
		Name:      req.Name,
		Brand:     req.Brand,
		Notes:     req.Notes,
		CreatedAt: now,
		UpdatedAt: now,
	}
	m.drippers[id] = d
	return d, nil
}

func (m *mockRepo) Update(_ context.Context, userID, id string, req UpdateRequest) (*Dripper, error) {
	d := m.drippers[id]
	if d == nil || d.UserID != userID || d.DeletedAt != nil {
		return nil, nil
	}

	// Check for duplicate name (excluding self)
	for _, other := range m.drippers {
		if other.UserID == userID && other.Name == req.Name && other.ID != id && other.DeletedAt == nil {
			return nil, errors.New("duplicate key value violates unique constraint \"idx_drippers_user_name\"")
		}
	}

	d.Name = req.Name
	d.Brand = req.Brand
	d.Notes = req.Notes
	d.UpdatedAt = time.Now()
	return d, nil
}

func (m *mockRepo) SoftDelete(_ context.Context, userID, id string) error {
	d := m.drippers[id]
	if d == nil || d.UserID != userID || d.DeletedAt != nil {
		return pgx.ErrNoRows
	}
	now := time.Now()
	d.DeletedAt = &now
	return nil
}

// Error-returning mock

type errorRepo struct{}

func (e *errorRepo) List(_ context.Context, _ string, _, _ int, _ string) ([]Dripper, int, error) {
	return nil, 0, errors.New("database error")
}
func (e *errorRepo) GetByID(_ context.Context, _, _ string) (*Dripper, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Create(_ context.Context, _ string, _ CreateRequest) (*Dripper, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Update(_ context.Context, _, _ string, _ UpdateRequest) (*Dripper, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) SoftDelete(_ context.Context, _, _ string) error {
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
	r.Route("/api/v1/drippers", func(r chi.Router) {
		r.Use(middleware.RequireAuth(testSecret))
		r.Get("/", h.List)
		r.Post("/", h.Create)
		r.Get("/{id}", h.GetByID)
		r.Put("/{id}", h.Update)
		r.Delete("/{id}", h.Delete)
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

func seedDripper(repo *mockRepo, id, userID, name string, brand *string) *Dripper {
	now := time.Now()
	d := &Dripper{
		ID:        id,
		UserID:    userID,
		Name:      name,
		Brand:     brand,
		CreatedAt: now,
		UpdatedAt: now,
	}
	repo.drippers[id] = d
	return d
}

func strPtr(s string) *string { return &s }

// --- List Tests ---

func TestList_Success(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-123", "V60", strPtr("Hario"))
	seedDripper(repo, "d-2", "user-123", "Kalita Wave", strPtr("Kalita"))
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/drippers", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp api.PaginatedResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	items := resp.Items.([]interface{})
	if len(items) != 2 {
		t.Errorf("expected 2 items, got %d", len(items))
	}
	if resp.Pagination.Total != 2 {
		t.Errorf("expected total 2, got %d", resp.Pagination.Total)
	}
}

func TestList_ExcludesSoftDeleted(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-123", "V60", strPtr("Hario"))
	deletedDripper := seedDripper(repo, "d-2", "user-123", "Deleted", nil)
	now := time.Now()
	deletedDripper.DeletedAt = &now
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/drippers", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 1 {
		t.Errorf("expected 1 item (excluding deleted), got %d", len(items))
	}
}

func TestList_ExcludesOtherUsers(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-123", "Mine", nil)
	seedDripper(repo, "d-2", "user-456", "Theirs", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/drippers", "")
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

	req := authRequest(http.MethodGet, "/api/v1/drippers", "")
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

	req := httptest.NewRequest(http.MethodGet, "/api/v1/drippers", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestList_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/drippers", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- GetByID Tests ---

func TestGetByID_Success(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-123", "V60", strPtr("Hario"))
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/drippers/d-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var d Dripper
	json.Unmarshal(w.Body.Bytes(), &d)
	if d.Name != "V60" {
		t.Errorf("expected name V60, got %s", d.Name)
	}
	if d.Brand == nil || *d.Brand != "Hario" {
		t.Errorf("expected brand Hario, got %v", d.Brand)
	}
}

func TestGetByID_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/drippers/nonexistent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestGetByID_OtherUserDripper(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-456", "Their Dripper", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/drippers/d-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for other user's dripper, got %d", w.Code)
	}
}

func TestGetByID_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/drippers/d-1", "")
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

	body := `{"name":"V60","brand":"Hario","notes":"02 size, plastic"}`
	req := authRequest(http.MethodPost, "/api/v1/drippers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var d Dripper
	json.Unmarshal(w.Body.Bytes(), &d)
	if d.Name != "V60" {
		t.Errorf("expected name V60, got %s", d.Name)
	}
	if d.Brand == nil || *d.Brand != "Hario" {
		t.Errorf("expected brand Hario, got %v", d.Brand)
	}
	if d.ID == "" {
		t.Error("expected non-empty ID")
	}
}

func TestCreate_NameOnly(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"Kalita Wave"}`
	req := authRequest(http.MethodPost, "/api/v1/drippers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var d Dripper
	json.Unmarshal(w.Body.Bytes(), &d)
	if d.Name != "Kalita Wave" {
		t.Errorf("expected name Kalita Wave, got %s", d.Name)
	}
}

func TestCreate_EmptyName(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"","brand":"Hario"}`
	req := authRequest(http.MethodPost, "/api/v1/drippers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestCreate_WhitespaceOnlyName(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"   "}`
	req := authRequest(http.MethodPost, "/api/v1/drippers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for whitespace-only name, got %d", w.Code)
	}
}

func TestCreate_DuplicateName(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-123", "V60", strPtr("Hario"))
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"V60","brand":"Different"}`
	req := authRequest(http.MethodPost, "/api/v1/drippers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreate_InvalidJSON(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/drippers", "not json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestCreate_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	body := `{"name":"V60"}`
	req := authRequest(http.MethodPost, "/api/v1/drippers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- Update Tests ---

func TestUpdate_Success(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-123", "V60", strPtr("Hario"))
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"V60 02","brand":"Hario","notes":"Updated notes"}`
	req := authRequest(http.MethodPut, "/api/v1/drippers/d-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var d Dripper
	json.Unmarshal(w.Body.Bytes(), &d)
	if d.Name != "V60 02" {
		t.Errorf("expected name V60 02, got %s", d.Name)
	}
	if d.Notes == nil || *d.Notes != "Updated notes" {
		t.Errorf("expected notes 'Updated notes', got %v", d.Notes)
	}
}

func TestUpdate_ClearsOptionalFields(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-123", "V60", strPtr("Hario"))
	h := NewHandler(repo)
	router := setupRouter(h)

	// PUT with only name — brand and notes should become null
	body := `{"name":"V60"}`
	req := authRequest(http.MethodPut, "/api/v1/drippers/d-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var d Dripper
	json.Unmarshal(w.Body.Bytes(), &d)
	if d.Brand != nil {
		t.Errorf("expected brand to be nil after PUT without brand, got %v", *d.Brand)
	}
	if d.Notes != nil {
		t.Errorf("expected notes to be nil after PUT without notes, got %v", *d.Notes)
	}
}

func TestUpdate_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"V60"}`
	req := authRequest(http.MethodPut, "/api/v1/drippers/nonexistent", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestUpdate_EmptyName(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-123", "V60", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":""}`
	req := authRequest(http.MethodPut, "/api/v1/drippers/d-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestUpdate_DuplicateName(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-123", "V60", nil)
	seedDripper(repo, "d-2", "user-123", "Kalita Wave", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"Kalita Wave"}`
	req := authRequest(http.MethodPut, "/api/v1/drippers/d-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUpdate_OtherUserDripper(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-456", "Their Dripper", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"Hijacked"}`
	req := authRequest(http.MethodPut, "/api/v1/drippers/d-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for other user's dripper, got %d", w.Code)
	}
}

// --- Delete Tests ---

func TestDelete_Success(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-123", "V60", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/drippers/d-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d: %s", w.Code, w.Body.String())
	}

	// Verify dripper is soft deleted (not visible via GetByID)
	d := repo.drippers["d-1"]
	if d.DeletedAt == nil {
		t.Error("expected dripper to be soft deleted")
	}
}

func TestDelete_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/drippers/nonexistent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestDelete_AlreadyDeleted(t *testing.T) {
	repo := newMockRepo()
	d := seedDripper(repo, "d-1", "user-123", "V60", nil)
	now := time.Now()
	d.DeletedAt = &now
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/drippers/d-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for already deleted dripper, got %d", w.Code)
	}
}

func TestDelete_OtherUserDripper(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-456", "Their Dripper", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/drippers/d-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for other user's dripper, got %d", w.Code)
	}
}

func TestDelete_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/drippers/d-1", "")
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

	body := `{"name":"V60"}`
	req := authRequest(http.MethodPost, "/api/v1/drippers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	responseBody := w.Body.String()
	if strings.Contains(responseBody, "user_id") {
		t.Error("response should not contain user_id")
	}
}

func TestGetByID_ResponseExcludesDeletedAt(t *testing.T) {
	repo := newMockRepo()
	seedDripper(repo, "d-1", "user-123", "V60", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/drippers/d-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	responseBody := w.Body.String()
	if strings.Contains(responseBody, "deleted_at") {
		t.Error("response should not contain deleted_at")
	}
}
