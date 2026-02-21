package sharelink

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
)

const testSecret = "test-jwt-secret-key"
const testBaseURL = "https://brewlab.example.com"

// --- Mock Repository ---

type mockRepo struct {
	tokens  map[string]*mockTokenData // keyed by userID
	coffees map[string][]ShareCoffee  // keyed by userID
}

type mockTokenData struct {
	token     string
	createdAt time.Time
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		tokens:  make(map[string]*mockTokenData),
		coffees: make(map[string][]ShareCoffee),
	}
}

func (m *mockRepo) GetShareToken(_ context.Context, userID string) (*string, *time.Time, error) {
	data := m.tokens[userID]
	if data == nil {
		return nil, nil, nil
	}
	return &data.token, &data.createdAt, nil
}

func (m *mockRepo) SetShareToken(_ context.Context, userID, token string) (*time.Time, error) {
	now := time.Now().UTC().Truncate(time.Second)
	m.tokens[userID] = &mockTokenData{token: token, createdAt: now}
	return &now, nil
}

func (m *mockRepo) ClearShareToken(_ context.Context, userID string) error {
	delete(m.tokens, userID)
	return nil
}

func (m *mockRepo) GetUserIDByToken(_ context.Context, token string) (*string, error) {
	for userID, data := range m.tokens {
		if data.token == token {
			return &userID, nil
		}
	}
	return nil, nil
}

func (m *mockRepo) GetSharedCoffees(_ context.Context, userID string) ([]ShareCoffee, error) {
	coffees := m.coffees[userID]
	if coffees == nil {
		return []ShareCoffee{}, nil
	}
	return coffees, nil
}

// Error-returning mock

type errorRepo struct{}

func (e *errorRepo) GetShareToken(_ context.Context, _ string) (*string, *time.Time, error) {
	return nil, nil, errors.New("database error")
}
func (e *errorRepo) SetShareToken(_ context.Context, _, _ string) (*time.Time, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) ClearShareToken(_ context.Context, _ string) error {
	return errors.New("database error")
}
func (e *errorRepo) GetUserIDByToken(_ context.Context, _ string) (*string, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) GetSharedCoffees(_ context.Context, _ string) ([]ShareCoffee, error) {
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

	// Public share endpoint
	r.Get("/api/v1/share/{token}", h.GetSharedCoffees)

	// Protected endpoints
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth(testSecret))
		r.Get("/api/v1/share-link", h.GetShareLink)
		r.Post("/api/v1/share-link", h.CreateShareLink)
		r.Delete("/api/v1/share-link", h.RevokeShareLink)
	})

	return r
}

func authRequest(method, url string) *http.Request {
	req := httptest.NewRequest(method, url, nil)
	req.Header.Set("Authorization", "Bearer "+generateTestAccessToken("user-123"))
	return req
}

func intPtr(i int) *int       { return &i }
func strPtr(s string) *string { return &s }

// --- GetShareLink Tests ---

func TestGetShareLink_NoLink(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/share-link")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp ShareLink
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Token != nil {
		t.Errorf("expected nil token, got %v", *resp.Token)
	}
	if resp.URL != nil {
		t.Errorf("expected nil url, got %v", *resp.URL)
	}
	if resp.CreatedAt != nil {
		t.Errorf("expected nil created_at, got %v", *resp.CreatedAt)
	}
}

func TestGetShareLink_HasLink(t *testing.T) {
	repo := newMockRepo()
	now := time.Now().UTC().Truncate(time.Second)
	repo.tokens["user-123"] = &mockTokenData{token: "abc123", createdAt: now}
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/share-link")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp ShareLink
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Token == nil || *resp.Token != "abc123" {
		t.Errorf("expected token abc123, got %v", resp.Token)
	}
	expectedURL := testBaseURL + "/share/abc123"
	if resp.URL == nil || *resp.URL != expectedURL {
		t.Errorf("expected url %s, got %v", expectedURL, resp.URL)
	}
	if resp.CreatedAt == nil {
		t.Error("expected created_at to be set")
	}
}

func TestGetShareLink_Unauthenticated(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/share-link", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestGetShareLink_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{}, testBaseURL)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/share-link")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- CreateShareLink Tests ---

