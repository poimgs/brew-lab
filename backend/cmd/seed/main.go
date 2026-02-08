package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"regexp"

	"golang.org/x/crypto/bcrypt"

	"github.com/poimgs/coffee-tracker/backend/internal/config"
	"github.com/poimgs/coffee-tracker/backend/internal/database"
	"github.com/poimgs/coffee-tracker/backend/internal/domain/auth"
)

func main() {
	email := os.Getenv("EMAIL")
	password := os.Getenv("PASSWORD")

	if email == "" || password == "" {
		log.Fatal("EMAIL and PASSWORD environment variables are required")
	}

	if err := validatePassword(password); err != nil {
		log.Fatalf("invalid password: %v", err)
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("loading config: %v", err)
	}

	ctx := context.Background()

	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connecting to database: %v", err)
	}
	defer pool.Close()

	userRepo := auth.NewPgUserRepository(pool)

	// Check if user already exists
	existing, err := userRepo.GetByEmail(ctx, email)
	if err != nil {
		log.Fatalf("checking for existing user: %v", err)
	}
	if existing != nil {
		log.Printf("user with email %s already exists (id: %s)", email, existing.ID)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		log.Fatalf("hashing password: %v", err)
	}

	user, err := userRepo.Create(ctx, email, string(hash))
	if err != nil {
		log.Fatalf("creating user: %v", err)
	}

	fmt.Printf("User created: id=%s email=%s\n", user.ID, user.Email)
}

func validatePassword(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("must be at least 8 characters")
	}
	if !regexp.MustCompile(`[A-Z]`).MatchString(password) {
		return fmt.Errorf("must contain at least one uppercase letter")
	}
	if !regexp.MustCompile(`[a-z]`).MatchString(password) {
		return fmt.Errorf("must contain at least one lowercase letter")
	}
	if !regexp.MustCompile(`[0-9]`).MatchString(password) {
		return fmt.Errorf("must contain at least one digit")
	}
	if !regexp.MustCompile(`[^a-zA-Z0-9]`).MatchString(password) {
		return fmt.Errorf("must contain at least one special character")
	}
	return nil
}
