package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/poimgs/coffee-tracker/backend/internal/api"
)

func TestRateLimit_AllowsWithinLimit(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RateLimit(3, time.Minute)(next)

	for i := 0; i < 3; i++ {
		*called = false
		req := httptest.NewRequest(http.MethodPost, "/login", nil)
		req.RemoteAddr = "192.168.1.1:1234"
		rec := httptest.NewRecorder()

		mw.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("request %d: expected 200, got %d", i+1, rec.Code)
		}
		if !*called {
			t.Errorf("request %d: expected handler to be called", i+1)
		}
	}
}

func TestRateLimit_BlocksOverLimit(t *testing.T) {
	next, _, _ := dummyHandler()
	mw := RateLimit(2, time.Minute)(next)

	// Exhaust limit
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/login", nil)
		req.RemoteAddr = "192.168.1.1:1234"
		rec := httptest.NewRecorder()
		mw.ServeHTTP(rec, req)
	}

	// Third request should be blocked
	req := httptest.NewRequest(http.MethodPost, "/login", nil)
	req.RemoteAddr = "192.168.1.1:1234"
	rec := httptest.NewRecorder()
	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429, got %d", rec.Code)
	}

	var resp api.ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode error: %v", err)
	}
	if resp.Error.Code != "RATE_LIMITED" {
		t.Errorf("expected RATE_LIMITED code, got %q", resp.Error.Code)
	}
	if rec.Header().Get("Retry-After") != "60" {
		t.Errorf("expected Retry-After header '60', got %q", rec.Header().Get("Retry-After"))
	}
}

func TestRateLimit_DifferentIPsAreIndependent(t *testing.T) {
	next, called, _ := dummyHandler()
	mw := RateLimit(1, time.Minute)(next)

	// First IP uses its limit
	req1 := httptest.NewRequest(http.MethodPost, "/login", nil)
	req1.RemoteAddr = "10.0.0.1:1234"
	rec1 := httptest.NewRecorder()
	mw.ServeHTTP(rec1, req1)
	if rec1.Code != http.StatusOK {
		t.Errorf("first IP: expected 200, got %d", rec1.Code)
	}

	// Second IP should still be allowed
	*called = false
	req2 := httptest.NewRequest(http.MethodPost, "/login", nil)
	req2.RemoteAddr = "10.0.0.2:5678"
	rec2 := httptest.NewRecorder()
	mw.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusOK {
		t.Errorf("second IP: expected 200, got %d", rec2.Code)
	}
	if !*called {
		t.Error("second IP handler should be called")
	}
}

func TestRateLimit_WindowExpiry(t *testing.T) {
	// Use a very short window so we can test expiry
	rl := newRateLimiter(1, 50*time.Millisecond)

	if !rl.allow("key1") {
		t.Error("first request should be allowed")
	}
	if rl.allow("key1") {
		t.Error("second request should be blocked")
	}

	// Wait for window to expire
	time.Sleep(60 * time.Millisecond)

	if !rl.allow("key1") {
		t.Error("request after window should be allowed")
	}
}

func TestRateLimiter_Allow_CleanupExpiredEntries(t *testing.T) {
	rl := newRateLimiter(2, 50*time.Millisecond)

	// Fill up with 2 requests
	rl.allow("key1")
	rl.allow("key1")

	// Should be at limit
	if rl.allow("key1") {
		t.Error("should be at limit")
	}

	// Wait for entries to expire
	time.Sleep(60 * time.Millisecond)

	// Now should be allowed again (old entries cleaned up)
	if !rl.allow("key1") {
		t.Error("should be allowed after window expires")
	}
}
