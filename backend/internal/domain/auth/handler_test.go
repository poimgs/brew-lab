package auth

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
	"golang.org/x/crypto/bcrypt"

	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
)

const testSecret = "test-jwt-secret-key"

// --- Mock Repositories ---

type mockUserRepo struct {
	users map[string]*User // keyed by email
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{users: make(map[string]*User)}
}

func (m *mockUserRepo) GetByEmail(_ context.Context, email string) (*User, error) {
	return m.users[email], nil
}

func (m *mockUserRepo) GetByID(_ context.Context, id string) (*User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, nil
}

func (m *mockUserRepo) Create(_ context.Context, email, passwordHash string) (*User, error) {
	u := &User{
		ID:           "test-user-id",
		Email:        email,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	m.users[email] = u
	return u, nil
}

type mockRefreshTokenRepo struct {
	tokens map[string]*RefreshToken // keyed by token_hash
}

func newMockRefreshTokenRepo() *mockRefreshTokenRepo {
	return &mockRefreshTokenRepo{tokens: make(map[string]*RefreshToken)}
}

func (m *mockRefreshTokenRepo) Create(_ context.Context, userID, tokenHash string, expiresAt time.Time) (*RefreshToken, error) {
	rt := &RefreshToken{
		ID:        "test-refresh-token-id",
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
	}
	m.tokens[tokenHash] = rt
	return rt, nil
}

func (m *mockRefreshTokenRepo) GetByTokenHash(_ context.Context, tokenHash string) (*RefreshToken, error) {
	return m.tokens[tokenHash], nil
}

func (m *mockRefreshTokenRepo) DeleteByTokenHash(_ context.Context, tokenHash string) error {
	delete(m.tokens, tokenHash)
	return nil
}

func (m *mockRefreshTokenRepo) DeleteAllForUser(_ context.Context, userID string) error {
	for hash, rt := range m.tokens {
		if rt.UserID == userID {
			delete(m.tokens, hash)
		}
	}
	return nil
}

// Error-returning mocks

type errorUserRepo struct{}

func (e *errorUserRepo) GetByEmail(_ context.Context, _ string) (*User, error) {
	return nil, errors.New("database error")
}
func (e *errorUserRepo) GetByID(_ context.Context, _ string) (*User, error) {
	return nil, errors.New("database error")
}
func (e *errorUserRepo) Create(_ context.Context, _, _ string) (*User, error) {
	return nil, errors.New("database error")
}

// --- Helpers ---

func makeTestHandler(userRepo UserRepository, tokenRepo RefreshTokenRepository) *Handler {
	return NewHandler(userRepo, tokenRepo, testSecret, 3600, 604800, false)
}

func seedTestUser(repo *mockUserRepo) *User {
	hash, _ := bcrypt.GenerateFromPassword([]byte("SecurePass1!"), 12)
	u := &User{
		ID:           "user-123",
		Email:        "test@example.com",
		PasswordHash: string(hash),
		CreatedAt:    time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		UpdatedAt:    time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}
	repo.users["test@example.com"] = u
	return u
}

func generateTestAccessToken(userID, email string) string {
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, _ := token.SignedString([]byte(testSecret))
	return s
}

func setupAuthRouter(h *Handler) *chi.Mux {
	r := chi.NewRouter()
	r.Route("/api/v1/auth", func(r chi.Router) {
		r.Post("/login", h.Login)
		r.Post("/refresh", h.Refresh)
		r.With(middleware.RequireAuth(testSecret)).Post("/logout", h.Logout)
		r.With(middleware.RequireAuth(testSecret)).Get("/me", h.Me)
	})
	return r
}

// --- Login Tests ---

func TestLogin_Success(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	seedTestUser(userRepo)
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	body := `{"email":"test@example.com","password":"SecurePass1!"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp LoginResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.User.ID != "user-123" {
		t.Errorf("expected user ID user-123, got %s", resp.User.ID)
	}
	if resp.User.Email != "test@example.com" {
		t.Errorf("expected email test@example.com, got %s", resp.User.Email)
	}
	if resp.AccessToken == "" {
		t.Error("expected access_token to be non-empty")
	}

	// Verify refresh token cookie is set
	cookies := w.Result().Cookies()
	var refreshCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "refresh_token" {
			refreshCookie = c
			break
		}
	}
	if refreshCookie == nil {
		t.Fatal("expected refresh_token cookie to be set")
	}
	if !refreshCookie.HttpOnly {
		t.Error("expected refresh_token cookie to be HttpOnly")
	}
	if refreshCookie.SameSite != http.SameSiteStrictMode {
		t.Error("expected refresh_token cookie SameSite=Strict")
	}

	// Verify refresh token stored in repo
	if len(tokenRepo.tokens) != 1 {
		t.Errorf("expected 1 refresh token stored, got %d", len(tokenRepo.tokens))
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	seedTestUser(userRepo)
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	body := `{"email":"test@example.com","password":"WrongPass1!"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	errObj := resp["error"].(map[string]interface{})
	if errObj["message"] != "Invalid email or password" {
		t.Errorf("expected generic error message, got %s", errObj["message"])
	}
}

func TestLogin_NonexistentUser(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	body := `{"email":"nobody@example.com","password":"SecurePass1!"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}

	// Same generic message for non-existent user (no enumeration)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	errObj := resp["error"].(map[string]interface{})
	if errObj["message"] != "Invalid email or password" {
		t.Errorf("expected generic error message, got %s", errObj["message"])
	}
}

func TestLogin_EmptyBody(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader("{}"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestLogin_InvalidJSON(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestLogin_DatabaseError(t *testing.T) {
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(&errorUserRepo{}, tokenRepo)
	router := setupAuthRouter(h)

	body := `{"email":"test@example.com","password":"SecurePass1!"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- Refresh Tests ---

func TestRefresh_Success(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	seedTestUser(userRepo)
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	// First login to get a refresh token
	loginBody := `{"email":"test@example.com","password":"SecurePass1!"}`
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReq)

	if loginW.Code != http.StatusOK {
		t.Fatalf("login failed: %d %s", loginW.Code, loginW.Body.String())
	}

	// Extract refresh token cookie
	var refreshCookie *http.Cookie
	for _, c := range loginW.Result().Cookies() {
		if c.Name == "refresh_token" {
			refreshCookie = c
			break
		}
	}
	if refreshCookie == nil {
		t.Fatal("no refresh_token cookie from login")
	}

	// Use the refresh token
	refreshReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	refreshReq.AddCookie(refreshCookie)
	refreshW := httptest.NewRecorder()
	router.ServeHTTP(refreshW, refreshReq)

	if refreshW.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", refreshW.Code, refreshW.Body.String())
	}

	var resp RefreshResponse
	if err := json.Unmarshal(refreshW.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.AccessToken == "" {
		t.Error("expected non-empty access_token")
	}

	// Verify old token was rotated (deleted) and new one created
	if len(tokenRepo.tokens) != 1 {
		t.Errorf("expected 1 refresh token after rotation, got %d", len(tokenRepo.tokens))
	}

	// Verify new cookie is set
	var newRefreshCookie *http.Cookie
	for _, c := range refreshW.Result().Cookies() {
		if c.Name == "refresh_token" {
			newRefreshCookie = c
			break
		}
	}
	if newRefreshCookie == nil {
		t.Fatal("expected new refresh_token cookie after refresh")
	}

	// Verify the old token hash was deleted by trying to reuse the old cookie
	replayReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	replayReq.AddCookie(refreshCookie)
	replayW := httptest.NewRecorder()
	router.ServeHTTP(replayW, replayReq)
	if replayW.Code != http.StatusUnauthorized {
		t.Errorf("expected replayed old refresh token to be rejected, got %d", replayW.Code)
	}
}

func TestRefresh_NoCookie(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestRefresh_InvalidToken(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: "invalid-token"})
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestRefresh_RevokedToken(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	seedTestUser(userRepo)
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	// Login to get a refresh token
	loginBody := `{"email":"test@example.com","password":"SecurePass1!"}`
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReq)

	var refreshCookie *http.Cookie
	for _, c := range loginW.Result().Cookies() {
		if c.Name == "refresh_token" {
			refreshCookie = c
			break
		}
	}

	// Clear all tokens from repo (simulating revocation)
	tokenRepo.tokens = make(map[string]*RefreshToken)

	// Try to refresh with the now-revoked token
	refreshReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	refreshReq.AddCookie(refreshCookie)
	refreshW := httptest.NewRecorder()
	router.ServeHTTP(refreshW, refreshReq)

	if refreshW.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 for revoked token, got %d", refreshW.Code)
	}
}

func TestRefresh_AccessTokenRejected(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	// Create an access token (no "type": "refresh" claim)
	accessToken := generateTestAccessToken("user-123", "test@example.com")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: accessToken})
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 when using access token as refresh, got %d", w.Code)
	}
}

