package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	"coffee-tracker/internal/auth"
	"coffee-tracker/internal/config"
	"coffee-tracker/internal/database"
	"coffee-tracker/internal/domain/user"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	email := flag.String("email", "", "User email")
	password := flag.String("password", "", "User password")
	flag.Parse()

	if *email == "" || *password == "" {
		fmt.Println("Usage: cli -email=user@example.com -password=SecurePass123!")
		os.Exit(1)
	}

	if err := auth.ValidatePasswordStrength(*password); err != nil {
		log.Fatalf("Password validation failed: %v", err)
	}

	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	hashedPassword, err := auth.HashPassword(*password)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	repo := user.NewRepository(db)
	u, err := repo.Create(context.Background(), *email, hashedPassword)
	if err != nil {
		log.Fatalf("Failed to create user: %v", err)
	}

	fmt.Printf("User created successfully!\n")
	fmt.Printf("ID: %s\n", u.ID)
	fmt.Printf("Email: %s\n", u.Email)
}
