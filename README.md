# Coffee Tracker

A personal brewing experiment tracker for capturing brewing parameters, taste outcomes, and discovering patterns in your coffee.

## Features

- **Experiment Tracking**: Capture brewing parameters and taste outcomes
- **Coffee Library**: Maintain bean metadata independent from experiments
- **Pattern Discovery**: Reveal relationships between variables and outcomes
- **Actionable Recommendations**: Suggest improvements based on score gaps and effect mappings

## Tech Stack

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Go with chi router
- **Database**: PostgreSQL

## Prerequisites

- Go 1.21+
- Node.js 18+
- Docker (for PostgreSQL)

## Getting Started

### Database

```bash
docker compose up -d   # Start PostgreSQL
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

### E2E Tests (from `e2e/` directory)

```bash
docker compose up -d   # Ensure database is running
make install           # First time: install deps + browser
make test              # Run all tests
make test-ui           # Interactive UI mode
make test-headed       # Run with visible browser
```

E2E tests use a separate database (`coffee_tracker_test`) and ports (5174/8081) to avoid conflicts with development.

## Project Structure

```
specs/           # Specifications
backend/         # Go backend (chi router)
frontend/        # React + TypeScript (Vite)
e2e/             # Playwright E2E tests
docker-compose.yml
```

## Documentation

See [specs/index.md](specs/index.md) for detailed project specifications.
