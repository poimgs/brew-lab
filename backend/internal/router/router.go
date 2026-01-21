package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-playground/validator/v10"
	authhandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/auth"
	coffeehandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/coffee"
	defaultshandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/defaults"
	experimentshandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/experiments"
	tagshandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/tags"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/services/auth"
	coffeeservice "github.com/poimgs/coffee-tracker/backend/internal/services/coffee"
	"github.com/poimgs/coffee-tracker/backend/internal/services/defaults"
	"github.com/poimgs/coffee-tracker/backend/internal/services/experiment"
	"github.com/poimgs/coffee-tracker/backend/internal/services/tags"
)

type Config struct {
	AuthService        *auth.AuthService
	CoffeeService      *coffeeservice.CoffeeService
	ExperimentService  *experiment.ExperimentService
	DefaultsService    *defaults.DefaultsService
	TagsService        *tags.TagsService
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

		r.Route("/coffees", func(r chi.Router) {
			r.Use(cfg.AuthMiddleware.Authenticate)
			r.Get("/", coffeehandlers.NewListHandler(cfg.CoffeeService).ServeHTTP)
			r.Post("/", coffeehandlers.NewCreateHandler(cfg.CoffeeService, validate).ServeHTTP)
			r.Get("/suggestions", coffeehandlers.NewSuggestionsHandler(cfg.CoffeeService).ServeHTTP)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", coffeehandlers.NewGetHandler(cfg.CoffeeService).ServeHTTP)
				r.Put("/", coffeehandlers.NewUpdateHandler(cfg.CoffeeService, validate).ServeHTTP)
				r.Delete("/", coffeehandlers.NewDeleteHandler(cfg.CoffeeService).ServeHTTP)
			})
		})

		r.Route("/experiments", func(r chi.Router) {
			r.Use(cfg.AuthMiddleware.Authenticate)
			r.Get("/", experimentshandlers.NewListHandler(cfg.ExperimentService).ServeHTTP)
			r.Post("/", experimentshandlers.NewCreateHandler(cfg.ExperimentService, validate).ServeHTTP)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", experimentshandlers.NewGetHandler(cfg.ExperimentService).ServeHTTP)
				r.Put("/", experimentshandlers.NewUpdateHandler(cfg.ExperimentService, validate).ServeHTTP)
				r.Delete("/", experimentshandlers.NewDeleteHandler(cfg.ExperimentService).ServeHTTP)
				r.Post("/copy", experimentshandlers.NewCopyHandler(cfg.ExperimentService).ServeHTTP)
				r.Post("/tags", experimentshandlers.NewAddTagsHandler(cfg.ExperimentService).ServeHTTP)
				r.Delete("/tags/{tagID}", experimentshandlers.NewRemoveTagHandler(cfg.ExperimentService).ServeHTTP)
			})
		})

		r.Route("/defaults", func(r chi.Router) {
			r.Use(cfg.AuthMiddleware.Authenticate)
			r.Get("/", defaultshandlers.NewGetHandler(cfg.DefaultsService).ServeHTTP)
			r.Put("/", defaultshandlers.NewUpdateHandler(cfg.DefaultsService, validate).ServeHTTP)
			r.Delete("/{field}", defaultshandlers.NewDeleteHandler(cfg.DefaultsService).ServeHTTP)
		})

		r.Route("/tags", func(r chi.Router) {
			r.Use(cfg.AuthMiddleware.Authenticate)
			r.Get("/", tagshandlers.NewListHandler(cfg.TagsService).ServeHTTP)
		})
	})

	return r
}
