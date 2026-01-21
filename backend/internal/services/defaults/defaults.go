package defaults

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
)

var (
	ErrInvalidFieldName = errors.New("invalid field name")
	ErrFieldValueEmpty  = errors.New("field value cannot be empty")
)

type DefaultsService struct {
	defaultsRepo *repository.UserDefaultsRepository
}

func NewDefaultsService(defaultsRepo *repository.UserDefaultsRepository) *DefaultsService {
	return &DefaultsService{defaultsRepo: defaultsRepo}
}

func (s *DefaultsService) Get(ctx context.Context, userID uuid.UUID) (models.UserDefaultsResponse, error) {
	defaults, err := s.defaultsRepo.GetAll(ctx, userID)
	if err != nil {
		return nil, err
	}

	response := make(models.UserDefaultsResponse)
	for _, def := range defaults {
		response[def.FieldName] = def.FieldValue
	}

	return response, nil
}

func (s *DefaultsService) Set(ctx context.Context, userID uuid.UUID, input *models.SetUserDefaultsInput) (models.UserDefaultsResponse, error) {
	// Validate all field names
	for fieldName, value := range input.Defaults {
		if !models.IsValidDefaultField(fieldName) {
			return nil, ErrInvalidFieldName
		}
		if value == "" {
			return nil, ErrFieldValueEmpty
		}
	}

	err := s.defaultsRepo.SetMultiple(ctx, userID, input.Defaults)
	if err != nil {
		return nil, err
	}

	return s.Get(ctx, userID)
}

func (s *DefaultsService) Delete(ctx context.Context, userID uuid.UUID, fieldName string) error {
	if !models.IsValidDefaultField(fieldName) {
		return ErrInvalidFieldName
	}

	return s.defaultsRepo.Delete(ctx, userID, fieldName)
}
