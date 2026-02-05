package coffee

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	Create(ctx context.Context, userID uuid.UUID, input CreateCoffeeInput) (*Coffee, error)
	GetByID(ctx context.Context, userID, coffeeID uuid.UUID) (*Coffee, error)
	List(ctx context.Context, userID uuid.UUID, params ListCoffeesParams) (*ListCoffeesResult, error)
	Update(ctx context.Context, userID, coffeeID uuid.UUID, input UpdateCoffeeInput) (*Coffee, error)
	Delete(ctx context.Context, userID, coffeeID uuid.UUID) error
	Archive(ctx context.Context, userID, coffeeID uuid.UUID) (*Coffee, error)
	Unarchive(ctx context.Context, userID, coffeeID uuid.UUID) (*Coffee, error)
	GetSuggestions(ctx context.Context, userID uuid.UUID, field, query string) ([]string, error)
	SetBestExperiment(ctx context.Context, userID, coffeeID uuid.UUID, experimentID *uuid.UUID) (*Coffee, error)
	GetReference(ctx context.Context, userID, coffeeID uuid.UUID) (*CoffeeReference, error)
}
