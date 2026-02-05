package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port            string
	DatabaseURL     string
	JWTSecret       string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	AllowedOrigin   string
	Environment     string
}

func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/coffee_tracker?sslmode=disable"),
		JWTSecret:       getEnv("JWT_SECRET", "change-me-in-production"),
		AccessTokenTTL:  getDuration("ACCESS_TOKEN_TTL", time.Hour),
		RefreshTokenTTL: getDuration("REFRESH_TOKEN_TTL", 7*24*time.Hour),
		AllowedOrigin:   getEnv("ALLOWED_ORIGIN", "http://localhost:5173"),
		Environment:     getEnv("ENVIRONMENT", "development"),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getDuration(key string, fallback time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if seconds, err := strconv.Atoi(value); err == nil {
			return time.Duration(seconds) * time.Second
		}
	}
	return fallback
}
