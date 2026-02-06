package main

import (
	"flag"
	"log"
	"net/http"

	"coffee-tracker/internal/auth"
	"coffee-tracker/internal/config"
	"coffee-tracker/internal/database"
	"coffee-tracker/internal/domain/coffee"
	"coffee-tracker/internal/domain/coffee_goal"
	"coffee-tracker/internal/domain/defaults"
	"coffee-tracker/internal/domain/experiment"
	"coffee-tracker/internal/domain/filter_paper"
	"coffee-tracker/internal/domain/mineral_profile"
	"coffee-tracker/internal/domain/session"
	"coffee-tracker/internal/domain/user"
	"coffee-tracker/internal/middleware"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	"golang.org/x/time/rate"
)

func main() {
	migrate := flag.Bool("migrate", true, "Run database migrations on startup")
	flag.Parse()

	_ = godotenv.Load()

	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	if *migrate {
		log.Println("Running database migrations...")
		if err := database.RunMigrations(db); err != nil {
			log.Fatalf("failed to run migrations: %v", err)
		}
	}

	userRepo := user.NewRepository(db)
	authService := auth.NewService(userRepo, cfg.JWTSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)
	authHandler := auth.NewHandler(authService, cfg.RefreshTokenTTL, cfg.Environment == "production")

	coffeeRepo := coffee.NewRepository(db)
	coffeeHandler := coffee.NewHandler(coffeeRepo)

	coffeeGoalRepo := coffee_goal.NewRepository(db)
	coffeeGoalHandler := coffee_goal.NewHandler(coffeeGoalRepo)

	filterPaperRepo := filter_paper.NewRepository(db)
	filterPaperHandler := filter_paper.NewHandler(filterPaperRepo)

	mineralProfileRepo := mineral_profile.NewRepository(db)
	mineralProfileHandler := mineral_profile.NewHandler(mineralProfileRepo)

	defaultsRepo := defaults.NewRepository(db)
	defaultsHandler := defaults.NewHandler(defaultsRepo)

	experimentRepo := experiment.NewRepository(db)
	experimentHandler := experiment.NewHandler(experimentRepo)

	sessionRepo := session.NewRepository(db)
	sessionHandler := session.NewHandler(sessionRepo)

	r := chi.NewRouter()

	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.RealIP)
	r.Use(middleware.CORS(cfg.AllowedOrigin))

	loginLimiter := middleware.NewRateLimiter(rate.Limit(5.0/60.0), 5)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.With(loginLimiter.Middleware).Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout", authHandler.Logout)

			r.Group(func(r chi.Router) {
				r.Use(auth.AuthMiddleware(cfg.JWTSecret))
				r.Get("/me", authHandler.Me)
			})
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(auth.AuthMiddleware(cfg.JWTSecret))

			r.Route("/coffees", func(r chi.Router) {
				r.Get("/", coffeeHandler.List)
				r.Post("/", coffeeHandler.Create)
				r.Get("/suggestions", coffeeHandler.Suggestions)
				r.Get("/{id}", coffeeHandler.Get)
				r.Put("/{id}", coffeeHandler.Update)
				r.Delete("/{id}", coffeeHandler.Delete)
				r.Post("/{id}/archive", coffeeHandler.Archive)
				r.Post("/{id}/unarchive", coffeeHandler.Unarchive)
				r.Post("/{id}/best-experiment", coffeeHandler.SetBestExperiment)
				r.Get("/{id}/reference", coffeeHandler.GetReference)
				r.Get("/{id}/goal-trends", coffeeHandler.GetGoalTrends)
				r.Get("/{id}/goals", coffeeGoalHandler.Get)
				r.Put("/{id}/goals", coffeeGoalHandler.Upsert)
				r.Delete("/{id}/goals", coffeeGoalHandler.Delete)
			})

			r.Route("/filter-papers", func(r chi.Router) {
				r.Get("/", filterPaperHandler.List)
				r.Post("/", filterPaperHandler.Create)
				r.Get("/{id}", filterPaperHandler.Get)
				r.Put("/{id}", filterPaperHandler.Update)
				r.Delete("/{id}", filterPaperHandler.Delete)
			})

			r.Route("/mineral-profiles", func(r chi.Router) {
				r.Get("/", mineralProfileHandler.List)
				r.Get("/{id}", mineralProfileHandler.Get)
			})

			r.Route("/defaults", func(r chi.Router) {
				r.Get("/", defaultsHandler.GetAll)
				r.Put("/", defaultsHandler.Update)
				r.Delete("/{field}", defaultsHandler.DeleteField)
			})

			r.Route("/experiments", func(r chi.Router) {
				r.Get("/", experimentHandler.List)
				r.Post("/", experimentHandler.Create)
				r.Get("/export", experimentHandler.Export)
				r.Post("/compare", experimentHandler.Compare)
				r.Post("/analyze", experimentHandler.Analyze)
				r.Post("/analyze/detail", experimentHandler.AnalyzeDetail)
				r.Get("/{id}", experimentHandler.Get)
				r.Put("/{id}", experimentHandler.Update)
				r.Delete("/{id}", experimentHandler.Delete)
				r.Post("/{id}/copy", experimentHandler.Copy)
			})

			r.Route("/sessions", func(r chi.Router) {
				r.Get("/", sessionHandler.List)
				r.Post("/", sessionHandler.Create)
				r.Get("/{id}", sessionHandler.Get)
				r.Put("/{id}", sessionHandler.Update)
				r.Delete("/{id}", sessionHandler.Delete)
				r.Post("/{id}/experiments", sessionHandler.LinkExperiments)
				r.Delete("/{id}/experiments/{expId}", sessionHandler.UnlinkExperiment)
			})

		})
	})

	log.Printf("Server starting on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
