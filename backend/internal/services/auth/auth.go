package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
)

var (
	ErrEmailRequired    = errors.New("email is required")
	ErrPasswordRequired = errors.New("password is required")
)

type AuthService struct {
	userRepo    *repository.UserRepository
	tokenRepo   *repository.TokenRepository
	passwordSvc *PasswordService
	jwtSvc      *JWTService
}

func NewAuthService(
	userRepo *repository.UserRepository,
	tokenRepo *repository.TokenRepository,
	passwordSvc *PasswordService,
	jwtSvc *JWTService,
) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		tokenRepo:   tokenRepo,
		passwordSvc: passwordSvc,
		jwtSvc:      jwtSvc,
	}
}

type LoginInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	User        *models.UserResponse `json:"user"`
	AccessToken string               `json:"access_token"`
}

func (s *AuthService) Login(ctx context.Context, input *LoginInput) (*AuthResponse, string, error) {
	if input.Email == "" {
		return nil, "", ErrEmailRequired
	}
	if input.Password == "" {
		return nil, "", ErrPasswordRequired
	}

	user, err := s.userRepo.GetByEmail(ctx, input.Email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, "", ErrInvalidCredentials
		}
		return nil, "", err
	}

	if err := s.passwordSvc.Verify(input.Password, user.PasswordHash); err != nil {
		return nil, "", err
	}

	accessToken, err := s.jwtSvc.GenerateAccessToken(user.ID)
	if err != nil {
		return nil, "", err
	}

	refreshToken, refreshHash, expiresAt, err := s.jwtSvc.GenerateRefreshToken()
	if err != nil {
		return nil, "", err
	}

	_, err = s.tokenRepo.Create(ctx, user.ID, refreshHash, expiresAt)
	if err != nil {
		return nil, "", err
	}

	return &AuthResponse{
		User:        user.ToResponse(),
		AccessToken: accessToken,
	}, refreshToken, nil
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*AuthResponse, string, error) {
	tokenHash := s.jwtSvc.HashToken(refreshToken)

	storedToken, err := s.tokenRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, repository.ErrTokenNotFound) {
			return nil, "", ErrInvalidToken
		}
		return nil, "", err
	}

	if !storedToken.IsValid() {
		return nil, "", ErrInvalidToken
	}

	if err := s.tokenRepo.Revoke(ctx, storedToken.ID); err != nil {
		return nil, "", err
	}

	user, err := s.userRepo.GetByID(ctx, storedToken.UserID)
	if err != nil {
		return nil, "", err
	}

	accessToken, err := s.jwtSvc.GenerateAccessToken(user.ID)
	if err != nil {
		return nil, "", err
	}

	newRefreshToken, newRefreshHash, expiresAt, err := s.jwtSvc.GenerateRefreshToken()
	if err != nil {
		return nil, "", err
	}

	_, err = s.tokenRepo.Create(ctx, user.ID, newRefreshHash, expiresAt)
	if err != nil {
		return nil, "", err
	}

	return &AuthResponse{
		User:        user.ToResponse(),
		AccessToken: accessToken,
	}, newRefreshToken, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	tokenHash := s.jwtSvc.HashToken(refreshToken)

	storedToken, err := s.tokenRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, repository.ErrTokenNotFound) {
			return nil
		}
		return err
	}

	return s.tokenRepo.Revoke(ctx, storedToken.ID)
}

func (s *AuthService) GetCurrentUser(ctx context.Context, userID uuid.UUID) (*models.UserResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return user.ToResponse(), nil
}

func (s *AuthService) GetJWTService() *JWTService {
	return s.jwtSvc
}
