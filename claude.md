# Coffee Tracker

A web application for tracking and analyzing coffee brewing experiments.

Read `specs/index.md` for project overview and specifications.

## Specs-Based Workflow

### Before Implementation
1. Check `specs/index.md` for relevant specifications
2. Read all linked specs that apply to the task
3. Follow requirements and design decisions documented

### Creating/Updating Specs
- New specs go in appropriate category directory
- Update `specs/index.md` with a new row for new spec: link to spec, link to related code, purpose summary
- Spec format:
  - **Context**: Why this spec exists
  - **Requirements**: What must be true
  - **Design Decisions**: Chosen approach with rationale
  - **Open Questions**: Unresolved items (if any)

## Running the App

### Database (from project root)
```bash
docker compose up -d   # Start PostgreSQL
docker compose down    # Stop PostgreSQL
```

### Backend (from `backend/` directory)
```bash
make migrate    # Run migrations
make run        # Start backend server
```

### Frontend (from `frontend/` directory)
```bash
npm install     # First time only
npm run dev     # Start dev server
```

## Backend Commands (Make Targets)

| Command | Description |
|---------|-------------|
| `make build` | Build all binaries |
| `make run` | Run server |
| `make tidy` | go mod tidy |
| `make migrate` | Run migrations up |
| `make migrate-down` | Rollback migrations |
| `make migrate-version` | Show migration version |
| `make seed-user EMAIL=... PASSWORD=...` | Create user |

## Frontend Commands (npm scripts)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build (`tsc -b && vite build`) |
| `npm run test` | Run vitest tests once |
| `npm run test:watch` | Run vitest in watch mode |
| `npm run preview` | Preview build |
| `npm run lint` | Run ESLint |

## Verifying Changes

Quick verification steps for agents after making changes:

| Change Type | Verification |
|-------------|--------------|
| Backend code | `cd backend && go build ./...` |
| Frontend code | `cd frontend && npm run lint && npm run build && npm run test` |
| Migrations | `cd backend && make migrate` |
| E2E-impacting | `cd e2e && make test` |

**Note:** `npm run build` runs `tsc -b` which type-checks test files strictly (unlike `tsc --noEmit`). Always run the full build to catch type errors in tests — this matches CI.

For full E2E testing, see `specs/foundations/e2e-testing.md`.

## File Organization
```
specs/           # Specifications
backend/         # Go backend (chi router)
frontend/        # React + TypeScript (Vite)
e2e/             # Playwright E2E tests
docker-compose.yml
```
