package main

import (
	"flag"
	"log"
	"net/http"

	"coffee-tracker/internal/auth"
	"coffee-tracker/internal/config"
	"coffee-tracker/internal/database"
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
	})

	log.Printf("Server starting on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
