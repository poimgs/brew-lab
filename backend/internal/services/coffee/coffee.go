package coffee

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/poimgs/coffee-tracker/backend/internal/models"
	"github.com/poimgs/coffee-tracker/backend/internal/repository"
)

var (
	ErrRoasterRequired     = errors.New("roaster is required")
	ErrNameRequired        = errors.New("name is required")
	ErrInvalidRoastLevel   = errors.New("invalid roast level")
	ErrRoastDateInFuture   = errors.New("roast date cannot be in the future")
	ErrPurchaseBeforeRoast = errors.New("purchase date cannot be before roast date")
	ErrCoffeeHasExperiments = errors.New("coffee has associated experiments")
)

type CoffeeService struct {
	coffeeRepo *repository.CoffeeRepository
}

func NewCoffeeService(coffeeRepo *repository.CoffeeRepository) *CoffeeService {
	return &CoffeeService{coffeeRepo: coffeeRepo}
}

type CreateCoffeeInput struct {
	Roaster      string             `json:"roaster" validate:"required,max=255"`
	Name         string             `json:"name" validate:"required,max=255"`
	Country      *string            `json:"country" validate:"omitempty,max=100"`
	Region       *string            `json:"region" validate:"omitempty,max=100"`
	Process      *string            `json:"process" validate:"omitempty,max=100"`
	RoastLevel   *models.RoastLevel `json:"roast_level"`
	TastingNotes *string            `json:"tasting_notes"`
	RoastDate    *time.Time         `json:"roast_date"`
	PurchaseDate *time.Time         `json:"purchase_date"`
	Notes        *string            `json:"notes"`
}

type UpdateCoffeeInput struct {
	Roaster      string             `json:"roaster" validate:"required,max=255"`
	Name         string             `json:"name" validate:"required,max=255"`
	Country      *string            `json:"country" validate:"omitempty,max=100"`
	Region       *string            `json:"region" validate:"omitempty,max=100"`
	Process      *string            `json:"process" validate:"omitempty,max=100"`
	RoastLevel   *models.RoastLevel `json:"roast_level"`
	TastingNotes *string            `json:"tasting_notes"`
	RoastDate    *time.Time         `json:"roast_date"`
	PurchaseDate *time.Time         `json:"purchase_date"`
	Notes        *string            `json:"notes"`
}

type ListCoffeesInput struct {
	Roaster  *string `json:"roaster"`
	Country  *string `json:"country"`
	Process  *string `json:"process"`
	Search   *string `json:"search"`
	SortBy   string  `json:"sort_by"`
	SortDir  string  `json:"sort_dir"`
	Page     int     `json:"page"`
	PageSize int     `json:"page_size"`
}

type CoffeeListResponse struct {
	Coffees    []*models.CoffeeResponse `json:"coffees"`
	TotalCount int                      `json:"total_count"`
	Page       int                      `json:"page"`
	PageSize   int                      `json:"page_size"`
	TotalPages int                      `json:"total_pages"`
}

func (s *CoffeeService) validateInput(roaster, name string, roastLevel *models.RoastLevel, roastDate, purchaseDate *time.Time) error {
	if roaster == "" {
		return ErrRoasterRequired
	}
	if name == "" {
		return ErrNameRequired
	}
	if roastLevel != nil && !roastLevel.IsValid() {
		return ErrInvalidRoastLevel
	}
	if roastDate != nil && roastDate.After(time.Now()) {
		return ErrRoastDateInFuture
	}
	if roastDate != nil && purchaseDate != nil && purchaseDate.Before(*roastDate) {
		return ErrPurchaseBeforeRoast
	}
	return nil
}

