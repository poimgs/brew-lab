# Coffee Tracker v3 — Implementation Plan

## Context

The v3 branch is a clean slate — all previous backend and frontend code was deleted in commit `5925137`. Complete specs exist under `specs/` covering 5 features and 5 foundation docs. This plan builds the entire application from scratch following those specs.

**Tech stack:** Go/chi/PostgreSQL backend, React/TypeScript/Vite/shadcn frontend.

---

## Step 1: Project Scaffolding

Create both projects with tooling configured. No feature code — just skeletons that compile and run.

**Backend (`backend/`):**
- `go.mod` — deps: chi, golang-jwt, golang-migrate, pgx, bcrypt, cors
- `cmd/server/main.go` — HTTP server with chi, CORS, `GET /health`
- `cmd/seed/main.go` — CLI stub for user seeding
- `Makefile` — targets: build, run, tidy, migrate, seed-user
- `Dockerfile`, `.dockerignore`
- `internal/config/config.go` — env var loading (DATABASE_URL, JWT_SECRET, PORT, etc.)
- `internal/database/db.go` — pgx connection pool
- `internal/database/migrate.go` — golang-migrate integration
- `internal/api/errors.go` — `{ error: { code, message, details[] } }` format
- `internal/api/response.go` — JSON + pagination helpers

**Frontend (`frontend/`):**
- `package.json` — react, react-router-dom, react-hook-form, zod, axios, lucide-react, tailwindcss, shadcn/ui, vite-plugin-pwa
- `vite.config.ts` — PWA plugin, `/api` proxy to localhost:8080
- `tailwind.config.ts` — zinc/teal palette, Inter font, dark mode
- `src/main.tsx`, `src/App.tsx` — entry + route definitions (placeholders)
- `src/lib/utils.ts` — `cn()` utility
- `src/components/ui/` — install shadcn/ui primitives (button, input, card, dialog, toast, etc.)
- `src/components/layout/Layout.tsx` + `Sidebar.tsx` — shell with nav (Home, Brews, Coffees, Equipment) + user menu
- `src/api/client.ts` — axios instance stub
- `vitest.config.ts`, `src/test/setup.ts` — test infra

**Root:** `.env.example`

**Verify:** `go build ./...`, `npm run build`, health endpoint 200, Vitest runs.

---

## Step 2: Authentication Backend

Full auth system — user entity, JWT access/refresh tokens, middleware, seed CLI.

**Migrations:**
- `001_create_users.up/down.sql` — users table + uuid-ossp extension
- `002_create_refresh_tokens.up/down.sql` — refresh_tokens table

**Files:**
- `internal/domain/auth/entity.go` — User, LoginRequest, TokenPair, RefreshToken structs
- `internal/domain/auth/repository.go` — UserRepository + RefreshTokenRepository interfaces
- `internal/domain/auth/repository_pg.go` — PostgreSQL implementations
- `internal/domain/auth/handler.go` — Login, Refresh, Logout, Me handlers
- `internal/domain/auth/handler_test.go`
- `internal/middleware/auth.go` — JWT validation, user_id in context
- `internal/middleware/ratelimit.go` — 5/min on login
- `cmd/seed/main.go` — bcrypt cost 12, password validation

**Key behaviors:** Access token 1hr (memory), refresh token 7d (HttpOnly cookie), token rotation on refresh, generic error messages.

---

## Step 3: Authentication Frontend

Login page, auth context, protected routes, token refresh interceptor.

**Files:**
- `src/api/client.ts` — axios interceptor: attach token, intercept 401, refresh, retry
- `src/api/auth.ts` — login, refresh, logout, getMe
- `src/contexts/AuthContext.tsx` — user state, access token in memory, login/logout
- `src/pages/LoginPage.tsx` — email + password form (react-hook-form + zod)
- `src/components/ProtectedRoute.tsx` — redirect to /login if unauthenticated

---

