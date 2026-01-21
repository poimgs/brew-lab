# Coffee Tracker

A full-stack application for tracking coffee consumption with a Go backend and React frontend.

## Prerequisites

- **Docker & Docker Compose** - For running PostgreSQL database
- **Go 1.25+** - For the backend server
- **Node.js 18+** - For the frontend
- **golang-migrate CLI** - For database migrations (install: `go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest`)

## Quick Start

1. **Start the database and backend:**
   ```bash
   cd backend
   make dev
   ```
   This starts PostgreSQL via Docker, runs migrations, and starts the API server.

2. **Create a test user (in a new terminal):**
   ```bash
   cd backend
   make seed-user EMAIL=test@example.com PASSWORD=TestPass123!
   ```

3. **Start the frontend (in a new terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open the app:**
   Navigate to http://localhost:5173

## Development Setup

### Backend

The backend is a Go API server using Chi router and PostgreSQL.

```bash
cd backend

# Start everything (database + migrations + server)
make dev

# Or run individual commands:
make docker-up      # Start PostgreSQL container
make migrate-up     # Run database migrations
make run            # Start the server

# Other useful commands:
make test           # Run tests
make lint           # Run linter
make build          # Build binary
```

### Frontend

The frontend is a React application using Vite, TypeScript, and Tailwind CSS.

```bash
cd frontend

npm install         # Install dependencies
npm run dev         # Start development server
npm run build       # Build for production
npm run lint        # Run ESLint
```

## Project Structure

```
coffee-tracker/
├── backend/
│   ├── cmd/              # Application entrypoints
│   │   ├── server/       # API server
│   │   └── seed/         # User seeding CLI
│   ├── internal/         # Private application code
│   │   ├── handlers/     # HTTP handlers
│   │   ├── middleware/   # HTTP middleware
│   │   ├── models/       # Data models
│   │   ├── repository/   # Database access layer
│   │   ├── router/       # Route definitions
│   │   └── services/     # Business logic
│   └── migrations/       # SQL migration files
├── frontend/
│   └── src/
│       ├── components/   # React components
│       ├── contexts/     # React contexts
│       ├── features/     # Feature modules
│       └── lib/          # Utilities
├── specs/                # Project specifications
└── docker-compose.yml    # PostgreSQL container config
```

## Environment Variables

The backend uses the following environment variables (can be set in `backend/.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/coffee_tracker?sslmode=disable` | PostgreSQL connection string |
| `JWT_SECRET` | - | Secret key for JWT token signing |
| `PORT` | `8080` | Server port |
