package mineral_profile

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// mockRepository implements Repository interface for testing
type mockRepository struct {
	profiles []MineralProfile
	listFunc func(ctx context.Context) (*ListMineralProfilesResult, error)
	getFunc  func(ctx context.Context, id uuid.UUID) (*MineralProfile, error)
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		profiles: []MineralProfile{},
	}
}

func (m *mockRepository) List(ctx context.Context) (*ListMineralProfilesResult, error) {
	if m.listFunc != nil {
		return m.listFunc(ctx)
	}
	return &ListMineralProfilesResult{
		Items: m.profiles,
	}, nil
}

func (m *mockRepository) GetByID(ctx context.Context, id uuid.UUID) (*MineralProfile, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, id)
	}
	for _, p := range m.profiles {
		if p.ID == id {
			return &p, nil
		}
	}
	return nil, ErrMineralProfileNotFound
}

func TestHandler_List(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	catalystID := uuid.New()
	affinityID := uuid.New()

	// Add test profiles
	repo.profiles = []MineralProfile{
		{
			ID:           catalystID,
			Name:         "Catalyst",
			Brand:        strPtr("Valence Coffee Studio"),
			Hardness:     float64Ptr(70.9),
			Alkalinity:   float64Ptr(15.0),
			Magnesium:    float64Ptr(12.2),
			Calcium:      float64Ptr(8.2),
			Potassium:    float64Ptr(14.3),
			Sodium:       float64Ptr(3.9),
			Chloride:     float64Ptr(58.7),
			Bicarbonate:  float64Ptr(18.3),
			TypicalDose:  strPtr("2 drops per cup"),
			TasteEffects: strPtr("Increased body, enhanced sweetness"),
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           affinityID,
			Name:         "Affinity",
			Brand:        strPtr("Valence Coffee Studio"),
			Hardness:     float64Ptr(50.45),
			Alkalinity:   float64Ptr(12.18),
			Magnesium:    float64Ptr(12.25),
			Sodium:       float64Ptr(16.51),
			Chloride:     float64Ptr(46.55),
			Sulfate:      float64Ptr(8.15),
			Bicarbonate:  float64Ptr(14.86),
			TypicalDose:  strPtr("2 drops per cup"),
			TasteEffects: strPtr("Clarity, balanced acidity"),
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	req := httptest.NewRequest("GET", "/mineral-profiles", nil)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var result ListMineralProfilesResult
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if len(result.Items) != 2 {
		t.Errorf("expected 2 items, got %d", len(result.Items))
	}
}

func TestHandler_List_Empty(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	req := httptest.NewRequest("GET", "/mineral-profiles", nil)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var result ListMineralProfilesResult
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if len(result.Items) != 0 {
		t.Errorf("expected 0 items, got %d", len(result.Items))
	}
}

func TestHandler_Get(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	profileID := uuid.New()

	repo.profiles = []MineralProfile{
		{
			ID:           profileID,
			Name:         "Catalyst",
			Brand:        strPtr("Valence Coffee Studio"),
			Hardness:     float64Ptr(70.9),
			TypicalDose:  strPtr("2 drops per cup"),
			TasteEffects: strPtr("Increased body, enhanced sweetness"),
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	tests := []struct {
		name           string
		profileID      string
		expectedStatus int
	}{
		{
			name:           "existing profile",
			profileID:      profileID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "non-existent profile",
			profileID:      uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid uuid",
			profileID:      "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/mineral-profiles/"+tt.profileID, nil)
			rr := httptest.NewRecorder()

			r := chi.NewRouter()
			r.Get("/mineral-profiles/{id}", handler.Get)
			r.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandler_Get_ReturnsAllFields(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	profileID := uuid.New()
	now := time.Now()

	repo.profiles = []MineralProfile{
		{
			ID:           profileID,
			Name:         "Catalyst",
			Brand:        strPtr("Valence Coffee Studio"),
			Hardness:     float64Ptr(70.9),
			Alkalinity:   float64Ptr(15.0),
			Magnesium:    float64Ptr(12.2),
			Calcium:      float64Ptr(8.2),
			Potassium:    float64Ptr(14.3),
			Sodium:       float64Ptr(3.9),
			Chloride:     float64Ptr(58.7),
			Bicarbonate:  float64Ptr(18.3),
			TypicalDose:  strPtr("2 drops per cup"),
			TasteEffects: strPtr("Increased body, enhanced sweetness"),
			CreatedAt:    now,
			UpdatedAt:    now,
		},
	}

	req := httptest.NewRequest("GET", "/mineral-profiles/"+profileID.String(), nil)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/mineral-profiles/{id}", handler.Get)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	var profile MineralProfile
	if err := json.NewDecoder(rr.Body).Decode(&profile); err != nil {
		t.Fatal(err)
	}

	// Verify all fields are returned correctly
	if profile.Name != "Catalyst" {
		t.Errorf("expected Name 'Catalyst', got '%s'", profile.Name)
	}
	if profile.Brand == nil || *profile.Brand != "Valence Coffee Studio" {
		t.Errorf("expected Brand 'Valence Coffee Studio', got '%v'", profile.Brand)
	}
	if profile.Hardness == nil || *profile.Hardness != 70.9 {
		t.Errorf("expected Hardness 70.9, got '%v'", profile.Hardness)
	}
	if profile.Alkalinity == nil || *profile.Alkalinity != 15.0 {
		t.Errorf("expected Alkalinity 15.0, got '%v'", profile.Alkalinity)
	}
	if profile.Magnesium == nil || *profile.Magnesium != 12.2 {
		t.Errorf("expected Magnesium 12.2, got '%v'", profile.Magnesium)
	}
	if profile.Calcium == nil || *profile.Calcium != 8.2 {
		t.Errorf("expected Calcium 8.2, got '%v'", profile.Calcium)
	}
	if profile.Potassium == nil || *profile.Potassium != 14.3 {
		t.Errorf("expected Potassium 14.3, got '%v'", profile.Potassium)
	}
	if profile.Sodium == nil || *profile.Sodium != 3.9 {
		t.Errorf("expected Sodium 3.9, got '%v'", profile.Sodium)
	}
	if profile.Chloride == nil || *profile.Chloride != 58.7 {
		t.Errorf("expected Chloride 58.7, got '%v'", profile.Chloride)
	}
	if profile.Bicarbonate == nil || *profile.Bicarbonate != 18.3 {
		t.Errorf("expected Bicarbonate 18.3, got '%v'", profile.Bicarbonate)
	}
	if profile.TypicalDose == nil || *profile.TypicalDose != "2 drops per cup" {
		t.Errorf("expected TypicalDose '2 drops per cup', got '%v'", profile.TypicalDose)
	}
	if profile.TasteEffects == nil || *profile.TasteEffects != "Increased body, enhanced sweetness" {
		t.Errorf("expected TasteEffects 'Increased body, enhanced sweetness', got '%v'", profile.TasteEffects)
	}
}

func TestHandler_Get_NullableFields(t *testing.T) {
	repo := newMockRepository()
	handler := NewHandler(repo)

	profileID := uuid.New()

	// Profile with some null fields (like Affinity which has no Calcium or Potassium)
	repo.profiles = []MineralProfile{
		{
			ID:           profileID,
			Name:         "Affinity",
			Brand:        strPtr("Valence Coffee Studio"),
			Hardness:     float64Ptr(50.45),
			Magnesium:    float64Ptr(12.25),
			Sodium:       float64Ptr(16.51),
			Chloride:     float64Ptr(46.55),
			Sulfate:      float64Ptr(8.15),
			Bicarbonate:  float64Ptr(14.86),
			Calcium:      nil, // Explicitly null
			Potassium:    nil, // Explicitly null
			TypicalDose:  strPtr("2 drops per cup"),
			TasteEffects: strPtr("Clarity, balanced acidity"),
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	req := httptest.NewRequest("GET", "/mineral-profiles/"+profileID.String(), nil)
	rr := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/mineral-profiles/{id}", handler.Get)
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	var profile MineralProfile
	if err := json.NewDecoder(rr.Body).Decode(&profile); err != nil {
		t.Fatal(err)
	}

	// Verify null fields are handled correctly
	if profile.Calcium != nil {
		t.Errorf("expected Calcium to be nil, got '%v'", profile.Calcium)
	}
	if profile.Potassium != nil {
		t.Errorf("expected Potassium to be nil, got '%v'", profile.Potassium)
	}
	if profile.Sulfate == nil || *profile.Sulfate != 8.15 {
		t.Errorf("expected Sulfate 8.15, got '%v'", profile.Sulfate)
	}
}

// Helper functions
func strPtr(s string) *string {
	return &s
}

func float64Ptr(f float64) *float64 {
	return &f
}
