package filterpaper

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
	papers map[string]*FilterPaper
	nextID int
}

func newMockRepo() *mockRepo {
	return &mockRepo{papers: make(map[string]*FilterPaper), nextID: 1}
}

func (m *mockRepo) List(_ context.Context, userID string, page, perPage int, sort string) ([]FilterPaper, int, error) {
	var result []FilterPaper
	for _, p := range m.papers {
		if p.UserID == userID && p.DeletedAt == nil {
			result = append(result, *p)
		}
	}
	total := len(result)

	offset := (page - 1) * perPage
	if offset >= len(result) {
		return []FilterPaper{}, total, nil
	}
	end := offset + perPage
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], total, nil
}

func (m *mockRepo) GetByID(_ context.Context, userID, id string) (*FilterPaper, error) {
	p := m.papers[id]
	if p == nil || p.UserID != userID || p.DeletedAt != nil {
		return nil, nil
	}
	return p, nil
}

func (m *mockRepo) Create(_ context.Context, userID string, req CreateRequest) (*FilterPaper, error) {
	// Check for duplicate name
	for _, p := range m.papers {
		if p.UserID == userID && p.Name == req.Name && p.DeletedAt == nil {
			return nil, errors.New("duplicate key value violates unique constraint \"idx_filter_papers_user_name\"")
		}
	}

	m.nextID++
	id := "fp-" + string(rune('0'+m.nextID))
	now := time.Now()
	fp := &FilterPaper{
		ID:        id,
		UserID:    userID,
		Name:      req.Name,
		Brand:     req.Brand,
		Notes:     req.Notes,
		CreatedAt: now,
		UpdatedAt: now,
	}
	m.papers[id] = fp
	return fp, nil
}

func (m *mockRepo) Update(_ context.Context, userID, id string, req UpdateRequest) (*FilterPaper, error) {
	p := m.papers[id]
	if p == nil || p.UserID != userID || p.DeletedAt != nil {
		return nil, nil
	}

	// Check for duplicate name (excluding self)
	for _, other := range m.papers {
		if other.UserID == userID && other.Name == req.Name && other.ID != id && other.DeletedAt == nil {
			return nil, errors.New("duplicate key value violates unique constraint \"idx_filter_papers_user_name\"")
		}
	}

	p.Name = req.Name
	p.Brand = req.Brand
	p.Notes = req.Notes
	p.UpdatedAt = time.Now()
	return p, nil
}

func (m *mockRepo) SoftDelete(_ context.Context, userID, id string) error {
	p := m.papers[id]
	if p == nil || p.UserID != userID || p.DeletedAt != nil {
		return pgx.ErrNoRows
	}
	now := time.Now()
	p.DeletedAt = &now
	return nil
}

// Error-returning mock

type errorRepo struct{}