## Step 4: Equipment (Filter Papers) Backend

**Migration:** `003_create_filter_papers.up/down.sql` — partial unique index on (user_id, name) WHERE deleted_at IS NULL

**Files:**
- `internal/domain/filterpaper/entity.go`, `repository.go`, `repository_pg.go`, `handler.go`, `handler_test.go`

**Endpoints:** GET/POST/GET/:id/PUT/:id/DELETE/:id (soft delete) under `/api/v1/filter-papers`

---

## Step 5: Equipment (Filter Papers) Frontend

**Files:**
- `src/api/filterPapers.ts`
- `src/pages/EquipmentPage.tsx` — card list + add button
- `src/components/equipment/FilterPaperForm.tsx` — add/edit dialog
- `src/components/equipment/FilterPaperCard.tsx`

---

## Step 6: Coffees Backend

**Migration:** `004_create_coffees.up/down.sql` — reference_brew_id as UUID (FK added in Step 8 when brews table exists)

**Files:**
- `internal/domain/coffee/entity.go` — Coffee with computed brew_count, last_brewed
- `internal/domain/coffee/repository.go`, `repository_pg.go`, `handler.go`, `handler_test.go`

**Endpoints:** List (filters: search, roaster, country, process, archived_only), Create, GetByID, Update (PUT), Delete (hard, cascade), Archive, Unarchive, SetReferenceBrew, GetReference (starred or latest + `source` field), Suggestions

---

## Step 7: Coffees Frontend — List & CRUD

**Files:**
- `src/api/coffees.ts`
- `src/pages/CoffeesPage.tsx` — responsive grid (1/2/3 cols), search, archived toggle
- `src/components/coffees/CoffeeCard.tsx` — name, roaster, archived badge
- `src/pages/CoffeeDetailPage.tsx` — metadata, actions (New Brew, Edit, Archive, Delete), reference + history sections (wired in Step 10)
- `src/components/coffees/CoffeeForm.tsx` — roaster autocomplete via suggestions API

---

## Step 8: Brew Tracking Backend

**Migration:** `005_create_brews.up/down.sql` — brews + brew_pours tables, add FK from coffees.reference_brew_id → brews.id (ON DELETE SET NULL)

**Files:**
- `internal/domain/brew/entity.go` — Brew with nested pours, computed water_weight/extraction_yield, denormalized coffee_name/coffee_roaster, nested filter_paper
- `internal/domain/brew/repository.go`, `repository_pg.go`, `handler.go`, `handler_test.go`

**Endpoints:**
- `GET /brews` — global paginated, filterable
- `GET /brews/recent?limit=5`
- `POST /brews` — compute days_off_roast, insert brew + pours
- `GET /brews/:id` — JOINs for coffee + filter_paper
- `PUT /brews/:id` — full replace, recompute days_off_roast
- `DELETE /brews/:id` — hard delete, cascade pours, NULL ref
- `GET /coffees/:id/brews` — coffee-scoped

**Also update:** Coffee GetReference to work fully now that brews table exists.

---

## Step 9: Brew Form Frontend

The largest frontend step — brew logging form with all interactions.

**Files:**
- `src/api/brews.ts`
- `src/pages/BrewFormPage.tsx` — handles `/brews/new` and `/brews/:id/edit`, reads `?coffee_id` and `?from` params
- `src/components/brew/BrewForm.tsx` — react-hook-form + zod, 3 collapsible sections
- `src/components/brew/SetupSection.tsx` — coffee_weight, ratio, water_weight (computed), grind_size, temperature, filter_paper
- `src/components/brew/BrewingSection.tsx` — dynamic pours list, total_brew_time (mm:ss), technique_notes
- `src/components/brew/TastingSection.tsx` — coffee_ml, tds, extraction_yield (computed), 6 sensory sliders
- `src/components/brew/PourRow.tsx` — water_amount, pour_style, wait_time
- `src/components/brew/SectionFillDot.tsx` — 3-state indicator
- `src/components/brew/ReferenceSidebar.tsx` — collapsed panel (desktop) / sheet (mobile)
- `src/components/brew/CoffeeSelector.tsx` — searchable dropdown
- `src/hooks/useAutoFill.ts` — starred ref → latest brew → user defaults → blank
- `src/hooks/useBeforeUnload.ts`

