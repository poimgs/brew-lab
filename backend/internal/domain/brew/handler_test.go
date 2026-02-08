package brew

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"

	"github.com/poimgs/coffee-tracker/backend/internal/api"
	"github.com/poimgs/coffee-tracker/backend/internal/middleware"
)

const testSecret = "test-jwt-secret-key"

// --- Mock Repository ---

type mockRepo struct {
	brews    map[string]*Brew
	coffees  map[string]*mockCoffee
	nextID   int
	pourData map[string][]Pour
}

type mockCoffee struct {
	ID             string
	UserID         string
	Name           string
	Roaster        string
	RoastDate      *string
	ReferenceBrewID *string
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		brews:    make(map[string]*Brew),
		coffees:  make(map[string]*mockCoffee),
		nextID:   1,
		pourData: make(map[string][]Pour),
	}
}

func (m *mockRepo) addCoffee(id, userID, name, roaster string, roastDate *string) {
	m.coffees[id] = &mockCoffee{
		ID:        id,
		UserID:    userID,
		Name:      name,
		Roaster:   roaster,
		RoastDate: roastDate,
	}
}

func (m *mockRepo) List(_ context.Context, userID string, params ListParams) ([]Brew, int, error) {
	var result []Brew
	for _, b := range m.brews {
		if b.UserID != userID {
			continue
		}
		if params.CoffeeID != "" && b.CoffeeID != params.CoffeeID {
			continue
		}
		if params.ScoreGTE != nil && (b.OverallScore == nil || *b.OverallScore < *params.ScoreGTE) {
			continue
		}
		if params.ScoreLTE != nil && (b.OverallScore == nil || *b.OverallScore > *params.ScoreLTE) {
			continue
		}
		if params.HasTDS != nil && *params.HasTDS && b.TDS == nil {
			continue
		}
		result = append(result, *b)
	}

	// Sort by brew_date desc by default
	sort.Slice(result, func(i, j int) bool {
		return result[i].BrewDate > result[j].BrewDate
	})

	total := len(result)
	offset := (params.Page - 1) * params.PerPage
	if offset >= len(result) {
		return []Brew{}, total, nil
	}
	end := offset + params.PerPage
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], total, nil
}

func (m *mockRepo) Recent(_ context.Context, userID string, limit int) ([]Brew, error) {
	var result []Brew
	for _, b := range m.brews {
		if b.UserID != userID {
			continue
		}
		result = append(result, *b)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].BrewDate > result[j].BrewDate
	})

	if len(result) > limit {
		result = result[:limit]
	}
	if result == nil {
		result = []Brew{}
	}
	return result, nil
}

func (m *mockRepo) GetByID(_ context.Context, userID, id string) (*Brew, error) {
	b := m.brews[id]
	if b == nil || b.UserID != userID {
		return nil, nil
	}
	return b, nil
}

