package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestParsePagination_Defaults(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	p := ParsePagination(req)

	if p.Page != 1 {
		t.Errorf("expected page 1, got %d", p.Page)
	}
	if p.PerPage != 20 {
		t.Errorf("expected per_page 20, got %d", p.PerPage)
	}
}

func TestParsePagination_CustomValues(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test?page=3&per_page=50", nil)
	p := ParsePagination(req)

	if p.Page != 3 {
		t.Errorf("expected page 3, got %d", p.Page)
	}
	if p.PerPage != 50 {
		t.Errorf("expected per_page 50, got %d", p.PerPage)
	}
}

func TestParsePagination_MaxPerPage(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test?per_page=200", nil)
	p := ParsePagination(req)

	if p.PerPage != 100 {
		t.Errorf("expected per_page capped at 100, got %d", p.PerPage)
	}
}

func TestParsePagination_InvalidValues(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test?page=abc&per_page=-5", nil)
	p := ParsePagination(req)

	if p.Page != 1 {
		t.Errorf("expected page 1 for invalid input, got %d", p.Page)
	}
	if p.PerPage != 20 {
		t.Errorf("expected per_page 20 for invalid input, got %d", p.PerPage)
	}
}

func TestParsePagination_ZeroPage(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test?page=0", nil)
	p := ParsePagination(req)

	if p.Page != 1 {
		t.Errorf("expected page 1 for zero input, got %d", p.Page)
	}
}

func TestPaginationParams_Offset(t *testing.T) {
	tests := []struct {
		page    int
		perPage int
		want    int
	}{
		{1, 20, 0},
		{2, 20, 20},
		{3, 10, 20},
		{1, 100, 0},
	}

	for _, tt := range tests {
		p := PaginationParams{Page: tt.page, PerPage: tt.perPage}
		got := p.Offset()
		if got != tt.want {
			t.Errorf("Offset() for page=%d, perPage=%d: got %d, want %d", tt.page, tt.perPage, got, tt.want)
		}
	}
}

func TestTotalPages(t *testing.T) {
	tests := []struct {
		total   int
		perPage int
		want    int
	}{
		{0, 20, 0},
		{1, 20, 1},
		{20, 20, 1},
		{21, 20, 2},
		{100, 20, 5},
		{101, 20, 6},
	}

	for _, tt := range tests {
		got := TotalPages(tt.total, tt.perPage)
		if got != tt.want {
			t.Errorf("TotalPages(%d, %d): got %d, want %d", tt.total, tt.perPage, got, tt.want)
		}
	}
}

func TestWriteJSON(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"status": "ok"}

	WriteJSON(w, http.StatusOK, data)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", ct)
	}

	var result map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if result["status"] != "ok" {
		t.Errorf("expected status ok, got %s", result["status"])
	}
}

func TestWriteJSON_ErrorStatus(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusNotFound, ErrorResponse{
		Error: ErrorBody{
			Code:    CodeNotFound,
			Message: "not found",
		},
	})

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}

	var result ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to unmarshal error response: %v", err)
	}
	if result.Error.Code != CodeNotFound {
		t.Errorf("expected error code NOT_FOUND, got %s", result.Error.Code)
	}
}
