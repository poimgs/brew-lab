package auth

import (
	"context"
	"time"
)

type UserRepository interface {
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByID(ctx context.Context, id string) (*User, error)
	Create(ctx context.Context, email, passwordHash string) (*User, error)
}

type RefreshTokenRepository interface {
	Create(ctx context.Context, userID, tokenHash string, expiresAt time.Time) (*RefreshToken, error)
	GetByTokenHash(ctx context.Context, tokenHash string) (*RefreshToken, error)
	DeleteByTokenHash(ctx context.Context, tokenHash string) error
	DeleteAllForUser(ctx context.Context, userID string) error
}
