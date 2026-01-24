package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                   string
	DatabaseURL            string
	JWTSecret              string
	JWTAccessTokenExpiry   time.Duration
	JWTRefreshTokenExpiry  time.Duration
	BcryptCost             int
	CORSAllowedOrigins     []string
	RateLimitLoginPerIP    int
	RateLimitLoginPerEmail int
	CookieSecure           bool
}

func Load() *Config {
	return &Config{
		Port:                   getEnv("PORT", "8080"),
		DatabaseURL:            getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/coffee_tracker?sslmode=disable"),
		JWTSecret:              getEnv("JWT_SECRET", "your-256-bit-secret-change-in-production"),
		JWTAccessTokenExpiry:   getDuration("JWT_ACCESS_TOKEN_EXPIRY", time.Hour),
		JWTRefreshTokenExpiry:  getDuration("JWT_REFRESH_TOKEN_EXPIRY", 168*time.Hour),
		BcryptCost:             getInt("BCRYPT_COST", 12),
		CORSAllowedOrigins:     getStringSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
		RateLimitLoginPerIP:    getInt("RATE_LIMIT_LOGIN_PER_IP", 5),
		RateLimitLoginPerEmail: getInt("RATE_LIMIT_LOGIN_PER_EMAIL", 10),
		CookieSecure:           getBool("COOKIE_SECURE", false),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getStringSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		return strings.Split(value, ",")
	}
	return defaultValue
}

func getBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return strings.ToLower(value) == "true" || value == "1"
	}
	return defaultValue
}
