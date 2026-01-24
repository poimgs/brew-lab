package models

import (
	"time"

	"github.com/google/uuid"
)

type FilterPaper struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	Brand     *string   `json:"brand,omitempty"`
	Notes     *string   `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type FilterPaperResponse struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Brand     *string   `json:"brand,omitempty"`
	Notes     *string   `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (f *FilterPaper) ToResponse() *FilterPaperResponse {
	return &FilterPaperResponse{
		ID:        f.ID,
		Name:      f.Name,
		Brand:     f.Brand,
		Notes:     f.Notes,
		CreatedAt: f.CreatedAt,
		UpdatedAt: f.UpdatedAt,
	}
}

type CreateFilterPaperInput struct {
	Name  string  `json:"name" validate:"required,min=1,max=100"`
	Brand *string `json:"brand" validate:"omitempty,max=100"`
	Notes *string `json:"notes" validate:"omitempty,max=1000"`
}

type UpdateFilterPaperInput struct {
	Name  *string `json:"name" validate:"omitempty,min=1,max=100"`
	Brand *string `json:"brand" validate:"omitempty,max=100"`
	Notes *string `json:"notes" validate:"omitempty,max=1000"`
}

type FilterPaperListResponse struct {
	FilterPapers []FilterPaperResponse `json:"filter_papers"`
	Total        int                   `json:"total"`
}
