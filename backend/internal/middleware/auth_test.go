package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/poimgs/coffee-tracker/backend/internal/api"
)

const testSecret = "test-jwt-secret-key"

func signToken(claims jwt.MapClaims) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, _ := token.SignedString([]byte(testSecret))
	return s
}

func validAccessClaims(userID string) jwt.MapClaims {
	return jwt.MapClaims{
		"sub":   userID,
		"email": "test@example.com",
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
}

// dummyHandler is used as the next handler in the middleware chain.
// It records whether it was called and what user_id was in the context.
func dummyHandler() (http.Handler, *bool, *string) {
	called := false
	var gotUserID string
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		gotUserID = GetUserID(r.Context())
		w.WriteHeader(http.StatusOK)
	})
	return h, &called, &gotUserID
}

func parseErrorResponse(t *testing.T, rec *httptest.ResponseRecorder) api.ErrorResponse {
	t.Helper()
	var resp api.ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	return resp
}

// --- RequireAuth Tests ---

func TestRequireAuth_ValidToken(t *testing.T) {
	next, called, gotUserID := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	token := signToken(validAccessClaims("user-123"))
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if !*called {
		t.Error("expected next handler to be called")
	}
	if *gotUserID != "user-123" {
		t.Errorf("expected user_id 'user-123', got %q", *gotUserID)
	}
}

func TestRequireAuth_MissingAuthorizationHeader(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if *called {
		t.Error("next handler should not be called")
	}
	resp := parseErrorResponse(t, rec)
	if resp.Error.Code != "UNAUTHORIZED" {
		t.Errorf("expected UNAUTHORIZED code, got %q", resp.Error.Code)
	}
}

func TestRequireAuth_MalformedAuthorizationHeader_NoBearer(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Basic abc123")
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if *called {
		t.Error("next handler should not be called")
	}
	resp := parseErrorResponse(t, rec)
	if resp.Error.Message != "Invalid authorization header format" {
		t.Errorf("unexpected message: %q", resp.Error.Message)
	}
}

func TestRequireAuth_MalformedAuthorizationHeader_NoParts(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "BearerTokenWithNoSpace")
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if *called {
		t.Error("next handler should not be called")
	}
}

func TestRequireAuth_InvalidTokenSignature(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	// Sign with a different secret
	claims := validAccessClaims("user-123")
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, _ := token.SignedString([]byte("wrong-secret"))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+s)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if *called {
		t.Error("next handler should not be called")
	}
	resp := parseErrorResponse(t, rec)
	if resp.Error.Message != "Invalid or expired token" {
		t.Errorf("unexpected message: %q", resp.Error.Message)
	}
}

func TestRequireAuth_ExpiredToken(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	claims := jwt.MapClaims{
		"sub":   "user-123",
		"email": "test@example.com",
		"iat":   time.Now().Add(-2 * time.Hour).Unix(),
		"exp":   time.Now().Add(-1 * time.Hour).Unix(),
	}
	token := signToken(claims)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if *called {
		t.Error("next handler should not be called")
	}
}

func TestRequireAuth_GarbageToken(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer not.a.valid.jwt")
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if *called {
		t.Error("next handler should not be called")
	}
}

func TestRequireAuth_RefreshTokenRejected(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	claims := jwt.MapClaims{
		"sub":   "user-123",
		"email": "test@example.com",
		"type":  "refresh",
		"jti":   "some-jti",
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	token := signToken(claims)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if *called {
		t.Error("next handler should not be called")
	}
	resp := parseErrorResponse(t, rec)
	if resp.Error.Message != "Invalid token type" {
		t.Errorf("unexpected message: %q", resp.Error.Message)
	}
}

func TestRequireAuth_MissingSubject(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	claims := jwt.MapClaims{
		"email": "test@example.com",
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := signToken(claims)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if *called {
		t.Error("next handler should not be called")
	}
	resp := parseErrorResponse(t, rec)
	if resp.Error.Message != "Invalid token subject" {
		t.Errorf("unexpected message: %q", resp.Error.Message)
	}
}

func TestRequireAuth_EmptySubject(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	claims := jwt.MapClaims{
		"sub":   "",
		"email": "test@example.com",
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := signToken(claims)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if *called {
		t.Error("next handler should not be called")
	}
}

func TestRequireAuth_NonHMACSigningMethod(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	// Create a token that claims to use "none" algorithm
	claims := validAccessClaims("user-123")
	token := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
	s, _ := token.SignedString(jwt.UnsafeAllowNoneSignatureType)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+s)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if *called {
		t.Error("next handler should not be called for 'none' algorithm")
	}
}

func TestRequireAuth_AccessTokenWithTypeField_Allowed(t *testing.T) {
	// Access tokens with type="access" should pass
	next, called, _ := dummyHandler()
	mw := RequireAuth(testSecret)(next)

	claims := jwt.MapClaims{
		"sub":   "user-123",
		"email": "test@example.com",
		"type":  "access",
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := signToken(claims)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if !*called {
		t.Error("expected next handler to be called")
	}
}

// --- GetUserID Tests ---

func TestGetUserID_WithValue(t *testing.T) {
	ctx := context.WithValue(context.Background(), UserIDKey, "user-456")
	got := GetUserID(ctx)
	if got != "user-456" {
		t.Errorf("expected 'user-456', got %q", got)
	}
}

func TestGetUserID_WithoutValue(t *testing.T) {
	got := GetUserID(context.Background())
	if got != "" {
		t.Errorf("expected empty string, got %q", got)
	}
}

func TestGetUserID_WrongType(t *testing.T) {
	ctx := context.WithValue(context.Background(), UserIDKey, 12345)
	got := GetUserID(ctx)
	if got != "" {
		t.Errorf("expected empty string for wrong type, got %q", got)
	}
}
