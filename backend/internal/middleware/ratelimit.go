package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/poimgs/coffee-tracker/backend/internal/api"
)

type rateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	limit    int
	window   time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{
		attempts: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// Remove expired attempts
	valid := rl.attempts[key][:0]
	for _, t := range rl.attempts[key] {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rl.limit {
		rl.attempts[key] = valid
		return false
	}

	rl.attempts[key] = append(valid, now)
	return true
}

// RateLimit returns middleware that limits requests per IP.
func RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	rl := newRateLimiter(limit, window)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr

			if !rl.allow(ip) {
				w.Header().Set("Retry-After", "60")
				api.WriteJSON(w, http.StatusTooManyRequests, api.ErrorResponse{
					Error: api.ErrorBody{
						Code:    "RATE_LIMITED",
						Message: "Too many requests. Please try again later.",
					},
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
