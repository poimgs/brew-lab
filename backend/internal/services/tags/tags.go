package tags

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
)

var (
	ErrTagNameRequired    = errors.New("tag name is required")
	ErrTagNameTooShort    = errors.New("tag name must be at least 2 characters")
	ErrTagNameTooLong     = errors.New("tag name must be at most 100 characters")
	ErrCannotDeleteSystem = errors.New("cannot delete system tags")
)

type TagsService struct {
	tagsRepo *repository.IssueTagsRepository
}

func NewTagsService(tagsRepo *repository.IssueTagsRepository) *TagsService {
	return &TagsService{tagsRepo: tagsRepo}
}

func (s *TagsService) List(ctx context.Context, userID uuid.UUID) ([]*models.IssueTagResponse, error) {
	tags, err := s.tagsRepo.List(ctx, userID)
	if err != nil {
		return nil, err
	}

	responses := make([]*models.IssueTagResponse, len(tags))
	for i, tag := range tags {
		responses[i] = tag.ToResponse()
	}

	return responses, nil
}

func (s *TagsService) Create(ctx context.Context, userID uuid.UUID, input *models.CreateIssueTagInput) (*models.IssueTagResponse, error) {
	if input.Name == "" {
		return nil, ErrTagNameRequired
	}
	if len(input.Name) < 2 {
		return nil, ErrTagNameTooShort
	}
	if len(input.Name) > 100 {
		return nil, ErrTagNameTooLong
	}

	tag, err := s.tagsRepo.Create(ctx, userID, input.Name)
	if err != nil {
		return nil, err
	}

	return tag.ToResponse(), nil
}

func (s *TagsService) Delete(ctx context.Context, userID, tagID uuid.UUID) error {
	tag, err := s.tagsRepo.GetByID(ctx, tagID)
	if err != nil {
		return err
	}

	if tag.IsSystem {
		return ErrCannotDeleteSystem
	}

	return s.tagsRepo.Delete(ctx, userID, tagID)
}

func (s *TagsService) GetByID(ctx context.Context, tagID uuid.UUID) (*models.IssueTagResponse, error) {
	tag, err := s.tagsRepo.GetByID(ctx, tagID)
	if err != nil {
		return nil, err
	}
	return tag.ToResponse(), nil
}
