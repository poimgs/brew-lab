package auth

import (
	"context"
	"errors"
	"time"

	"coffee-tracker/internal/domain/user"

	"github.com/google/uuid"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidRefresh     = errors.New("invalid refresh token")
)

type Service struct {
	repo            *user.Repository
	jwtSecret       string
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

func NewService(repo *user.Repository, jwtSecret string, accessTTL, refreshTTL time.Duration) *Service {
	return &Service{
		repo:            repo,
		jwtSecret:       jwtSecret,
		accessTokenTTL:  accessTTL,
		refreshTokenTTL: refreshTTL,
	}
}

type LoginResult struct {
	AccessToken  string
	RefreshToken string
	User         *user.User
}

func (s *Service) Login(ctx context.Context, email, password string) (*LoginResult, error) {
	u, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, user.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !VerifyPassword(u.PasswordHash, password) {
		return nil, ErrInvalidCredentials
	}

	accessToken, err := GenerateAccessToken(u.ID, u.Email, s.jwtSecret, s.accessTokenTTL)
	if err != nil {
		return nil, err
	}

	refreshToken, jti, err := GenerateRefreshToken(u.ID, s.jwtSecret, s.refreshTokenTTL)
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(s.refreshTokenTTL)

	if err := s.repo.StoreRefreshToken(ctx, u.ID, jti, expiresAt); err != nil {
		return nil, err
	}

	return &LoginResult{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         u,
	}, nil
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (*LoginResult, error) {
	claims, err := ParseRefreshToken(refreshToken, s.jwtSecret)
	if err != nil {
		return nil, ErrInvalidRefresh
	}

	jti := claims.ID
	storedToken, err := s.repo.GetRefreshToken(ctx, jti)
	if err != nil {
		if errors.Is(err, user.ErrTokenNotFound) {
			return nil, ErrInvalidRefresh
		}
		return nil, err
	}

	if err := s.repo.RevokeRefreshToken(ctx, jti); err != nil {
		return nil, err
	}

	u, err := s.repo.GetByID(ctx, storedToken.UserID)
	if err != nil {
		return nil, err
	}

	accessToken, err := GenerateAccessToken(u.ID, u.Email, s.jwtSecret, s.accessTokenTTL)
	if err != nil {
		return nil, err
	}

	newRefreshToken, newJti, err := GenerateRefreshToken(u.ID, s.jwtSecret, s.refreshTokenTTL)
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(s.refreshTokenTTL)

	if err := s.repo.StoreRefreshToken(ctx, u.ID, newJti, expiresAt); err != nil {
		return nil, err
	}

	return &LoginResult{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		User:         u,
	}, nil
}

func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	claims, err := ParseRefreshToken(refreshToken, s.jwtSecret)
	if err != nil {
		return nil // Silent failure for invalid tokens during logout
	}
	return s.repo.RevokeRefreshToken(ctx, claims.ID)
}

func (s *Service) GetCurrentUser(ctx context.Context, userID uuid.UUID) (*user.User, error) {
	return s.repo.GetByID(ctx, userID)
}