func (e *errorRepo) List(_ context.Context, _ string, _, _ int, _ string) ([]FilterPaper, int, error) {
	return nil, 0, errors.New("database error")
}
func (e *errorRepo) GetByID(_ context.Context, _, _ string) (*FilterPaper, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Create(_ context.Context, _ string, _ CreateRequest) (*FilterPaper, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Update(_ context.Context, _, _ string, _ UpdateRequest) (*FilterPaper, error) {
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
	r.Route("/api/v1/filter-papers", func(r chi.Router) {
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

func seedPaper(repo *mockRepo, id, userID, name string, brand *string) *FilterPaper {
	now := time.Now()
	fp := &FilterPaper{
		ID:        id,
		UserID:    userID,
		Name:      name,
		Brand:     brand,
		CreatedAt: now,
		UpdatedAt: now,
	}
	repo.papers[id] = fp
	return fp
}

func strPtr(s string) *string { return &s }

// --- List Tests ---

func TestList_Success(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-123", "Abaca", strPtr("Cafec"))
	seedPaper(repo, "fp-2", "user-123", "Tabbed", strPtr("Hario"))
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/filter-papers", "")
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
	seedPaper(repo, "fp-1", "user-123", "Abaca", strPtr("Cafec"))
	deletedPaper := seedPaper(repo, "fp-2", "user-123", "Deleted", nil)
	now := time.Now()
	deletedPaper.DeletedAt = &now
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/filter-papers", "")
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
	seedPaper(repo, "fp-1", "user-123", "Mine", nil)
	seedPaper(repo, "fp-2", "user-456", "Theirs", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/filter-papers", "")
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

	req := authRequest(http.MethodGet, "/api/v1/filter-papers", "")
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

	req := httptest.NewRequest(http.MethodGet, "/api/v1/filter-papers", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestList_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/filter-papers", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- GetByID Tests ---

func TestGetByID_Success(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-123", "Abaca", strPtr("Cafec"))
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/filter-papers/fp-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var fp FilterPaper
	json.Unmarshal(w.Body.Bytes(), &fp)
	if fp.Name != "Abaca" {
		t.Errorf("expected name Abaca, got %s", fp.Name)
	}
	if fp.Brand == nil || *fp.Brand != "Cafec" {
		t.Errorf("expected brand Cafec, got %v", fp.Brand)
	}
}

func TestGetByID_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/filter-papers/nonexistent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestGetByID_OtherUserPaper(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-456", "Their Paper", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/filter-papers/fp-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for other user's paper, got %d", w.Code)
	}
}

func TestGetByID_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/filter-papers/fp-1", "")
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

	body := `{"name":"Abaca","brand":"Cafec","notes":"Good for light roasts"}`
	req := authRequest(http.MethodPost, "/api/v1/filter-papers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var fp FilterPaper
	json.Unmarshal(w.Body.Bytes(), &fp)
	if fp.Name != "Abaca" {
		t.Errorf("expected name Abaca, got %s", fp.Name)
	}
	if fp.Brand == nil || *fp.Brand != "Cafec" {
		t.Errorf("expected brand Cafec, got %v", fp.Brand)
	}
	if fp.ID == "" {
		t.Error("expected non-empty ID")
	}
}

func TestCreate_NameOnly(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"Tabbed"}`
	req := authRequest(http.MethodPost, "/api/v1/filter-papers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var fp FilterPaper
	json.Unmarshal(w.Body.Bytes(), &fp)
	if fp.Name != "Tabbed" {
		t.Errorf("expected name Tabbed, got %s", fp.Name)
	}
}

func TestCreate_EmptyName(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"","brand":"Cafec"}`
	req := authRequest(http.MethodPost, "/api/v1/filter-papers", body)
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
	req := authRequest(http.MethodPost, "/api/v1/filter-papers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for whitespace-only name, got %d", w.Code)
	}
}

func TestCreate_DuplicateName(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-123", "Abaca", strPtr("Cafec"))
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"Abaca","brand":"Different"}`
	req := authRequest(http.MethodPost, "/api/v1/filter-papers", body)
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

	req := authRequest(http.MethodPost, "/api/v1/filter-papers", "not json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestCreate_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	body := `{"name":"Abaca"}`
	req := authRequest(http.MethodPost, "/api/v1/filter-papers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- Update Tests ---

func TestUpdate_Success(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-123", "Abaca", strPtr("Cafec"))
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"Abaca V2","brand":"Cafec","notes":"Updated notes"}`
	req := authRequest(http.MethodPut, "/api/v1/filter-papers/fp-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var fp FilterPaper
	json.Unmarshal(w.Body.Bytes(), &fp)
	if fp.Name != "Abaca V2" {
		t.Errorf("expected name Abaca V2, got %s", fp.Name)
	}
	if fp.Notes == nil || *fp.Notes != "Updated notes" {
		t.Errorf("expected notes 'Updated notes', got %v", fp.Notes)
	}
}

func TestUpdate_ClearsOptionalFields(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-123", "Abaca", strPtr("Cafec"))
	h := NewHandler(repo)
	router := setupRouter(h)

	// PUT with only name — brand and notes should become null
	body := `{"name":"Abaca"}`
	req := authRequest(http.MethodPut, "/api/v1/filter-papers/fp-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var fp FilterPaper
	json.Unmarshal(w.Body.Bytes(), &fp)
	if fp.Brand != nil {
		t.Errorf("expected brand to be nil after PUT without brand, got %v", *fp.Brand)
	}
	if fp.Notes != nil {
		t.Errorf("expected notes to be nil after PUT without notes, got %v", *fp.Notes)
	}
}

func TestUpdate_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"Abaca"}`
	req := authRequest(http.MethodPut, "/api/v1/filter-papers/nonexistent", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestUpdate_EmptyName(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-123", "Abaca", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":""}`
	req := authRequest(http.MethodPut, "/api/v1/filter-papers/fp-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestUpdate_DuplicateName(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-123", "Abaca", nil)
	seedPaper(repo, "fp-2", "user-123", "Tabbed", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"Tabbed"}`
	req := authRequest(http.MethodPut, "/api/v1/filter-papers/fp-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUpdate_OtherUserPaper(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-456", "Their Paper", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"name":"Hijacked"}`
	req := authRequest(http.MethodPut, "/api/v1/filter-papers/fp-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for other user's paper, got %d", w.Code)
	}
}

// --- Delete Tests ---

func TestDelete_Success(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-123", "Abaca", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/filter-papers/fp-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d: %s", w.Code, w.Body.String())
	}

	// Verify paper is soft deleted (not visible via GetByID)
	fp := repo.papers["fp-1"]
	if fp.DeletedAt == nil {
		t.Error("expected paper to be soft deleted")
	}
}

func TestDelete_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/filter-papers/nonexistent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestDelete_AlreadyDeleted(t *testing.T) {
	repo := newMockRepo()
	fp := seedPaper(repo, "fp-1", "user-123", "Abaca", nil)
	now := time.Now()
	fp.DeletedAt = &now
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/filter-papers/fp-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for already deleted paper, got %d", w.Code)
	}
}

func TestDelete_OtherUserPaper(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-456", "Their Paper", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/filter-papers/fp-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for other user's paper, got %d", w.Code)
	}
}

func TestDelete_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/filter-papers/fp-1", "")
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

	body := `{"name":"Abaca"}`
	req := authRequest(http.MethodPost, "/api/v1/filter-papers", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	responseBody := w.Body.String()
	if strings.Contains(responseBody, "user_id") {
		t.Error("response should not contain user_id")
	}
}

func TestGetByID_ResponseExcludesDeletedAt(t *testing.T) {
	repo := newMockRepo()
	seedPaper(repo, "fp-1", "user-123", "Abaca", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/filter-papers/fp-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	responseBody := w.Body.String()
	if strings.Contains(responseBody, "deleted_at") {
		t.Error("response should not contain deleted_at")
	}
}
