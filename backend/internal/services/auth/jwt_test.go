package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestJWTService_GenerateAccessToken(t *testing.T) {
	svc := NewJWTService("test-secret-key-256-bits-long!!", 1*time.Hour, 7*24*time.Hour)
	userID := uuid.New()

	token, err := svc.GenerateAccessToken(userID)
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	if token == "" {
		t.Error("GenerateAccessToken() returned empty string")
	}
}

func TestJWTService_ValidateAccessToken(t *testing.T) {
	svc := NewJWTService("test-secret-key-256-bits-long!!", 1*time.Hour, 7*24*time.Hour)
	userID := uuid.New()

	token, err := svc.GenerateAccessToken(userID)
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	claims, err := svc.ValidateAccessToken(token)
	if err != nil {
		t.Fatalf("ValidateAccessToken() error = %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("ValidateAccessToken() UserID = %v, want %v", claims.UserID, userID)
	}
}

func TestJWTService_ValidateAccessToken_Invalid(t *testing.T) {
	svc := NewJWTService("test-secret-key-256-bits-long!!", 1*time.Hour, 7*24*time.Hour)

	_, err := svc.ValidateAccessToken("invalid-token")
	if err != ErrInvalidToken {
		t.Errorf("ValidateAccessToken() error = %v, want %v", err, ErrInvalidToken)
	}
}

func TestJWTService_ValidateAccessToken_WrongSecret(t *testing.T) {
	svc1 := NewJWTService("secret-one-that-is-long-enough!", 1*time.Hour, 7*24*time.Hour)
	svc2 := NewJWTService("secret-two-that-is-long-enough!", 1*time.Hour, 7*24*time.Hour)

	token, err := svc1.GenerateAccessToken(uuid.New())
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	_, err = svc2.ValidateAccessToken(token)
	if err != ErrInvalidToken {
		t.Errorf("ValidateAccessToken() error = %v, want %v", err, ErrInvalidToken)
	}
}

func TestJWTService_ValidateAccessToken_Expired(t *testing.T) {
	svc := NewJWTService("test-secret-key-256-bits-long!!", -1*time.Hour, 7*24*time.Hour)

	token, err := svc.GenerateAccessToken(uuid.New())
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	_, err = svc.ValidateAccessToken(token)
	if err != ErrExpiredToken {
		t.Errorf("ValidateAccessToken() error = %v, want %v", err, ErrExpiredToken)
	}
}

func TestJWTService_GenerateRefreshToken(t *testing.T) {
	svc := NewJWTService("test-secret-key-256-bits-long!!", 1*time.Hour, 7*24*time.Hour)

	token, hash, expiresAt, err := svc.GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken() error = %v", err)
	}

	if token == "" {
		t.Error("GenerateRefreshToken() token is empty")
	}

	if hash == "" {
		t.Error("GenerateRefreshToken() hash is empty")
	}

	if hash == token {
		t.Error("GenerateRefreshToken() hash should not equal token")
	}

	if expiresAt.Before(time.Now()) {
		t.Error("GenerateRefreshToken() expiresAt should be in the future")
	}
}

func TestJWTService_HashToken(t *testing.T) {
	svc := NewJWTService("test-secret", 1*time.Hour, 7*24*time.Hour)

	token := "test-refresh-token"
	hash1 := svc.HashToken(token)
	hash2 := svc.HashToken(token)

	if hash1 != hash2 {
		t.Error("HashToken() should be deterministic")
	}

	hash3 := svc.HashToken("different-token")
	if hash1 == hash3 {
		t.Error("HashToken() different tokens should have different hashes")
	}
}

func TestJWTService_GetRefreshTokenExpiry(t *testing.T) {
	expiry := 7 * 24 * time.Hour
	svc := NewJWTService("test-secret", 1*time.Hour, expiry)

	if svc.GetRefreshTokenExpiry() != expiry {
		t.Errorf("GetRefreshTokenExpiry() = %v, want %v", svc.GetRefreshTokenExpiry(), expiry)
	}
}