func (m *mockRepo) Create(_ context.Context, userID string, req CreateRequest) (*Brew, error) {
	c := m.coffees[req.CoffeeID]
	if c == nil || c.UserID != userID {
		return nil, fmt.Errorf("coffee not found")
	}

	m.nextID++
	id := fmt.Sprintf("brew-%d", m.nextID)
	now := time.Now()

	brewDate := now.Format("2006-01-02")
	if req.BrewDate != nil {
		brewDate = *req.BrewDate
	}

	var daysOffRoast *int
	if c.RoastDate != nil {
		// Simplified: just set a fixed value for tests
		days := 14
		daysOffRoast = &days
	}

	b := &Brew{
		ID:                  id,
		UserID:              userID,
		CoffeeID:            req.CoffeeID,
		CoffeeName:          c.Name,
		CoffeeRoaster:       c.Roaster,
		BrewDate:            brewDate,
		DaysOffRoast:        daysOffRoast,
		CoffeeWeight:        req.CoffeeWeight,
		Ratio:               req.Ratio,
		GrindSize:           req.GrindSize,
		WaterTemperature:    req.WaterTemperature,
		TotalBrewTime:       req.TotalBrewTime,
		TechniqueNotes:      req.TechniqueNotes,
		CoffeeMl:            req.CoffeeMl,
		TDS:                 req.TDS,
		AromaIntensity:      req.AromaIntensity,
		BodyIntensity:       req.BodyIntensity,
		SweetnessIntensity:  req.SweetnessIntensity,
		BrightnessIntensity: req.BrightnessIntensity,
		ComplexityIntensity: req.ComplexityIntensity,
		AftertasteIntensity: req.AftertasteIntensity,
		OverallScore:        req.OverallScore,
		OverallNotes:        req.OverallNotes,
		ImprovementNotes:    req.ImprovementNotes,
		Pours:               []Pour{},
		CreatedAt:           now,
		UpdatedAt:           now,
	}

	b.WaterWeight = ComputeWaterWeight(b.CoffeeWeight, b.Ratio)
	b.ExtractionYield = ComputeExtractionYield(b.CoffeeMl, b.TDS, b.CoffeeWeight)

	for _, p := range req.Pours {
		b.Pours = append(b.Pours, Pour{
			PourNumber:  p.PourNumber,
			WaterAmount: p.WaterAmount,
			PourStyle:   p.PourStyle,
			WaitTime:    p.WaitTime,
		})
	}

	if req.FilterPaperID != nil {
		b.FilterPaper = &FilterPaper{ID: *req.FilterPaperID, Name: "Test Filter"}
	}

	m.brews[id] = b
	return b, nil
}

func (m *mockRepo) Update(_ context.Context, userID, id string, req UpdateRequest) (*Brew, error) {
	b := m.brews[id]
	if b == nil || b.UserID != userID {
		return nil, nil
	}

	brewDate := b.BrewDate
	if req.BrewDate != nil {
		brewDate = *req.BrewDate
	}

	b.CoffeeID = req.CoffeeID
	b.BrewDate = brewDate
	b.CoffeeWeight = req.CoffeeWeight
	b.Ratio = req.Ratio
	b.GrindSize = req.GrindSize
	b.WaterTemperature = req.WaterTemperature
	b.TotalBrewTime = req.TotalBrewTime
	b.TechniqueNotes = req.TechniqueNotes
	b.CoffeeMl = req.CoffeeMl
	b.TDS = req.TDS
	b.AromaIntensity = req.AromaIntensity
	b.BodyIntensity = req.BodyIntensity
	b.SweetnessIntensity = req.SweetnessIntensity
	b.BrightnessIntensity = req.BrightnessIntensity
	b.ComplexityIntensity = req.ComplexityIntensity
	b.AftertasteIntensity = req.AftertasteIntensity
	b.OverallScore = req.OverallScore
	b.OverallNotes = req.OverallNotes
	b.ImprovementNotes = req.ImprovementNotes
	b.UpdatedAt = time.Now()

	b.WaterWeight = ComputeWaterWeight(b.CoffeeWeight, b.Ratio)
	b.ExtractionYield = ComputeExtractionYield(b.CoffeeMl, b.TDS, b.CoffeeWeight)

	b.Pours = []Pour{}
	for _, p := range req.Pours {
		b.Pours = append(b.Pours, Pour{
			PourNumber:  p.PourNumber,
			WaterAmount: p.WaterAmount,
			PourStyle:   p.PourStyle,
			WaitTime:    p.WaitTime,
		})
	}

	if req.FilterPaperID != nil {
		b.FilterPaper = &FilterPaper{ID: *req.FilterPaperID, Name: "Test Filter"}
	} else {
		b.FilterPaper = nil
	}

	return b, nil
}

func (m *mockRepo) Delete(_ context.Context, userID, id string) error {
	b := m.brews[id]
	if b == nil || b.UserID != userID {
		return pgx.ErrNoRows
	}
	delete(m.brews, id)
	return nil
}

