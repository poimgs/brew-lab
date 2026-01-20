package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/poimgs/coffee-tracker/backend/internal/config"
	"github.com/poimgs/coffee-tracker/backend/internal/database"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
	"github.com/poimgs/coffee-tracker/backend/internal/services/auth"
)

func main() {
	email := flag.String("email", "", "User email address")
	password := flag.String("password", "", "User password")
	flag.Parse()

	if *email == "" || *password == "" {
		fmt.Fprintln(os.Stderr, "Usage: seed-user -email=<email> -password=<password>")
		fmt.Fprintln(os.Stderr, "\nPassword requirements:")
		fmt.Fprintln(os.Stderr, "  - Minimum 8 characters")
		fmt.Fprintln(os.Stderr, "  - At least one uppercase letter")
		fmt.Fprintln(os.Stderr, "  - At least one lowercase letter")
		fmt.Fprintln(os.Stderr, "  - At least one digit")
		fmt.Fprintln(os.Stderr, "  - At least one special character")
		os.Exit(1)
	}

	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	passwordSvc := auth.NewPasswordService(cfg.BcryptCost)
	userRepo := repository.NewUserRepository(pool)

	if err := passwordSvc.Validate(*password); err != nil {
		log.Fatalf("Password validation failed: %v", err)
	}

	hash, err := passwordSvc.Hash(*password)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	user, err := userRepo.Create(ctx, *email, hash)
	if err != nil {
		if errors.Is(err, repository.ErrEmailAlreadyExists) {
			log.Fatalf("User with email %s already exists", *email)
		}
		log.Fatalf("Failed to create user: %v", err)
	}

	fmt.Printf("User created successfully\n")
	fmt.Printf("  ID:    %s\n", user.ID)
	fmt.Printf("  Email: %s\n", user.Email)
}