func TestCreateShareLink_Success(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/share-link")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp ShareLink
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Token == nil {
		t.Fatal("expected token to be set")
	}
	if len(*resp.Token) != 32 {
		t.Errorf("expected 32-char hex token, got %d chars: %s", len(*resp.Token), *resp.Token)
	}
	if resp.URL == nil {
		t.Fatal("expected url to be set")
	}
	expectedURL := testBaseURL + "/share/" + *resp.Token
	if *resp.URL != expectedURL {
		t.Errorf("expected url %s, got %s", expectedURL, *resp.URL)
	}
	if resp.CreatedAt == nil {
		t.Error("expected created_at to be set")
	}
}

func TestCreateShareLink_ReplacesExisting(t *testing.T) {
	repo := newMockRepo()
	repo.tokens["user-123"] = &mockTokenData{token: "old-token", createdAt: time.Now()}
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/share-link")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp ShareLink
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Token == nil || *resp.Token == "old-token" {
		t.Error("expected new token to replace old one")
	}

	// Verify old token no longer resolves
	oldUserID, _ := repo.GetUserIDByToken(context.Background(), "old-token")
	if oldUserID != nil {
		t.Error("old token should no longer resolve to a user")
	}
}

func TestCreateShareLink_Unauthenticated(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/share-link", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestCreateShareLink_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{}, testBaseURL)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/share-link")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- RevokeShareLink Tests ---

func TestRevokeShareLink_Success(t *testing.T) {
	repo := newMockRepo()
	repo.tokens["user-123"] = &mockTokenData{token: "abc123", createdAt: time.Now()}
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/share-link")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d: %s", w.Code, w.Body.String())
	}

	// Verify token is cleared
	if repo.tokens["user-123"] != nil {
		t.Error("expected token to be cleared after revoke")
	}
}

func TestRevokeShareLink_NoExistingLink(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	// Revoking when no link exists should succeed silently
	req := authRequest(http.MethodDelete, "/api/v1/share-link")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", w.Code)
	}
}

func TestRevokeShareLink_Unauthenticated(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/share-link", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestRevokeShareLink_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{}, testBaseURL)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/share-link")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- GetSharedCoffees Tests ---

func TestGetSharedCoffees_ValidToken(t *testing.T) {
	repo := newMockRepo()
	repo.tokens["user-123"] = &mockTokenData{token: "valid-token", createdAt: time.Now()}
	repo.coffees["user-123"] = []ShareCoffee{
		{
			Name:       "Kiamaina",
			Roaster:    strPtr("Cata Coffee"),
			Country:    strPtr("Kenya"),
			Process:    strPtr("Washed"),
			RoastLevel: strPtr("Light"),
			ReferenceBrew: &ShareReferenceBrew{
				OverallScore:   intPtr(8),
				AromaIntensity: intPtr(7),
			},
		},
		{
			Name:    "Gesha Village",
			Roaster: strPtr("Manhattan"),
			Country: strPtr("Ethiopia"),
		},
	}
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/share/valid-token", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Items []ShareCoffee `json:"items"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if len(resp.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(resp.Items))
	}
	if resp.Items[0].Name != "Kiamaina" {
		t.Errorf("expected first coffee Kiamaina, got %s", resp.Items[0].Name)
	}
	if resp.Items[0].ReferenceBrew == nil {
		t.Error("expected reference brew on first coffee")
	} else if resp.Items[0].ReferenceBrew.OverallScore == nil || *resp.Items[0].ReferenceBrew.OverallScore != 8 {
		t.Error("expected overall score 8 on first coffee reference brew")
	}
	if resp.Items[1].ReferenceBrew != nil {
		t.Error("expected nil reference brew on second coffee")
	}
}

func TestGetSharedCoffees_InvalidToken(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/share/nonexistent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGetSharedCoffees_EmptyCoffeeList(t *testing.T) {
	repo := newMockRepo()
	repo.tokens["user-123"] = &mockTokenData{token: "valid-token", createdAt: time.Now()}
	// No coffees seeded
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/share/valid-token", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Items []ShareCoffee `json:"items"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if len(resp.Items) != 0 {
		t.Errorf("expected 0 items, got %d", len(resp.Items))
	}
}

func TestGetSharedCoffees_NoAuthRequired(t *testing.T) {
	repo := newMockRepo()
	repo.tokens["user-123"] = &mockTokenData{token: "public-token", createdAt: time.Now()}
	repo.coffees["user-123"] = []ShareCoffee{
		{Name: "Test Coffee", Roaster: strPtr("Test Roaster")},
	}
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	// No auth header — should still work
	req := httptest.NewRequest(http.MethodGet, "/api/v1/share/public-token", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 (public endpoint), got %d", w.Code)
	}
}