func (m *mockRepo) GetReference(_ context.Context, userID, coffeeID string) (*Brew, string, error) {
	c := m.coffees[coffeeID]
	if c == nil || c.UserID != userID {
		return nil, "", fmt.Errorf("coffee not found")
	}

	// Check starred reference
	if c.ReferenceBrewID != nil {
		if b := m.brews[*c.ReferenceBrewID]; b != nil {
			return b, "starred", nil
		}
	}

	// Fall back to latest
	var latest *Brew
	for _, b := range m.brews {
		if b.CoffeeID != coffeeID || b.UserID != userID {
			continue
		}
		if latest == nil || b.BrewDate > latest.BrewDate {
			latest = b
		}
	}
	if latest != nil {
		return latest, "latest", nil
	}

	return nil, "", nil
}

// Error-returning mock

type errorRepo struct{}

func (e *errorRepo) List(_ context.Context, _ string, _ ListParams) ([]Brew, int, error) {
	return nil, 0, errors.New("database error")
}
func (e *errorRepo) Recent(_ context.Context, _ string, _ int) ([]Brew, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) GetByID(_ context.Context, _, _ string) (*Brew, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Create(_ context.Context, _ string, _ CreateRequest) (*Brew, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Update(_ context.Context, _, _ string, _ UpdateRequest) (*Brew, error) {
	return nil, errors.New("database error")
}
func (e *errorRepo) Delete(_ context.Context, _, _ string) error {
	return errors.New("database error")
}
func (e *errorRepo) GetReference(_ context.Context, _, _ string) (*Brew, string, error) {
	return nil, "", errors.New("database error")
}

// --- Helpers ---

func generateTestAccessToken(userID string) string {
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": "test@example.com",
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, _ := token.SignedString([]byte(testSecret))
	return s
}

func setupRouter(h *Handler) *chi.Mux {
	r := chi.NewRouter()
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.RequireAuth(testSecret))

		r.Route("/brews", func(r chi.Router) {
			r.Get("/", h.List)
			r.Get("/recent", h.Recent)
			r.Post("/", h.Create)
			r.Get("/{id}", h.GetByID)
			r.Put("/{id}", h.Update)
			r.Delete("/{id}", h.Delete)
		})

		r.Route("/coffees", func(r chi.Router) {
			r.Get("/{id}/brews", h.ListByCoffee)
			r.Get("/{id}/reference", h.GetReference)
		})
	})
	return r
}

func authRequest(method, url string, body string) *http.Request {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, url, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, url, nil)
	}
	req.Header.Set("Authorization", "Bearer "+generateTestAccessToken("user-123"))
	return req
}

func seedBrew(repo *mockRepo, id, userID, coffeeID, brewDate string, score *int) *Brew {
	now := time.Now()
	b := &Brew{
		ID:            id,
		UserID:        userID,
		CoffeeID:      coffeeID,
		CoffeeName:    "Test Coffee",
		CoffeeRoaster: "Test Roaster",
		BrewDate:      brewDate,
		OverallScore:  score,
		Pours:         []Pour{},
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	repo.brews[id] = b
	return b
}

func intPtr(n int) *int       { return &n }
func floatPtr(f float64) *float64 { return &f }
func strPtr(s string) *string { return &s }

// --- List Tests ---

func TestList_Success(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", intPtr(8))
	seedBrew(repo, "b-2", "user-123", "c-1", "2026-01-16", intPtr(7))
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 2 {
		t.Errorf("expected 2 items, got %d", len(items))
	}
	if resp.Pagination.Total != 2 {
		t.Errorf("expected total 2, got %d", resp.Pagination.Total)
	}
}

func TestList_EmptyResult(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 0 {
		t.Errorf("expected 0 items, got %d", len(items))
	}
}

func TestList_ExcludesOtherUsers(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Mine", "Roaster", nil)
	repo.addCoffee("c-2", "user-456", "Theirs", "Roaster", nil)
	seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", nil)
	seedBrew(repo, "b-2", "user-456", "c-2", "2026-01-15", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 1 {
		t.Errorf("expected 1 item (own user only), got %d", len(items))
	}
}

func TestList_ScoreFilter(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", intPtr(5))
	seedBrew(repo, "b-2", "user-123", "c-1", "2026-01-16", intPtr(8))
	seedBrew(repo, "b-3", "user-123", "c-1", "2026-01-17", intPtr(3))
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews?score_gte=5&score_lte=8", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 2 {
		t.Errorf("expected 2 items with score 5-8, got %d", len(items))
	}
}

func TestList_Pagination(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	for i := 0; i < 5; i++ {
		seedBrew(repo, fmt.Sprintf("b-%d", i), "user-123", "c-1", fmt.Sprintf("2026-01-%02d", i+1), nil)
	}
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews?page=1&per_page=2", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 2 {
		t.Errorf("expected 2 items per page, got %d", len(items))
	}
	if resp.Pagination.Total != 5 {
		t.Errorf("expected total 5, got %d", resp.Pagination.Total)
	}
	if resp.Pagination.TotalPages != 3 {
		t.Errorf("expected 3 total pages, got %d", resp.Pagination.TotalPages)
	}
}

