package home

import (
	"context"

	"github.com/google/uuid"
)

// Repository defines the interface for home data access
type Repository interface {
	GetRecentCoffees(ctx context.Context, userID uuid.UUID, limit int) ([]RecentCoffee, error)
}
