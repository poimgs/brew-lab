package home

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"coffee-tracker/internal/auth"

	"github.com/google/uuid"
)

// mockRepository implements Repository for testing
type mockRepository struct {
	coffees []RecentCoffee
	err     error
}

func (m *mockRepository) GetRecentCoffees(ctx context.Context, userID uuid.UUID, limit int) ([]RecentCoffee, error) {
	if m.err != nil {
		return nil, m.err
	}
	if len(m.coffees) > limit {
		return m.coffees[:limit], nil
	}
	return m.coffees, nil
}

func TestHandler_Get(t *testing.T) {
	t.Run("returns empty array when no coffees", func(t *testing.T) {
		repo := &mockRepository{coffees: []RecentCoffee{}}
		handler := NewHandler(repo)
		userID := uuid.New()

		req := httptest.NewRequest("GET", "/api/v1/home", nil)
		ctx := auth.SetUserID(req.Context(), userID)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.Get(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
		}

		var resp HomeResponse
		if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if len(resp.RecentCoffees) != 0 {
			t.Errorf("expected 0 coffees, got %d", len(resp.RecentCoffees))
		}
	})

	t.Run("returns recent coffees with best experiments", func(t *testing.T) {
		coffeeID := uuid.New()
		expID := uuid.New()
		brewDate := time.Now()
		score := 8
		ratio := 15.0
		temp := 96.0
		bloomTime := 30
		filterPaperName := "Abaca"
		improvementNote := "Try finer grind to boost sweetness"

		repo := &mockRepository{
			coffees: []RecentCoffee{
				{
					ID:           coffeeID,
					Name:         "Kiamaina",
					Roaster:      "Cata Coffee",
					LastBrewedAt: brewDate,
					BestExperiment: &BestExperiment{
						ID:               expID,
						BrewDate:         brewDate,
						OverallScore:     &score,
						Ratio:            &ratio,
						WaterTemperature: &temp,
						BloomTime:        &bloomTime,
						FilterPaperName:  &filterPaperName,
						PourCount:        2,
						PourStyles:       []string{"circular", "center"},
					},
					ImprovementNote: &improvementNote,
				},
			},
		}
		handler := NewHandler(repo)
		userID := uuid.New()

		req := httptest.NewRequest("GET", "/api/v1/home", nil)
		ctx := auth.SetUserID(req.Context(), userID)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.Get(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
		}

		var resp HomeResponse
		if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if len(resp.RecentCoffees) != 1 {
			t.Fatalf("expected 1 coffee, got %d", len(resp.RecentCoffees))
		}

		coffee := resp.RecentCoffees[0]
		if coffee.ID != coffeeID {
			t.Errorf("expected coffee ID %s, got %s", coffeeID, coffee.ID)
		}
		if coffee.Name != "Kiamaina" {
			t.Errorf("expected name 'Kiamaina', got '%s'", coffee.Name)
		}
		if coffee.Roaster != "Cata Coffee" {
			t.Errorf("expected roaster 'Cata Coffee', got '%s'", coffee.Roaster)
		}

		if coffee.BestExperiment == nil {
			t.Fatal("expected best experiment to be present")
		}
		if coffee.BestExperiment.ID != expID {
			t.Errorf("expected experiment ID %s, got %s", expID, coffee.BestExperiment.ID)
		}
		if coffee.BestExperiment.OverallScore == nil || *coffee.BestExperiment.OverallScore != 8 {
			t.Errorf("expected score 8, got %v", coffee.BestExperiment.OverallScore)
		}
		if coffee.BestExperiment.PourCount != 2 {
			t.Errorf("expected 2 pours, got %d", coffee.BestExperiment.PourCount)
		}
		if len(coffee.BestExperiment.PourStyles) != 2 {
			t.Errorf("expected 2 pour styles, got %d", len(coffee.BestExperiment.PourStyles))
		}
		if coffee.ImprovementNote == nil || *coffee.ImprovementNote != "Try finer grind to boost sweetness" {
			t.Errorf("expected improvement note, got %v", coffee.ImprovementNote)
		}
	})

	t.Run("respects limit parameter", func(t *testing.T) {
		coffees := make([]RecentCoffee, 10)
		for i := range coffees {
			coffees[i] = RecentCoffee{
				ID:           uuid.New(),
				Name:         "Coffee",
				Roaster:      "Roaster",
				LastBrewedAt: time.Now(),
			}
		}

		repo := &mockRepository{coffees: coffees}
		handler := NewHandler(repo)
		userID := uuid.New()

		req := httptest.NewRequest("GET", "/api/v1/home?limit=5", nil)
		ctx := auth.SetUserID(req.Context(), userID)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.Get(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
		}

		var resp HomeResponse
		if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if len(resp.RecentCoffees) != 5 {
			t.Errorf("expected 5 coffees, got %d", len(resp.RecentCoffees))
		}
	})

	t.Run("caps limit at 20", func(t *testing.T) {
		coffees := make([]RecentCoffee, 25)
		for i := range coffees {
			coffees[i] = RecentCoffee{
				ID:           uuid.New(),
				Name:         "Coffee",
				Roaster:      "Roaster",
				LastBrewedAt: time.Now(),
			}
		}

		repo := &mockRepository{coffees: coffees}
		handler := NewHandler(repo)
		userID := uuid.New()

		req := httptest.NewRequest("GET", "/api/v1/home?limit=100", nil)
		ctx := auth.SetUserID(req.Context(), userID)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.Get(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
		}

		var resp HomeResponse
		if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if len(resp.RecentCoffees) != 20 {
			t.Errorf("expected 20 coffees (capped), got %d", len(resp.RecentCoffees))
		}
	})

	t.Run("requires authentication", func(t *testing.T) {
		repo := &mockRepository{}
		handler := NewHandler(repo)

		req := httptest.NewRequest("GET", "/api/v1/home", nil)
		rr := httptest.NewRecorder()

		handler.Get(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
		}
	})

	t.Run("returns error on repository failure", func(t *testing.T) {
		repo := &mockRepository{err: errors.New("database error")}
		handler := NewHandler(repo)
		userID := uuid.New()

		req := httptest.NewRequest("GET", "/api/v1/home", nil)
		ctx := auth.SetUserID(req.Context(), userID)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.Get(rr, req)

		if rr.Code != http.StatusInternalServerError {
			t.Errorf("expected status %d, got %d", http.StatusInternalServerError, rr.Code)
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

func TestDeduplicatePourStyles(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected []string
	}{
		{
			name:     "no duplicates",
			input:    []string{"circular", "center"},
			expected: []string{"circular", "center"},
		},
		{
			name:     "with duplicates",
			input:    []string{"circular", "center", "circular"},
			expected: []string{"circular", "center"},
		},
		{
			name:     "case insensitive dedup",
			input:    []string{"Circular", "circular", "CENTER"},
			expected: []string{"Circular", "CENTER"},
		},
		{
			name:     "empty slice",
			input:    []string{},
			expected: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := deduplicatePourStyles(tt.input)
			if len(result) != len(tt.expected) {
				t.Errorf("expected length %d, got %d", len(tt.expected), len(result))
				return
			}
			for i, v := range result {
				if v != tt.expected[i] {
					t.Errorf("at index %d: expected '%s', got '%s'", i, tt.expected[i], v)
				}
			}
		})
	}
}
