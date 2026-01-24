package mineralprofile

import (
	"context"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
)

var (
	ErrNotFound = repository.ErrMineralProfileNotFound
)

type MineralProfileService struct {
	mineralProfileRepo *repository.MineralProfileRepository
}

func NewMineralProfileService(mineralProfileRepo *repository.MineralProfileRepository) *MineralProfileService {
	return &MineralProfileService{mineralProfileRepo: mineralProfileRepo}
}

func (s *MineralProfileService) GetByID(ctx context.Context, id uuid.UUID) (*models.MineralProfileResponse, error) {
	mp, err := s.mineralProfileRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mp.ToResponse(), nil
}

func (s *MineralProfileService) List(ctx context.Context) (*models.MineralProfileListResponse, error) {
	profiles, err := s.mineralProfileRepo.List(ctx)
	if err != nil {
		return nil, err
	}

	responses := make([]models.MineralProfileResponse, len(profiles))
	for i, mp := range profiles {
		responses[i] = *mp.ToResponse()
	}

	return &models.MineralProfileListResponse{
		MineralProfiles: responses,
		Total:           len(responses),
	}, nil
}
