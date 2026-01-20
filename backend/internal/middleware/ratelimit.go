package middleware

import (
	"net/http"
	"time"

	"github.com/go-chi/httprate"
)

func NewRateLimiter(requestsPerMinute int) func(http.Handler) http.Handler {
	return httprate.LimitByIP(requestsPerMinute, time.Minute)
}

func NewLoginRateLimiter(requestsPerMinute int) func(http.Handler) http.Handler {
	return httprate.LimitByIP(requestsPerMinute, time.Minute)
}
