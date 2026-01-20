package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-playground/validator/v10"
	authhandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/auth"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/services/auth"
)

type Config struct {
	AuthService        *auth.AuthService
	AuthMiddleware     *middleware.AuthMiddleware
	CORSMiddleware     func(http.Handler) http.Handler
	LoginRateLimiter   func(http.Handler) http.Handler
}

func New(cfg *Config) *chi.Mux {
	r := chi.NewRouter()
	validate := validator.New()

	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(cfg.CORSMiddleware)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.With(cfg.LoginRateLimiter).Post("/login", authhandlers.NewLoginHandler(cfg.AuthService, validate).ServeHTTP)
			r.Post("/refresh", authhandlers.NewRefreshHandler(cfg.AuthService).ServeHTTP)

			r.Group(func(r chi.Router) {
				r.Use(cfg.AuthMiddleware.Authenticate)
				r.Post("/logout", authhandlers.NewLogoutHandler(cfg.AuthService).ServeHTTP)
				r.Get("/me", authhandlers.NewMeHandler(cfg.AuthService).ServeHTTP)
			})
		})
	})

	return r
}