func TestList_Unauthenticated(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/brews", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestList_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

// --- ListByCoffee Tests ---

func TestListByCoffee_Success(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	repo.addCoffee("c-2", "user-123", "Other", "Roaster", nil)
	seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", nil)
	seedBrew(repo, "b-2", "user-123", "c-1", "2026-01-16", nil)
	seedBrew(repo, "b-3", "user-123", "c-2", "2026-01-17", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1/brews", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp api.PaginatedResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	items := resp.Items.([]interface{})
	if len(items) != 2 {
		t.Errorf("expected 2 brews for c-1, got %d", len(items))
	}
}

// --- Recent Tests ---

func TestRecent_DefaultLimit(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	for i := 0; i < 10; i++ {
		seedBrew(repo, fmt.Sprintf("b-%d", i), "user-123", "c-1", fmt.Sprintf("2026-01-%02d", i+1), nil)
	}
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/recent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Items []json.RawMessage `json:"items"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Items) != 5 {
		t.Errorf("expected 5 recent brews (default limit), got %d", len(resp.Items))
	}
}

func TestRecent_CustomLimit(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	for i := 0; i < 10; i++ {
		seedBrew(repo, fmt.Sprintf("b-%d", i), "user-123", "c-1", fmt.Sprintf("2026-01-%02d", i+1), nil)
	}
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/recent?limit=3", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Items []json.RawMessage `json:"items"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Items) != 3 {
		t.Errorf("expected 3 recent brews, got %d", len(resp.Items))
	}
}

func TestRecent_MaxLimit(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	for i := 0; i < 25; i++ {
		seedBrew(repo, fmt.Sprintf("b-%d", i), "user-123", "c-1", fmt.Sprintf("2026-01-%02d", (i%28)+1), nil)
	}
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/recent?limit=50", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Items []json.RawMessage `json:"items"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Items) != 20 {
		t.Errorf("expected 20 (max limit), got %d", len(resp.Items))
	}
}

