package filter_paper

import (
	"time"

	"github.com/google/uuid"
)

type FilterPaper struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	Name      string     `json:"name"`
	Brand     *string    `json:"brand,omitempty"`
	Notes     *string    `json:"notes,omitempty"`
	DeletedAt *time.Time `json:"-"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type CreateFilterPaperInput struct {
	Name  string  `json:"name"`
	Brand *string `json:"brand,omitempty"`
	Notes *string `json:"notes,omitempty"`
}

type UpdateFilterPaperInput struct {
	Name  *string `json:"name,omitempty"`
	Brand *string `json:"brand,omitempty"`
	Notes *string `json:"notes,omitempty"`
}

type ListFilterPapersParams struct {
	Page    int
	PerPage int
	Sort    string
}

type ListFilterPapersResult struct {
	Items      []FilterPaper `json:"items"`
	Pagination Pagination    `json:"pagination"`
}

type Pagination struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

func (p *ListFilterPapersParams) SetDefaults() {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 {
		p.PerPage = 20
	}
	if p.PerPage > 100 {
		p.PerPage = 100
	}
	if p.Sort == "" {
		p.Sort = "-created_at"
	}
}
