package filterpaper

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
)

var (
	ErrNameRequired   = errors.New("name is required")
	ErrNameTooLong    = errors.New("name must be 100 characters or less")
	ErrNameExists     = repository.ErrFilterPaperNameExists
	ErrNotFound       = repository.ErrFilterPaperNotFound
)

type FilterPaperService struct {
	filterPaperRepo *repository.FilterPaperRepository
}

func NewFilterPaperService(filterPaperRepo *repository.FilterPaperRepository) *FilterPaperService {
	return &FilterPaperService{filterPaperRepo: filterPaperRepo}
}

func (s *FilterPaperService) Create(ctx context.Context, userID uuid.UUID, input models.CreateFilterPaperInput) (*models.FilterPaperResponse, error) {
	if input.Name == "" {
		return nil, ErrNameRequired
	}
	if len(input.Name) > 100 {
		return nil, ErrNameTooLong
	}

	fp, err := s.filterPaperRepo.Create(ctx, userID, input)
	if err != nil {
		return nil, err
	}

	return fp.ToResponse(), nil
}

func (s *FilterPaperService) GetByID(ctx context.Context, userID, filterPaperID uuid.UUID) (*models.FilterPaperResponse, error) {
	fp, err := s.filterPaperRepo.GetByID(ctx, userID, filterPaperID)
	if err != nil {
		return nil, err
	}

	return fp.ToResponse(), nil
}

func (s *FilterPaperService) List(ctx context.Context, userID uuid.UUID) (*models.FilterPaperListResponse, error) {
	filterPapers, err := s.filterPaperRepo.List(ctx, userID)
	if err != nil {
		return nil, err
	}

	responses := make([]models.FilterPaperResponse, len(filterPapers))
	for i, fp := range filterPapers {
		responses[i] = *fp.ToResponse()
	}

	return &models.FilterPaperListResponse{
		FilterPapers: responses,
		Total:        len(responses),
	}, nil
}

func (s *FilterPaperService) Update(ctx context.Context, userID, filterPaperID uuid.UUID, input models.UpdateFilterPaperInput) (*models.FilterPaperResponse, error) {
	if input.Name != nil && *input.Name == "" {
		return nil, ErrNameRequired
	}
	if input.Name != nil && len(*input.Name) > 100 {
		return nil, ErrNameTooLong
	}

	fp, err := s.filterPaperRepo.Update(ctx, userID, filterPaperID, input)
	if err != nil {
		return nil, err
	}

	return fp.ToResponse(), nil
}

func (s *FilterPaperService) Delete(ctx context.Context, userID, filterPaperID uuid.UUID) error {
	return s.filterPaperRepo.Delete(ctx, userID, filterPaperID)
}
