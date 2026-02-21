package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/poimgs/coffee-tracker/backend/internal/config"
	"github.com/poimgs/coffee-tracker/backend/internal/database"
	"github.com/poimgs/coffee-tracker/backend/internal/domain/auth"
	"github.com/poimgs/coffee-tracker/backend/internal/domain/brew"
	"github.com/poimgs/coffee-tracker/backend/internal/domain/coffee"
	"github.com/poimgs/coffee-tracker/backend/internal/domain/defaults"
	"github.com/poimgs/coffee-tracker/backend/internal/domain/dripper"
	"github.com/poimgs/coffee-tracker/backend/internal/domain/filterpaper"
	"github.com/poimgs/coffee-tracker/backend/internal/domain/sharelink"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("loading config: %v", err)
	}

	ctx := context.Background()

	// Run migrations
	migrationsPath := "internal/database/migrations"
	if err := database.RunMigrations(cfg.DatabaseURL, migrationsPath); err != nil {
		log.Fatalf("running migrations: %v", err)
	}

	// Connect to database
	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connecting to database: %v", err)
	}
	defer pool.Close()

	// Repositories
	userRepo := auth.NewPgUserRepository(pool)
	refreshTokenRepo := auth.NewPgRefreshTokenRepository(pool)
	filterPaperRepo := filterpaper.NewPgRepository(pool)
	dripperRepo := dripper.NewPgRepository(pool)
	coffeeRepo := coffee.NewPgRepository(pool)
	brewRepo := brew.NewPgRepository(pool)
	defaultsRepo := defaults.NewPgRepository(pool)
	shareLinkRepo := sharelink.NewPgRepository(pool)

	// Handlers
	secureCookie := cfg.Environment != "development"
	authHandler := auth.NewHandler(userRepo, refreshTokenRepo, cfg.JWTSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL, secureCookie)
	filterPaperHandler := filterpaper.NewHandler(filterPaperRepo)
	dripperHandler := dripper.NewHandler(dripperRepo)
	coffeeHandler := coffee.NewHandler(coffeeRepo)
	brewHandler := brew.NewHandler(brewRepo)
	defaultsHandler := defaults.NewHandler(defaultsRepo)
	shareLinkHandler := sharelink.NewHandler(shareLinkRepo, cfg.BaseURL)

	r := chi.NewRouter()

	// Middleware
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "https://brew-lab.steven-chia.com"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public share endpoint (rate limited)
		r.With(middleware.RateLimit(30, time.Minute)).Get("/share/{token}", shareLinkHandler.GetSharedCoffees)

		// Auth routes (public)
		r.Route("/auth", func(r chi.Router) {
			r.With(middleware.RateLimit(5, time.Minute)).Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.With(middleware.RequireAuth(cfg.JWTSecret)).Post("/logout", authHandler.Logout)
			r.With(middleware.RequireAuth(cfg.JWTSecret)).Get("/me", authHandler.Me)
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAuth(cfg.JWTSecret))

			// Filter papers
			r.Route("/filter-papers", func(r chi.Router) {
				r.Get("/", filterPaperHandler.List)
				r.Post("/", filterPaperHandler.Create)
				r.Get("/{id}", filterPaperHandler.GetByID)
				r.Put("/{id}", filterPaperHandler.Update)
				r.Delete("/{id}", filterPaperHandler.Delete)
			})

			// Drippers
			r.Route("/drippers", func(r chi.Router) {
				r.Get("/", dripperHandler.List)
				r.Post("/", dripperHandler.Create)
				r.Get("/{id}", dripperHandler.GetByID)
				r.Put("/{id}", dripperHandler.Update)
				r.Delete("/{id}", dripperHandler.Delete)
			})

			// Coffees
			r.Route("/coffees", func(r chi.Router) {
				r.Get("/", coffeeHandler.List)
				r.Post("/", coffeeHandler.Create)
				r.Get("/suggestions", coffeeHandler.Suggestions)
				r.Get("/{id}", coffeeHandler.GetByID)
				r.Put("/{id}", coffeeHandler.Update)
				r.Delete("/{id}", coffeeHandler.Delete)
				r.Post("/{id}/archive", coffeeHandler.Archive)
				r.Post("/{id}/unarchive", coffeeHandler.Unarchive)
				r.Post("/{id}/reference-brew", coffeeHandler.SetReferenceBrew)
				r.Get("/{id}/brews", brewHandler.ListByCoffee)
				r.Get("/{id}/reference", brewHandler.GetReference)
			})

			// Defaults
			r.Route("/defaults", func(r chi.Router) {
				r.Get("/", defaultsHandler.Get)
				r.Put("/", defaultsHandler.Put)
				r.Delete("/{field}", defaultsHandler.DeleteField)
			})

			// Brews
			r.Route("/brews", func(r chi.Router) {
				r.Get("/", brewHandler.List)
				r.Get("/recent", brewHandler.Recent)
				r.Post("/", brewHandler.Create)
				r.Get("/{id}", brewHandler.GetByID)
				r.Put("/{id}", brewHandler.Update)
				r.Delete("/{id}", brewHandler.Delete)
			})

			// Share link management
			r.Get("/share-link", shareLinkHandler.GetShareLink)
			r.Post("/share-link", shareLinkHandler.CreateShareLink)
			r.Delete("/share-link", shareLinkHandler.RevokeShareLink)
		})
	})

	// Server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("server starting on port %s (env: %s)", cfg.Port, cfg.Environment)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("server shutdown error: %v", err)
	}
	log.Println("server stopped")
}
