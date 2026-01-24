package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-playground/validator/v10"
	authhandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/auth"
	coffeehandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/coffee"
	defaultshandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/defaults"
	effectmappinghandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/effectmapping"
	experimentshandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/experiments"
	filterpaperhandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/filterpaper"
	mineralprofilehandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/mineralprofile"
	tagshandlers "github.com/poimgs/coffee-tracker/backend/internal/handlers/tags"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/services/auth"
	coffeeservice "github.com/poimgs/coffee-tracker/backend/internal/services/coffee"
	"github.com/poimgs/coffee-tracker/backend/internal/services/defaults"
	"github.com/poimgs/coffee-tracker/backend/internal/services/effectmapping"
	"github.com/poimgs/coffee-tracker/backend/internal/services/experiment"
	"github.com/poimgs/coffee-tracker/backend/internal/services/filterpaper"
	"github.com/poimgs/coffee-tracker/backend/internal/services/mineralprofile"
	"github.com/poimgs/coffee-tracker/backend/internal/services/tags"
)

type Config struct {
	AuthService           *auth.AuthService
	CoffeeService         *coffeeservice.CoffeeService
	ExperimentService     *experiment.ExperimentService
	DefaultsService       *defaults.DefaultsService
	TagsService           *tags.TagsService
	EffectMappingService  *effectmapping.EffectMappingService
	FilterPaperService    *filterpaper.FilterPaperService
	MineralProfileService *mineralprofile.MineralProfileService
	AuthMiddleware        *middleware.AuthMiddleware
	CORSMiddleware        func(http.Handler) http.Handler
	LoginRateLimiter      func(http.Handler) http.Handler
	CookieSecure          bool
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
			r.With(cfg.LoginRateLimiter).Post("/login", authhandlers.NewLoginHandler(cfg.AuthService, validate, cfg.CookieSecure).ServeHTTP)
			r.Post("/refresh", authhandlers.NewRefreshHandler(cfg.AuthService, cfg.CookieSecure).ServeHTTP)

			r.Group(func(r chi.Router) {
				r.Use(cfg.AuthMiddleware.Authenticate)
				r.Post("/logout", authhandlers.NewLogoutHandler(cfg.AuthService, cfg.CookieSecure).ServeHTTP)
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
				r.Get("/optimization", experimentshandlers.NewOptimizationHandler(cfg.ExperimentService).ServeHTTP)
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

		r.Route("/effect-mappings", func(r chi.Router) {
			r.Use(cfg.AuthMiddleware.Authenticate)
			r.Get("/", effectmappinghandlers.NewListHandler(cfg.EffectMappingService).ServeHTTP)
			r.Post("/", effectmappinghandlers.NewCreateHandler(cfg.EffectMappingService, validate).ServeHTTP)
			r.Post("/relevant", effectmappinghandlers.NewRelevantHandler(cfg.EffectMappingService, validate).ServeHTTP)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", effectmappinghandlers.NewGetHandler(cfg.EffectMappingService).ServeHTTP)
				r.Put("/", effectmappinghandlers.NewUpdateHandler(cfg.EffectMappingService, validate).ServeHTTP)
				r.Delete("/", effectmappinghandlers.NewDeleteHandler(cfg.EffectMappingService).ServeHTTP)
				r.Patch("/toggle", effectmappinghandlers.NewToggleHandler(cfg.EffectMappingService).ServeHTTP)
			})
		})

		r.Route("/filter-papers", func(r chi.Router) {
			r.Use(cfg.AuthMiddleware.Authenticate)
			r.Get("/", filterpaperhandlers.NewListHandler(cfg.FilterPaperService).ServeHTTP)
			r.Post("/", filterpaperhandlers.NewCreateHandler(cfg.FilterPaperService, validate).ServeHTTP)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", filterpaperhandlers.NewGetHandler(cfg.FilterPaperService).ServeHTTP)
				r.Put("/", filterpaperhandlers.NewUpdateHandler(cfg.FilterPaperService, validate).ServeHTTP)
				r.Delete("/", filterpaperhandlers.NewDeleteHandler(cfg.FilterPaperService).ServeHTTP)
			})
		})

		r.Route("/mineral-profiles", func(r chi.Router) {
			r.Use(cfg.AuthMiddleware.Authenticate)
			r.Get("/", mineralprofilehandlers.NewListHandler(cfg.MineralProfileService).ServeHTTP)
		})
	})

	return r
}
