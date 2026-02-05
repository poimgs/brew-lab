package middleware

import (
	"net/http"
	"sync"
	"time"

	"coffee-tracker/internal/response"

	"golang.org/x/time/rate"
)

type RateLimiter struct {
	visitors map[string]*visitorLimiter
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
}

type visitorLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitorLimiter),
		rate:     r,
		burst:    burst,
	}

	go rl.cleanupVisitors()

	return rl
}

func (rl *RateLimiter) getVisitor(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		limiter := rate.NewLimiter(rl.rate, rl.burst)
		rl.visitors[ip] = &visitorLimiter{limiter: limiter, lastSeen: time.Now()}
		return limiter
	}

	v.lastSeen = time.Now()
	return v.limiter
}

func (rl *RateLimiter) cleanupVisitors() {
	for {
		time.Sleep(time.Minute)

		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > 3*time.Minute {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)
		limiter := rl.getVisitor(ip)

		if !limiter.Allow() {
			response.Error(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many requests")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func getIP(r *http.Request) string {
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		return forwarded
	}

	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	return r.RemoteAddr
}
