package defaults

import (
	"context"
)

// Repository defines the interface for user defaults persistence.
type Repository interface {
	// Get returns all defaults for the given user.
	Get(ctx context.Context, userID string) (*DefaultsResponse, error)

	// Put replaces all defaults for the given user.
	// Key-value defaults are deleted and re-inserted.
	// Pour defaults are deleted and re-inserted.
	Put(ctx context.Context, userID string, req UpdateRequest) (*DefaultsResponse, error)

	// DeleteField removes a single default by field name.
	DeleteField(ctx context.Context, userID, fieldName string) error
}
