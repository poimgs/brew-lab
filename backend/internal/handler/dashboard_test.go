package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"coffee-tracker/internal/auth"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
)

func TestDashboardHandler_GetDashboard(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create mock db: %v", err)
	}
	defer db.Close()

	handler := NewDashboardHandler(db)
	userID := uuid.New()

	t.Run("returns empty array when no experiments", func(t *testing.T) {
		rows := sqlmock.NewRows([]string{"id", "brew_date", "coffee_name", "overall_score", "overall_notes"})
		mock.ExpectQuery("SELECT").WithArgs(userID, 10).WillReturnRows(rows)

		req := httptest.NewRequest("GET", "/api/v1/dashboard", nil)
		ctx := auth.SetUserID(req.Context(), userID)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.GetDashboard(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
		}

		var resp DashboardResponse
		if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if len(resp.RecentExperiments) != 0 {
			t.Errorf("expected 0 experiments, got %d", len(resp.RecentExperiments))
		}
	})

	t.Run("returns recent experiments", func(t *testing.T) {
		expID := uuid.New()
		brewDate := time.Now()
		rows := sqlmock.NewRows([]string{"id", "brew_date", "coffee_name", "overall_score", "overall_notes"}).
			AddRow(expID, brewDate, "Kenya AA", 8, "Bright and fruity with citrus notes")

		mock.ExpectQuery("SELECT").WithArgs(userID, 10).WillReturnRows(rows)

		req := httptest.NewRequest("GET", "/api/v1/dashboard", nil)
		ctx := auth.SetUserID(req.Context(), userID)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.GetDashboard(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
		}

		var resp DashboardResponse
		if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if len(resp.RecentExperiments) != 1 {
			t.Errorf("expected 1 experiment, got %d", len(resp.RecentExperiments))
		}

		exp := resp.RecentExperiments[0]
		if exp.ID != expID {
			t.Errorf("expected ID %s, got %s", expID, exp.ID)
		}
		if exp.CoffeeName != "Kenya AA" {
			t.Errorf("expected coffee name 'Kenya AA', got '%s'", exp.CoffeeName)
		}
		if exp.OverallScore == nil || *exp.OverallScore != 8 {
			t.Errorf("expected score 8, got %v", exp.OverallScore)
		}
		if exp.RelativeDate != "today" {
			t.Errorf("expected relative_date 'today', got '%s'", exp.RelativeDate)
		}
	})

	t.Run("respects limit parameter", func(t *testing.T) {
		rows := sqlmock.NewRows([]string{"id", "brew_date", "coffee_name", "overall_score", "overall_notes"})
		mock.ExpectQuery("SELECT").WithArgs(userID, 5).WillReturnRows(rows)

		req := httptest.NewRequest("GET", "/api/v1/dashboard?limit=5", nil)
		ctx := auth.SetUserID(req.Context(), userID)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.GetDashboard(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	})

	t.Run("caps limit at 20", func(t *testing.T) {
		rows := sqlmock.NewRows([]string{"id", "brew_date", "coffee_name", "overall_score", "overall_notes"})
		mock.ExpectQuery("SELECT").WithArgs(userID, 20).WillReturnRows(rows)

		req := httptest.NewRequest("GET", "/api/v1/dashboard?limit=100", nil)
		ctx := auth.SetUserID(req.Context(), userID)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.GetDashboard(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	})

	t.Run("requires authentication", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/dashboard", nil)
		rr := httptest.NewRecorder()

		handler.GetDashboard(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
		}
	})
}

func TestTruncateNotes(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		maxLen   int
		expected string
	}{
		{
			name:     "short text unchanged",
			input:    "Short note",
			maxLen:   100,
			expected: "Short note",
		},
		{
			name:     "long text truncated at word boundary",
			input:    "This is a long note that needs to be truncated at a reasonable word boundary",
			maxLen:   30,
			expected: "This is a long note that...",
		},
		{
			name:     "empty string",
			input:    "",
			maxLen:   100,
			expected: "",
		},
		{
			name:     "exact length",
			input:    "Exact",
			maxLen:   5,
			expected: "Exact",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := truncateNotes(tt.input, tt.maxLen)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestCalculateRelativeDate(t *testing.T) {
	now := time.Date(2024, 1, 15, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		brewDate time.Time
		expected string
	}{
		{
			name:     "today",
			brewDate: time.Date(2024, 1, 15, 8, 0, 0, 0, time.UTC),
			expected: "today",
		},
		{
			name:     "yesterday",
			brewDate: time.Date(2024, 1, 14, 12, 0, 0, 0, time.UTC),
			expected: "yesterday",
		},
		{
			name:     "this week (3 days ago)",
			brewDate: time.Date(2024, 1, 12, 12, 0, 0, 0, time.UTC),
			expected: "this_week",
		},
		{
			name:     "this week (7 days ago)",
			brewDate: time.Date(2024, 1, 8, 12, 0, 0, 0, time.UTC),
			expected: "this_week",
		},
		{
			name:     "earlier (8 days ago)",
			brewDate: time.Date(2024, 1, 7, 12, 0, 0, 0, time.UTC),
			expected: "earlier",
		},
		{
			name:     "earlier (month ago)",
			brewDate: time.Date(2023, 12, 15, 12, 0, 0, 0, time.UTC),
			expected: "earlier",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateRelativeDate(tt.brewDate, now)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}
