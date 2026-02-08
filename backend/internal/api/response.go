package api

import (
	"encoding/json"
	"net/http"
	"strconv"
)

type PaginatedResponse struct {
	Items      interface{}       `json:"items"`
	Pagination PaginationMeta    `json:"pagination"`
}

type PaginationMeta struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type PaginationParams struct {
	Page    int
	PerPage int
}

func ParsePagination(r *http.Request) PaginationParams {
	page := 1
	perPage := 20

	if v := r.URL.Query().Get("page"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			page = parsed
		}
	}

	if v := r.URL.Query().Get("per_page"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			if parsed > 100 {
				parsed = 100
			}
			perPage = parsed
		}
	}

	return PaginationParams{Page: page, PerPage: perPage}
}

func (p PaginationParams) Offset() int {
	return (p.Page - 1) * p.PerPage
}

func TotalPages(total, perPage int) int {
	if total == 0 {
		return 0
	}
	pages := total / perPage
	if total%perPage > 0 {
		pages++
	}
	return pages
}

func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func DecodeJSON(r *http.Request, v interface{}) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(v)
}