// --- Logout Tests ---

func TestLogout_Success(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	seedTestUser(userRepo)
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	// Login first
	loginBody := `{"email":"test@example.com","password":"SecurePass1!"}`
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReq)

	var loginResp LoginResponse
	json.Unmarshal(loginW.Body.Bytes(), &loginResp)

	var refreshCookie *http.Cookie
	for _, c := range loginW.Result().Cookies() {
		if c.Name == "refresh_token" {
			refreshCookie = c
			break
		}
	}

	// Logout
	logoutReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	logoutReq.Header.Set("Authorization", "Bearer "+loginResp.AccessToken)
	logoutReq.AddCookie(refreshCookie)
	logoutW := httptest.NewRecorder()
	router.ServeHTTP(logoutW, logoutReq)

	if logoutW.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d: %s", logoutW.Code, logoutW.Body.String())
	}

	// Verify refresh token was deleted
	if len(tokenRepo.tokens) != 0 {
		t.Errorf("expected 0 refresh tokens after logout, got %d", len(tokenRepo.tokens))
	}

	// Verify cookie is cleared
	var clearCookie *http.Cookie
	for _, c := range logoutW.Result().Cookies() {
		if c.Name == "refresh_token" {
			clearCookie = c
			break
		}
	}
	if clearCookie == nil || clearCookie.MaxAge != -1 {
		t.Error("expected refresh_token cookie to be cleared with MaxAge=-1")
	}
}