func TestRecent_Empty(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/recent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Items []json.RawMessage `json:"items"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Items) != 0 {
		t.Errorf("expected 0 recent brews, got %d", len(resp.Items))
	}
}

func TestRecent_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/recent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

// --- GetByID Tests ---

func TestGetByID_Success(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	b := seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", intPtr(8))
	b.CoffeeWeight = floatPtr(15.0)
	b.Ratio = floatPtr(15.0)
	b.CoffeeMl = floatPtr(200.0)
	b.TDS = floatPtr(1.38)
	b.WaterWeight = ComputeWaterWeight(b.CoffeeWeight, b.Ratio)
	b.ExtractionYield = ComputeExtractionYield(b.CoffeeMl, b.TDS, b.CoffeeWeight)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/b-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.BrewDate != "2026-01-15" {
		t.Errorf("expected brew_date 2026-01-15, got %s", resp.BrewDate)
	}
	if resp.WaterWeight == nil || *resp.WaterWeight != 225.0 {
		t.Errorf("expected water_weight 225.0, got %v", resp.WaterWeight)
	}
	if resp.ExtractionYield == nil || *resp.ExtractionYield != 18.4 {
		t.Errorf("expected extraction_yield 18.4, got %v", resp.ExtractionYield)
	}
}

func TestGetByID_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/nonexistent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestGetByID_OtherUserBrew(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-456", "Theirs", "Roaster", nil)
	seedBrew(repo, "b-1", "user-456", "c-1", "2026-01-15", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/b-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for other user's brew, got %d", w.Code)
	}
}

func TestGetByID_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/b-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

func TestGetByID_ResponseExcludesUserID(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/b-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if strings.Contains(w.Body.String(), "user_id") {
		t.Error("response should not contain user_id")
	}
}

func TestGetByID_IncludesCoffeeMetadata(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata Coffee", nil)
	b := seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", nil)
	b.CoffeeName = "Kiamaina"
	b.CoffeeRoaster = "Cata Coffee"
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/b-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.CoffeeName != "Kiamaina" {
		t.Errorf("expected coffee_name Kiamaina, got %s", resp.CoffeeName)
	}
	if resp.CoffeeRoaster != "Cata Coffee" {
		t.Errorf("expected coffee_roaster Cata Coffee, got %s", resp.CoffeeRoaster)
	}
}

// --- Create Tests ---

func TestCreate_Success(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", strPtr("2026-01-01"))
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{
		"coffee_id": "c-1",
		"brew_date": "2026-01-15",
		"coffee_weight": 15.0,
		"ratio": 15.0,
		"grind_size": 3.5,
		"water_temperature": 96.0,
		"pours": [
			{"pour_number": 1, "water_amount": 45.0, "pour_style": "center", "wait_time": 30},
			{"pour_number": 2, "water_amount": 90.0, "pour_style": "circular"},
			{"pour_number": 3, "water_amount": 90.0, "pour_style": "circular"}
		],
		"total_brew_time": 165,
		"coffee_ml": 200.0,
		"tds": 1.38,
		"aroma_intensity": 7,
		"overall_score": 8,
		"overall_notes": "Bright acidity",
		"improvement_notes": "Try finer grind"
	}`
	req := authRequest(http.MethodPost, "/api/v1/brews", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.ID == "" {
		t.Error("expected non-empty ID")
	}
	if resp.CoffeeID != "c-1" {
		t.Errorf("expected coffee_id c-1, got %s", resp.CoffeeID)
	}
	if resp.BrewDate != "2026-01-15" {
		t.Errorf("expected brew_date 2026-01-15, got %s", resp.BrewDate)
	}
	if resp.DaysOffRoast == nil {
		t.Error("expected days_off_roast to be computed")
	}
	if len(resp.Pours) != 3 {
		t.Errorf("expected 3 pours, got %d", len(resp.Pours))
	}
	if resp.WaterWeight == nil || *resp.WaterWeight != 225.0 {
		t.Errorf("expected water_weight 225.0, got %v", resp.WaterWeight)
	}
	if resp.ExtractionYield == nil {
		t.Error("expected extraction_yield to be computed")
	}
	if resp.OverallScore == nil || *resp.OverallScore != 8 {
		t.Errorf("expected overall_score 8, got %v", resp.OverallScore)
	}
}

func TestCreate_MinimalFields(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_id": "c-1"}`
	req := authRequest(http.MethodPost, "/api/v1/brews", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.CoffeeWeight != nil {
		t.Errorf("expected nil coffee_weight, got %v", *resp.CoffeeWeight)
	}
	if resp.WaterWeight != nil {
		t.Errorf("expected nil water_weight, got %v", *resp.WaterWeight)
	}
	if resp.ExtractionYield != nil {
		t.Errorf("expected nil extraction_yield, got %v", *resp.ExtractionYield)
	}
}

func TestCreate_MissingCoffeeID(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"brew_date": "2026-01-15"}`
	req := authRequest(http.MethodPost, "/api/v1/brews", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestCreate_InvalidCoffeeID(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_id": "nonexistent"}`
	req := authRequest(http.MethodPost, "/api/v1/brews", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for invalid coffee, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreate_OtherUserCoffee(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-456", "Theirs", "Roaster", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_id": "c-1"}`
	req := authRequest(http.MethodPost, "/api/v1/brews", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for other user's coffee, got %d", w.Code)
	}
}

func TestCreate_InvalidJSON(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodPost, "/api/v1/brews", "not json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestCreate_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	body := `{"coffee_id": "c-1"}`
	req := authRequest(http.MethodPost, "/api/v1/brews", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

func TestCreate_WithPours(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{
		"coffee_id": "c-1",
		"pours": [
			{"pour_number": 1, "water_amount": 45.0, "pour_style": "center", "wait_time": 30},
			{"pour_number": 2, "water_amount": 90.0, "pour_style": "circular"}
		]
	}`
	req := authRequest(http.MethodPost, "/api/v1/brews", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Pours) != 2 {
		t.Errorf("expected 2 pours, got %d", len(resp.Pours))
	}
	if resp.Pours[0].PourNumber != 1 {
		t.Errorf("expected pour #1, got %d", resp.Pours[0].PourNumber)
	}
	if resp.Pours[0].WaitTime == nil || *resp.Pours[0].WaitTime != 30 {
		t.Errorf("expected bloom wait_time 30, got %v", resp.Pours[0].WaitTime)
	}
}

// --- Update Tests ---

func TestUpdate_Success(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", intPtr(7))
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{
		"coffee_id": "c-1",
		"brew_date": "2026-01-16",
		"coffee_weight": 15.0,
		"ratio": 16.0,
		"overall_score": 9,
		"pours": [
			{"pour_number": 1, "water_amount": 50.0, "pour_style": "center", "wait_time": 35}
		]
	}`
	req := authRequest(http.MethodPut, "/api/v1/brews/b-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.BrewDate != "2026-01-16" {
		t.Errorf("expected updated brew_date, got %s", resp.BrewDate)
	}
	if resp.OverallScore == nil || *resp.OverallScore != 9 {
		t.Errorf("expected updated overall_score 9, got %v", resp.OverallScore)
	}
	if resp.WaterWeight == nil || *resp.WaterWeight != 240.0 {
		t.Errorf("expected water_weight 240.0 (15*16), got %v", resp.WaterWeight)
	}
	if len(resp.Pours) != 1 {
		t.Errorf("expected 1 pour after update, got %d", len(resp.Pours))
	}
}

func TestUpdate_ClearsOptionalFields(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	b := seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", intPtr(8))
	b.CoffeeWeight = floatPtr(15.0)
	b.Ratio = floatPtr(15.0)
	b.GrindSize = floatPtr(3.5)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_id": "c-1"}`
	req := authRequest(http.MethodPut, "/api/v1/brews/b-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.CoffeeWeight != nil {
		t.Errorf("expected nil coffee_weight after PUT, got %v", *resp.CoffeeWeight)
	}
	if resp.Ratio != nil {
		t.Errorf("expected nil ratio after PUT, got %v", *resp.Ratio)
	}
	if resp.GrindSize != nil {
		t.Errorf("expected nil grind_size after PUT, got %v", *resp.GrindSize)
	}
	if resp.OverallScore != nil {
		t.Errorf("expected nil overall_score after PUT, got %v", *resp.OverallScore)
	}
}

func TestUpdate_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_id": "c-1"}`
	req := authRequest(http.MethodPut, "/api/v1/brews/nonexistent", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestUpdate_OtherUserBrew(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-456", "Theirs", "Roaster", nil)
	seedBrew(repo, "b-1", "user-456", "c-1", "2026-01-15", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_id": "c-1"}`
	req := authRequest(http.MethodPut, "/api/v1/brews/b-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for other user's brew, got %d", w.Code)
	}
}

func TestUpdate_MissingCoffeeID(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"overall_score": 8}`
	req := authRequest(http.MethodPut, "/api/v1/brews/b-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing coffee_id, got %d", w.Code)
	}
}

func TestUpdate_InvalidJSON(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodPut, "/api/v1/brews/b-1", "not json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestUpdate_ReplacePours(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	b := seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", nil)
	b.Pours = []Pour{
		{PourNumber: 1, WaterAmount: floatPtr(45.0)},
		{PourNumber: 2, WaterAmount: floatPtr(90.0)},
	}
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{
		"coffee_id": "c-1",
		"pours": [
			{"pour_number": 1, "water_amount": 50.0, "pour_style": "center", "wait_time": 40}
		]
	}`
	req := authRequest(http.MethodPut, "/api/v1/brews/b-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Pours) != 1 {
		t.Errorf("expected 1 pour after replacement, got %d", len(resp.Pours))
	}
}

func TestUpdate_EmptyPoursRemovesAll(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	b := seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", nil)
	b.Pours = []Pour{{PourNumber: 1, WaterAmount: floatPtr(45.0)}}
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_id": "c-1", "pours": []}`
	req := authRequest(http.MethodPut, "/api/v1/brews/b-1", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Pours) != 0 {
		t.Errorf("expected 0 pours after empty array, got %d", len(resp.Pours))
	}
}

// --- Delete Tests ---

func TestDelete_Success(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/brews/b-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}

	if _, exists := repo.brews["b-1"]; exists {
		t.Error("expected brew to be deleted")
	}
}

func TestDelete_NotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/brews/nonexistent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestDelete_OtherUserBrew(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-456", "Theirs", "Roaster", nil)
	seedBrew(repo, "b-1", "user-456", "c-1", "2026-01-15", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/brews/b-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for other user's brew, got %d", w.Code)
	}
}

func TestDelete_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodDelete, "/api/v1/brews/b-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

// --- GetReference Tests ---

func TestGetReference_StarredReference(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	repo.coffees["c-1"].ReferenceBrewID = strPtr("b-1")
	b := seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-10", intPtr(8))
	b.CoffeeWeight = floatPtr(15.0)
	seedBrew(repo, "b-2", "user-123", "c-1", "2026-01-15", intPtr(7)) // newer but not starred
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1/reference", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp ReferenceResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Source != "starred" {
		t.Errorf("expected source 'starred', got '%s'", resp.Source)
	}
	if resp.Brew == nil {
		t.Fatal("expected brew to be present")
	}
	if resp.Brew.ID != "b-1" {
		t.Errorf("expected starred brew b-1, got %s", resp.Brew.ID)
	}
}

