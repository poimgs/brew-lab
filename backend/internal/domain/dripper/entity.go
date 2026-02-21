package dripper

import (
	"time"
)

type Dripper struct {
	ID        string     `json:"id"`
	UserID    string     `json:"-"`
	Name      string     `json:"name"`
	Brand     *string    `json:"brand"`
	Notes     *string    `json:"notes"`
	DeletedAt *time.Time `json:"-"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type CreateRequest struct {
	Name  string  `json:"name"`
	Brand *string `json:"brand"`
	Notes *string `json:"notes"`
}

type UpdateRequest struct {
	Name  string  `json:"name"`
	Brand *string `json:"brand"`
	Notes *string `json:"notes"`
}
