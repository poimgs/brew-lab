package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	DatabaseURL    string
	JWTSecret      string
	Port           string
	AccessTokenTTL int
	RefreshTokenTTL int
	Environment    string
}

func Load() (*Config, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	accessTTL := 3600
	if v := os.Getenv("ACCESS_TOKEN_TTL"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil {
			return nil, fmt.Errorf("invalid ACCESS_TOKEN_TTL: %w", err)
		}
		accessTTL = parsed
	}

	refreshTTL := 604800
	if v := os.Getenv("REFRESH_TOKEN_TTL"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil {
			return nil, fmt.Errorf("invalid REFRESH_TOKEN_TTL: %w", err)
		}
		refreshTTL = parsed
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}

	return &Config{
		DatabaseURL:     dbURL,
		JWTSecret:       jwtSecret,
		Port:            port,
		AccessTokenTTL:  accessTTL,
		RefreshTokenTTL: refreshTTL,
		Environment:     env,
	}, nil
}