func TestGetReference_FallbackToLatest(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-10", intPtr(7))
	seedBrew(repo, "b-2", "user-123", "c-1", "2026-01-15", intPtr(8))
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1/reference", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp ReferenceResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Source != "latest" {
		t.Errorf("expected source 'latest', got '%s'", resp.Source)
	}
	if resp.Brew == nil {
		t.Fatal("expected brew to be present")
	}
	if resp.Brew.ID != "b-2" {
		t.Errorf("expected latest brew b-2, got %s", resp.Brew.ID)
	}
}

func TestGetReference_NoBrews(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1/reference", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp ReferenceResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Brew != nil {
		t.Error("expected null brew when no brews exist")
	}
}

func TestGetReference_CoffeeNotFound(t *testing.T) {
	repo := newMockRepo()
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/nonexistent/reference", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestGetReference_OtherUserCoffee(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-456", "Theirs", "Roaster", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1/reference", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for other user's coffee, got %d", w.Code)
	}
}

func TestGetReference_DatabaseError(t *testing.T) {
	h := NewHandler(&errorRepo{})
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/coffees/c-1/reference", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

// --- Computed Fields Tests ---

func TestComputeWaterWeight(t *testing.T) {
	ww := ComputeWaterWeight(floatPtr(15.0), floatPtr(15.0))
	if ww == nil || *ww != 225.0 {
		t.Errorf("expected 225.0, got %v", ww)
	}

	ww = ComputeWaterWeight(nil, floatPtr(15.0))
	if ww != nil {
		t.Errorf("expected nil when coffee_weight missing, got %v", *ww)
	}

	ww = ComputeWaterWeight(floatPtr(15.0), nil)
	if ww != nil {
		t.Errorf("expected nil when ratio missing, got %v", *ww)
	}
}

func TestComputeExtractionYield(t *testing.T) {
	ey := ComputeExtractionYield(floatPtr(200.0), floatPtr(1.38), floatPtr(15.0))
	if ey == nil || *ey != 18.4 {
		t.Errorf("expected 18.4, got %v", ey)
	}

	ey = ComputeExtractionYield(nil, floatPtr(1.38), floatPtr(15.0))
	if ey != nil {
		t.Errorf("expected nil when coffee_ml missing, got %v", *ey)
	}

	ey = ComputeExtractionYield(floatPtr(200.0), floatPtr(1.38), floatPtr(0))
	if ey != nil {
		t.Errorf("expected nil when coffee_weight is 0, got %v", *ey)
	}
}

// --- Brew Date Tests (Issue #2: brew_date DATE scan) ---

func TestCreate_BrewDateInResponse(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_id": "c-1", "brew_date": "2026-02-01"}`
	req := authRequest(http.MethodPost, "/api/v1/brews", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.BrewDate != "2026-02-01" {
		t.Errorf("expected brew_date 2026-02-01, got %s", resp.BrewDate)
	}
}

func TestCreate_DefaultBrewDateInResponse(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_id": "c-1"}`
	req := authRequest(http.MethodPost, "/api/v1/brews", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.BrewDate == "" {
		t.Error("expected brew_date to have a default value, got empty string")
	}
	// Should be a valid date format YYYY-MM-DD
	if len(resp.BrewDate) != 10 || resp.BrewDate[4] != '-' || resp.BrewDate[7] != '-' {
		t.Errorf("expected brew_date in YYYY-MM-DD format, got %s", resp.BrewDate)
	}
}

func TestRecent_BrewDateFormat(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Coffee", "Roaster", nil)
	seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", intPtr(8))
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/recent", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	// Verify the brew_date is in the response as a properly formatted string
	if !strings.Contains(w.Body.String(), "2026-01-15") {
		t.Error("expected brew_date 2026-01-15 in recent brews response")
	}
}

// --- Filter Paper ID Tests (Issue #3: scanBrew filterPaperID reuse) ---

func TestCreate_FilterPaperInResponse(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	h := NewHandler(repo)
	router := setupRouter(h)

	body := `{"coffee_id": "c-1", "filter_paper_id": "fp-1"}`
	req := authRequest(http.MethodPost, "/api/v1/brews", body)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.FilterPaper == nil {
		t.Fatal("expected filter_paper to be present in response")
	}
	if resp.FilterPaper.ID != "fp-1" {
		t.Errorf("expected filter_paper.id fp-1, got %s", resp.FilterPaper.ID)
	}
}

func TestGetByID_FilterPaperCorrectID(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	b := seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", nil)
	b.FilterPaper = &FilterPaper{
		ID:    "fp-42",
		Name:  "Abaca",
		Brand: strPtr("Cafec"),
	}
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/b-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.FilterPaper == nil {
		t.Fatal("expected filter_paper to be present")
	}
	if resp.FilterPaper.ID != "fp-42" {
		t.Errorf("expected filter_paper.id fp-42, got %s", resp.FilterPaper.ID)
	}
	if resp.FilterPaper.Name != "Abaca" {
		t.Errorf("expected filter_paper.name Abaca, got %s", resp.FilterPaper.Name)
	}
	if resp.FilterPaper.Brand == nil || *resp.FilterPaper.Brand != "Cafec" {
		t.Errorf("expected filter_paper.brand Cafec, got %v", resp.FilterPaper.Brand)
	}
}

func TestGetByID_NoFilterPaper(t *testing.T) {
	repo := newMockRepo()
	repo.addCoffee("c-1", "user-123", "Kiamaina", "Cata", nil)
	seedBrew(repo, "b-1", "user-123", "c-1", "2026-01-15", nil) // no filter paper
	h := NewHandler(repo)
	router := setupRouter(h)

	req := authRequest(http.MethodGet, "/api/v1/brews/b-1", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp Brew
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.FilterPaper != nil {
		t.Errorf("expected nil filter_paper, got %+v", resp.FilterPaper)
	}
}
