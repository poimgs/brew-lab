# Brew Lab

A personal pour-over brewing tracker for dialing in your coffee.

## Features

- **Brew Tracking**: Log brewing parameters and taste outcomes in a single form
- **Coffee Library**: Manage bean metadata with reference brews
- **Equipment**: Track filter papers
- **User Preferences**: Set defaults for brew parameters
- **PWA**: Installable, works offline for static assets
- **Dark Mode**

## Tech Stack

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Go with chi router
- **Database**: PostgreSQL

## Prerequisites

- Go 1.25+
- Node.js 22+
- Docker (for PostgreSQL, Caddy)

## Getting Started

### Database

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

### Create a User

For local development (from `backend/` directory):
```bash
make seed-user EMAIL=you@example.com PASSWORD=YourPassword123!
```

For production:
```bash
./scripts/create-user.sh -email=you@example.com -password=YourPassword123!
```

### Production Deployment

SSH into the VPS and deploy:
```bash
ssh user@brew-lab.steven-chia.com
cd ~/coffee-tracker
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

See [specs/foundations/deployment.md](specs/foundations/deployment.md) for full deployment documentation.

## Project Structure

```
specs/           # Specifications
backend/         # Go backend (chi router)
frontend/        # React + TypeScript (Vite)
docker-compose.yml       # Local dev (PostgreSQL only)
docker-compose.prod.yml  # Production (all services)
```

## Environment Files

**Local development** uses component-specific `.env` files:
- `backend/.env` - Backend config (copy from `backend/.env.example`)
- Frontend uses Vite defaults, no `.env` needed

**Production deployment** uses the root `.env` file:
- `.env` - Combined config for `docker-compose.prod.yml` (copy from `.env.example`)

The root `.env.example` is only for production - it configures all services (database, backend, Caddy) in the Docker Compose stack.

## Documentation

See [specs/index.md](specs/index.md) for detailed project specifications.
