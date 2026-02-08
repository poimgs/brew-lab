package config

import (
	"os"
	"testing"
)

func TestLoad_RequiresDatabaseURL(t *testing.T) {
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("JWT_SECRET")

	_, err := Load()
	if err == nil {
		t.Error("expected error when DATABASE_URL is missing")
	}
}

func TestLoad_RequiresJWTSecret(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	defer os.Unsetenv("DATABASE_URL")
	os.Unsetenv("JWT_SECRET")

	_, err := Load()
	if err == nil {
		t.Error("expected error when JWT_SECRET is missing")
	}
}

func TestLoad_Defaults(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("JWT_SECRET", "test-secret")
	defer os.Unsetenv("DATABASE_URL")
	defer os.Unsetenv("JWT_SECRET")

	// Clear optional vars to test defaults
	os.Unsetenv("PORT")
	os.Unsetenv("ACCESS_TOKEN_TTL")
	os.Unsetenv("REFRESH_TOKEN_TTL")
	os.Unsetenv("ENVIRONMENT")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.Port != "8080" {
		t.Errorf("expected port 8080, got %s", cfg.Port)
	}
	if cfg.AccessTokenTTL != 3600 {
		t.Errorf("expected access TTL 3600, got %d", cfg.AccessTokenTTL)
	}
	if cfg.RefreshTokenTTL != 604800 {
		t.Errorf("expected refresh TTL 604800, got %d", cfg.RefreshTokenTTL)
	}
	if cfg.Environment != "development" {
		t.Errorf("expected environment development, got %s", cfg.Environment)
	}
}

func TestLoad_CustomValues(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://localhost/prod")
	os.Setenv("JWT_SECRET", "prod-secret")
	os.Setenv("PORT", "9090")
	os.Setenv("ACCESS_TOKEN_TTL", "7200")
	os.Setenv("REFRESH_TOKEN_TTL", "1209600")
	os.Setenv("ENVIRONMENT", "production")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("PORT")
		os.Unsetenv("ACCESS_TOKEN_TTL")
		os.Unsetenv("REFRESH_TOKEN_TTL")
		os.Unsetenv("ENVIRONMENT")
	}()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.DatabaseURL != "postgres://localhost/prod" {
		t.Errorf("expected database URL postgres://localhost/prod, got %s", cfg.DatabaseURL)
	}
	if cfg.JWTSecret != "prod-secret" {
		t.Errorf("expected JWT secret prod-secret, got %s", cfg.JWTSecret)
	}
	if cfg.Port != "9090" {
		t.Errorf("expected port 9090, got %s", cfg.Port)
	}
	if cfg.AccessTokenTTL != 7200 {
		t.Errorf("expected access TTL 7200, got %d", cfg.AccessTokenTTL)
	}
	if cfg.RefreshTokenTTL != 1209600 {
		t.Errorf("expected refresh TTL 1209600, got %d", cfg.RefreshTokenTTL)
	}
	if cfg.Environment != "production" {
		t.Errorf("expected environment production, got %s", cfg.Environment)
	}
}

func TestLoad_InvalidTTL(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("JWT_SECRET", "test-secret")
	os.Setenv("ACCESS_TOKEN_TTL", "not-a-number")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("ACCESS_TOKEN_TTL")
	}()

	_, err := Load()
	if err == nil {
		t.Error("expected error for invalid ACCESS_TOKEN_TTL")
	}
}
