package coffee_goal

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	GetByCoffeeID(ctx context.Context, userID, coffeeID uuid.UUID) (*CoffeeGoal, error)
	Upsert(ctx context.Context, userID, coffeeID uuid.UUID, input UpsertInput) (*CoffeeGoal, error)
	Delete(ctx context.Context, userID, coffeeID uuid.UUID) error
}