**Key:** All sections collapsed by default. Live computation of water_weight, extraction_yield, days_off_roast. "Brew Again" (`?from=:id`) pre-fills setup + brewing only.

---

## Step 10: Coffee Detail Integration

Wire up reference brew section and brew history on coffee detail page.

**Files:**
- `src/components/brew/BrewDetailModal.tsx` — Setup/Brewing/Tasting sections, actions: Edit, Brew Again, Star as Ref, Delete
- `src/components/coffees/ReferenceBrewSection.tsx` — params, outcomes, improvement notes, star icon
- `src/components/coffees/BrewHistoryTable.tsx` — sortable, star icon per row, infinite scroll, click → modal
- `src/components/coffees/ChangeReferenceDialog.tsx`
- `src/components/brew/DeleteBrewDialog.tsx`

**Update:** `CoffeeDetailPage.tsx` — integrate reference + history sections.

---

## Step 11: Global Brews Page

**File:** `src/pages/BrewsPage.tsx` — paginated table of all brews, filters (coffee, date range, score), sort by date/score, row click → BrewDetailModal.

---

## Step 12: Home Page

**Update:** `src/pages/HomePage.tsx` — "Log a Brew" button, recent brews widget (last 5), row actions (Edit, Brew Again), row click → modal, "View all brews →" link, empty state.

---

## Step 13: Preferences Backend

**Migration:** `006_create_user_defaults.up/down.sql` — user_defaults + user_pour_defaults tables

**Files:**
- `internal/domain/defaults/entity.go`, `repository.go`, `repository_pg.go`, `handler.go`, `handler_test.go`

**Endpoints:** GET/PUT /defaults, DELETE /defaults/:field

---

## Step 14: Preferences Frontend

**Files:**
- `src/api/defaults.ts`
- `src/pages/PreferencesPage.tsx` — setup defaults + pour defaults, [x] clear buttons, filter_paper dropdown

**Update:** `useAutoFill.ts` — integrate defaults as lowest-priority fallback.

---

## Step 15: Polish, Dark Mode & PWA

- Dark mode toggle + `useTheme` hook (localStorage persistence)
- PWA icons in `public/`, vite-plugin-pwa manifest config
- Skeleton loaders on all data pages
- Toast notification consistency
- 404/error pages
- Responsive review across all breakpoints

---

## Step 16: Deployment & Integration Testing

- Verify Docker builds (backend + frontend)
- `docker-compose.prod.yml` full-stack test
- Caddyfile routes + cache headers
- Seed user, smoke test all flows end-to-end
- Deploy to VPS, verify HTTPS + PWA installability

---

## Dependency Graph

```
1 Scaffolding
├── 2 Auth Backend → 3 Auth Frontend
│   ├── 4 Equipment BE → 5 Equipment FE
│   └── 6 Coffees BE → 7 Coffees FE
│       └── 8 Brews BE
│           ├── 9 Brew Form FE
│           ├── 10 Coffee Detail Integration
│           ├── 11 Global Brews Page
│           ├── 12 Home Page
│           └── 13 Preferences BE → 14 Preferences FE
└── 15 Polish (after 1-14) → 16 Deployment
```

**Parallelizable:** Steps 4-5 and 6-7 (equipment and coffees are independent). Steps 9-12 can proceed in any order after Step 8.

---

## Verification

After each step: run `go build ./...` and backend tests (`go test ./...`), run `npm run build` and frontend tests (`npm test`). After Step 16: full end-to-end smoke test of all user flows.
