package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/poimgs/coffee-tracker/backend/internal/config"
	"github.com/poimgs/coffee-tracker/backend/internal/database"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
	"github.com/poimgs/coffee-tracker/backend/internal/router"
	"github.com/poimgs/coffee-tracker/backend/internal/services/auth"
	coffeeservice "github.com/poimgs/coffee-tracker/backend/internal/services/coffee"
	"github.com/poimgs/coffee-tracker/backend/internal/services/defaults"
	"github.com/poimgs/coffee-tracker/backend/internal/services/effectmapping"
	"github.com/poimgs/coffee-tracker/backend/internal/services/experiment"
	"github.com/poimgs/coffee-tracker/backend/internal/services/filterpaper"
	"github.com/poimgs/coffee-tracker/backend/internal/services/mineralprofile"
	"github.com/poimgs/coffee-tracker/backend/internal/services/tags"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	log.Println("Connected to database")

	// Repositories
	userRepo := repository.NewUserRepository(pool)
	tokenRepo := repository.NewTokenRepository(pool)
	coffeeRepo := repository.NewCoffeeRepository(pool)
	experimentRepo := repository.NewExperimentRepository(pool)
	experimentTagsRepo := repository.NewExperimentTagsRepository(pool)
	issueTagsRepo := repository.NewIssueTagsRepository(pool)
	userDefaultsRepo := repository.NewUserDefaultsRepository(pool)
	effectMappingRepo := repository.NewEffectMappingRepository(pool)
	filterPaperRepo := repository.NewFilterPaperRepository(pool)
	mineralProfileRepo := repository.NewMineralProfileRepository(pool)

	// Auth services
	passwordSvc := auth.NewPasswordService(cfg.BcryptCost)
	jwtSvc := auth.NewJWTService(cfg.JWTSecret, cfg.JWTAccessTokenExpiry, cfg.JWTRefreshTokenExpiry)
	authSvc := auth.NewAuthService(userRepo, tokenRepo, passwordSvc, jwtSvc)

	// Domain services
	coffeeSvc := coffeeservice.NewCoffeeService(coffeeRepo)
	filterPaperSvc := filterpaper.NewFilterPaperService(filterPaperRepo)
	mineralProfileSvc := mineralprofile.NewMineralProfileService(mineralProfileRepo)
	experimentSvc := experiment.NewExperimentService(experimentRepo, experimentTagsRepo, issueTagsRepo, coffeeSvc, filterPaperSvc)
	defaultsSvc := defaults.NewDefaultsService(userDefaultsRepo)
	tagsSvc := tags.NewTagsService(issueTagsRepo)
	effectMappingSvc := effectmapping.NewEffectMappingService(effectMappingRepo)

	// Middleware
	authMiddleware := middleware.NewAuthMiddleware(jwtSvc)
	corsMiddleware := middleware.NewCORS(cfg.CORSAllowedOrigins)
	loginRateLimiter := middleware.NewLoginRateLimiter(cfg.RateLimitLoginPerIP)

	r := router.New(&router.Config{
		AuthService:           authSvc,
		CoffeeService:         coffeeSvc,
		ExperimentService:     experimentSvc,
		DefaultsService:       defaultsSvc,
		TagsService:           tagsSvc,
		EffectMappingService:  effectMappingSvc,
		FilterPaperService:    filterPaperSvc,
		MineralProfileService: mineralProfileSvc,
		AuthMiddleware:        authMiddleware,
		CORSMiddleware:        corsMiddleware,
		LoginRateLimiter:      loginRateLimiter,
		CookieSecure:          cfg.CookieSecure,
	})

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Starting server on port %s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped")
}