func (s *CoffeeService) Create(ctx context.Context, userID uuid.UUID, input *CreateCoffeeInput) (*models.CoffeeResponse, error) {
	if err := s.validateInput(input.Roaster, input.Name, input.RoastLevel, input.RoastDate, input.PurchaseDate); err != nil {
		return nil, err
	}

	coffee := &models.Coffee{
		UserID:       userID,
		Roaster:      input.Roaster,
		Name:         input.Name,
		Country:      input.Country,
		Region:       input.Region,
		Process:      input.Process,
		RoastLevel:   input.RoastLevel,
		TastingNotes: input.TastingNotes,
		RoastDate:    input.RoastDate,
		PurchaseDate: input.PurchaseDate,
		Notes:        input.Notes,
	}

	created, err := s.coffeeRepo.Create(ctx, coffee)
	if err != nil {
		return nil, err
	}

	return created.ToResponse(0, nil), nil
}

func (s *CoffeeService) GetByID(ctx context.Context, userID, coffeeID uuid.UUID) (*models.CoffeeResponse, error) {
	coffee, err := s.coffeeRepo.GetByID(ctx, userID, coffeeID)
	if err != nil {
		return nil, err
	}

	// Placeholder values for experiment count and last brewed
	return coffee.ToResponse(0, nil), nil
}

func (s *CoffeeService) List(ctx context.Context, userID uuid.UUID, input *ListCoffeesInput) (*CoffeeListResponse, error) {
	params := repository.CoffeeListParams{
		UserID:   userID,
		Roaster:  input.Roaster,
		Country:  input.Country,
		Process:  input.Process,
		Search:   input.Search,
		SortBy:   input.SortBy,
		SortDir:  input.SortDir,
		Page:     input.Page,
		PageSize: input.PageSize,
	}

	result, err := s.coffeeRepo.List(ctx, params)
	if err != nil {
		return nil, err
	}

	responses := make([]*models.CoffeeResponse, len(result.Coffees))
	for i, coffee := range result.Coffees {
		// Placeholder values for experiment count and last brewed
		responses[i] = coffee.ToResponse(0, nil)
	}

	return &CoffeeListResponse{
		Coffees:    responses,
		TotalCount: result.TotalCount,
		Page:       result.Page,
		PageSize:   result.PageSize,
		TotalPages: result.TotalPages,
	}, nil
}

func (s *CoffeeService) Update(ctx context.Context, userID, coffeeID uuid.UUID, input *UpdateCoffeeInput) (*models.CoffeeResponse, error) {
	if err := s.validateInput(input.Roaster, input.Name, input.RoastLevel, input.RoastDate, input.PurchaseDate); err != nil {
		return nil, err
	}

	// Verify the coffee exists and belongs to the user
	existing, err := s.coffeeRepo.GetByID(ctx, userID, coffeeID)
	if err != nil {
		return nil, err
	}

	coffee := &models.Coffee{
		ID:           existing.ID,
		UserID:       userID,
		Roaster:      input.Roaster,
		Name:         input.Name,
		Country:      input.Country,
		Region:       input.Region,
		Process:      input.Process,
		RoastLevel:   input.RoastLevel,
		TastingNotes: input.TastingNotes,
		RoastDate:    input.RoastDate,
		PurchaseDate: input.PurchaseDate,
		Notes:        input.Notes,
	}

	updated, err := s.coffeeRepo.Update(ctx, coffee)
	if err != nil {
		return nil, err
	}

	return updated.ToResponse(0, nil), nil
}

func (s *CoffeeService) Delete(ctx context.Context, userID, coffeeID uuid.UUID, cascade bool) error {
	// Check if coffee has experiments
	hasExperiments, err := s.coffeeRepo.HasExperiments(ctx, coffeeID)
	if err != nil {
		return err
	}

	if hasExperiments && !cascade {
		return ErrCoffeeHasExperiments
	}

	return s.coffeeRepo.Delete(ctx, userID, coffeeID)
}

func (s *CoffeeService) GetSuggestions(ctx context.Context, userID uuid.UUID, field, query string) ([]string, error) {
	return s.coffeeRepo.GetDistinctValues(ctx, userID, field, query)
}