func TestLogout_NoAuthToken(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 without auth token, got %d", w.Code)
	}
}

// --- Me Tests ---

func TestMe_Success(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	user := seedTestUser(userRepo)
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	accessToken := generateTestAccessToken(user.ID, user.Email)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp UserResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}
	if resp.ID != user.ID {
		t.Errorf("expected ID %s, got %s", user.ID, resp.ID)
	}
	if resp.Email != user.Email {
		t.Errorf("expected email %s, got %s", user.Email, resp.Email)
	}
}

func TestMe_NoToken(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestMe_ExpiredToken(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	// Generate an expired token
	claims := jwt.MapClaims{
		"sub":   "user-123",
		"email": "test@example.com",
		"iat":   time.Now().Add(-2 * time.Hour).Unix(),
		"exp":   time.Now().Add(-1 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	expiredToken, _ := token.SignedString([]byte(testSecret))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+expiredToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 for expired token, got %d", w.Code)
	}
}

func TestMe_InvalidSignature(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	// Generate a token with a different secret
	claims := jwt.MapClaims{
		"sub":   "user-123",
		"email": "test@example.com",
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	badToken, _ := token.SignedString([]byte("wrong-secret"))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+badToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 for bad signature, got %d", w.Code)
	}
}

func TestMe_RefreshTokenRejected(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	// Generate a refresh token and try to use it as access token
	claims := jwt.MapClaims{
		"sub":  "user-123",
		"type": "refresh",
		"iat":  time.Now().Unix(),
		"exp":  time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	refreshToken, _ := token.SignedString([]byte(testSecret))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+refreshToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 when using refresh token as access token, got %d", w.Code)
	}
}

func TestMe_DatabaseError(t *testing.T) {
	tokenRepo := newMockRefreshTokenRepo()
	h := makeTestHandler(&errorUserRepo{}, tokenRepo)
	router := setupAuthRouter(h)

	accessToken := generateTestAccessToken("user-123", "test@example.com")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// --- Token Security Tests ---

func TestLogin_PasswordHashNotInResponse(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	seedTestUser(userRepo)
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	body := `{"email":"test@example.com","password":"SecurePass1!"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	responseBody := w.Body.String()
	if strings.Contains(responseBody, "$2a$") || strings.Contains(responseBody, "password_hash") {
		t.Error("response should not contain password hash")
	}
}

func TestAccessToken_Claims(t *testing.T) {
	userRepo := newMockUserRepo()
	tokenRepo := newMockRefreshTokenRepo()
	seedTestUser(userRepo)
	h := makeTestHandler(userRepo, tokenRepo)
	router := setupAuthRouter(h)

	body := `{"email":"test@example.com","password":"SecurePass1!"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp LoginResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	// Parse the access token and verify claims
	token, err := jwt.Parse(resp.AccessToken, func(token *jwt.Token) (interface{}, error) {
		return []byte(testSecret), nil
	})
	if err != nil {
		t.Fatalf("failed to parse access token: %v", err)
	}

	claims := token.Claims.(jwt.MapClaims)
	if claims["sub"] != "user-123" {
		t.Errorf("expected sub=user-123, got %v", claims["sub"])
	}
	if claims["email"] != "test@example.com" {
		t.Errorf("expected email=test@example.com, got %v", claims["email"])
	}
	if _, hasType := claims["type"]; hasType {
		t.Error("access token should not have 'type' claim")
	}
}