func TestGetSharedCoffees_RevokedToken(t *testing.T) {
	repo := newMockRepo()
	// Token was set then revoked (not in map)
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/share/revoked-token", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for revoked token, got %d", w.Code)
	}
}

func TestGetSharedCoffees_DatabaseError_TokenLookup(t *testing.T) {
	h := NewHandler(&errorRepo{}, testBaseURL)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/share/some-token", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- URL Construction Tests ---

func TestBuildURL(t *testing.T) {
	h := NewHandler(nil, "https://brew.example.com")
	url := h.buildURL("abc123def456")
	expected := "https://brew.example.com/share/abc123def456"
	if url != expected {
		t.Errorf("expected %s, got %s", expected, url)
	}
}

func TestBuildURL_LocalhostBaseURL(t *testing.T) {
	h := NewHandler(nil, "http://localhost:5173")
	url := h.buildURL("token123")
	expected := "http://localhost:5173/share/token123"
	if url != expected {
		t.Errorf("expected %s, got %s", expected, url)
	}
}

// --- Full Flow Tests ---

func TestFullFlow_CreateThenGetThenRevoke(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	// 1. Create share link
	createReq := authRequest(http.MethodPost, "/api/v1/share-link")
	createW := httptest.NewRecorder()
	router.ServeHTTP(createW, createReq)

	if createW.Code != http.StatusCreated {
		t.Fatalf("create: expected 201, got %d", createW.Code)
	}

	var created ShareLink
	json.Unmarshal(createW.Body.Bytes(), &created)
	token := *created.Token

	// 2. Get share link — should return same token
	getReq := authRequest(http.MethodGet, "/api/v1/share-link")
	getW := httptest.NewRecorder()
	router.ServeHTTP(getW, getReq)

	if getW.Code != http.StatusOK {
		t.Fatalf("get: expected 200, got %d", getW.Code)
	}

	var got ShareLink
	json.Unmarshal(getW.Body.Bytes(), &got)
	if got.Token == nil || *got.Token != token {
		t.Errorf("get: expected token %s, got %v", token, got.Token)
	}

	// 3. Access public endpoint with token
	publicReq := httptest.NewRequest(http.MethodGet, "/api/v1/share/"+token, nil)
	publicW := httptest.NewRecorder()
	router.ServeHTTP(publicW, publicReq)

	if publicW.Code != http.StatusOK {
		t.Fatalf("public: expected 200, got %d", publicW.Code)
	}

	// 4. Revoke share link
	revokeReq := authRequest(http.MethodDelete, "/api/v1/share-link")
	revokeW := httptest.NewRecorder()
	router.ServeHTTP(revokeW, revokeReq)

	if revokeW.Code != http.StatusNoContent {
		t.Fatalf("revoke: expected 204, got %d", revokeW.Code)
	}

	// 5. Public endpoint should now return 404
	publicReq2 := httptest.NewRequest(http.MethodGet, "/api/v1/share/"+token, nil)
	publicW2 := httptest.NewRecorder()
	router.ServeHTTP(publicW2, publicReq2)

	if publicW2.Code != http.StatusNotFound {
		t.Fatalf("public after revoke: expected 404, got %d", publicW2.Code)
	}

	// 6. Get share link should return null fields
	getReq2 := authRequest(http.MethodGet, "/api/v1/share-link")
	getW2 := httptest.NewRecorder()
	router.ServeHTTP(getW2, getReq2)

	var afterRevoke ShareLink
	json.Unmarshal(getW2.Body.Bytes(), &afterRevoke)
	if afterRevoke.Token != nil {
		t.Errorf("after revoke: expected nil token, got %v", *afterRevoke.Token)
	}
}

func TestCreateShareLink_TokenIs32HexChars(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo, testBaseURL)
	router := setupRouter(h)

	// Create multiple tokens and verify they're all valid hex
	for i := 0; i < 5; i++ {
		req := authRequest(http.MethodPost, "/api/v1/share-link")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		var resp ShareLink
		json.Unmarshal(w.Body.Bytes(), &resp)

		if resp.Token == nil {
			t.Fatalf("iteration %d: expected token", i)
		}
		token := *resp.Token
		if len(token) != 32 {
			t.Errorf("iteration %d: expected 32-char token, got %d: %s", i, len(token), token)
		}
		// Verify it's valid hex
		for _, c := range token {
			if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) {
				t.Errorf("iteration %d: token contains non-hex char: %c", i, c)
			}
		}
	}
}
