package models

import (
	"time"

	"github.com/google/uuid"
)

type IssueTag struct {
	ID        uuid.UUID  `json:"id"`
	UserID    *uuid.UUID `json:"user_id,omitempty"`
	Name      string     `json:"name"`
	IsSystem  bool       `json:"is_system"`
	CreatedAt time.Time  `json:"created_at"`
}

type IssueTagResponse struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	IsSystem bool      `json:"is_system"`
}

func (t *IssueTag) ToResponse() *IssueTagResponse {
	return &IssueTagResponse{
		ID:       t.ID,
		Name:     t.Name,
		IsSystem: t.IsSystem,
	}
}

type CreateIssueTagInput struct {
	Name string `json:"name" validate:"required,min=2,max=100"`
}
