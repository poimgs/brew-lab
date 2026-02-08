# Deployment

## Context

This specification defines the deployment architecture for Coffee Tracker. A VPS + Docker Compose approach was chosen for simplicity, full control, and predictable costs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DigitalOcean VPS                              │
│                   (brew-lab.steven-chia.com)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                         Caddy                              │  │
│  │                   (Reverse Proxy)                          │  │
│  │                                                            │  │
│  │  - Auto HTTPS via Let's Encrypt                           │  │
│  │  - Serves static frontend                                  │  │
│  │  - Proxies /api/* to backend                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              ▼                               ▼                   │
│  ┌─────────────────────┐       ┌─────────────────────────────┐  │
│  │   Static Frontend   │       │      Go Backend             │  │
│  │   (React/Vite)      │       │      (Docker Container)     │  │
│  │                     │       │                             │  │
│  │  - index.html       │       │  - /health                  │  │
│  │  - JS/CSS bundles   │       │  - /api/v1/auth/*           │  │
│  │  - Assets           │       │  - /api/v1/coffees/*        │  │
│  └─────────────────────┘       │  - /api/v1/brews/*          │  │
│                                └──────────────┬──────────────┘  │
│                                               │                  │
│                                               ▼                  │
│                                ┌─────────────────────────────┐  │
│                                │       PostgreSQL            │  │
│                                │    (Docker Container)       │  │
│                                │                             │  │
│                                │  - Persistent volume        │  │
│                                │  - Auto-migrations          │  │
│                                └─────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

1. User visits `https://brew-lab.steven-chia.com`
2. Caddy terminates TLS and serves static React assets
3. Frontend makes API calls to `/api/v1/*`
4. Caddy proxies `/api/*` to the Go backend container
5. Backend processes request, queries PostgreSQL
6. Response flows back through the same path

## Platform Choice

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Hosting | DigitalOcean Droplet | Simple, predictable cost, full control |
| Reverse Proxy | Caddy | Auto HTTPS, simple config, zero maintenance |
| Container Runtime | Docker Compose | Single-file orchestration, easy local replication |
| Database | PostgreSQL (containerized) | Persistent volume, same host as backend |
| Domain | brew-lab.steven-chia.com | Existing domain infrastructure |

## Files to Create

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local development (PostgreSQL only) |
| `docker-compose.prod.yml` | Production container orchestration for all services |
| `backend/Dockerfile` | Multi-stage build for Go server + CLI |
| `frontend/Dockerfile` | Multi-stage build for React app |
| `Caddyfile` | Reverse proxy and static file serving config |
| `.env.example` | Template for required environment variables |
| `backend/.dockerignore` | Exclude dev files from Docker build |
| `scripts/create-user.sh` | Wrapper script for user seeding |

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@db:5432/coffee?sslmode=disable` |
| `JWT_SECRET` | Secret for signing JWT tokens | Output of `openssl rand -base64 32` |
| `DB_PASSWORD` | PostgreSQL password | Secure random string |
| `CADDY_DOMAIN` | Domain for Caddy (use `localhost` for local dev) | `brew-lab.steven-chia.com` |

## User Setup Steps

1. **Create DigitalOcean Droplet**
   - Smallest size ($6/mo) is sufficient
   - Ubuntu 24.04 LTS recommended
   - Singapore region for APAC proximity

2. **Configure DNS**
   - Add A record: `brew-lab.steven-chia.com` → droplet IP

3. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

4. **Clone Repo and Configure**
   ```bash
   git clone <repo-url> brew-lab
   cd brew-lab
   cp .env.example .env
   # Edit .env with actual values
   ```

## Deployment Steps

1. **Start Services**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   This automatically builds the frontend inside Docker - no manual npm commands needed.

2. **Seed Initial User**
   ```bash
   ./scripts/create-user.sh -email=user@example.com -password=SecurePass123!
   ```

## Verification

| Check | Command/Action |
|-------|----------------|
| Health check | `curl https://brew-lab.steven-chia.com/health` → `OK` |
| Frontend loads | Visit domain in browser, login page appears |
| Login works | Use seeded credentials, should redirect to coffees landing page |
| CRUD operations | Create/edit/delete a coffee entry |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Caddy fails to start | Check domain DNS is propagated: `dig brew-lab.steven-chia.com` |
| Database connection refused | Ensure db container is running: `docker compose -f docker-compose.prod.yml ps` |
| 502 Bad Gateway | Check backend logs: `docker compose -f docker-compose.prod.yml logs backend` |
| HTTPS certificate error | Caddy auto-retries; check `docker compose -f docker-compose.prod.yml logs caddy` |

### Useful Commands

```bash
# View all container logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Access database
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d coffee

# SSH into backend container
docker compose -f docker-compose.prod.yml exec backend sh
```

## Maintenance

### Update Procedure

```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Backup Considerations

- Database volume is persistent across container restarts
- For backups: `docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres coffee > backup.sql`
- Store backups off-server (e.g., DigitalOcean Spaces, S3)

## Cost Summary

| Component | Monthly Cost |
|-----------|--------------|
| DigitalOcean Droplet (1 vCPU, 1GB RAM) | $6 |
| Domain (existing) | $0 |
| **Total** | **~$6/month** |

## Design Decisions

### VPS over PaaS

**Considered alternatives:** Vercel + Fly.io, Railway, Render

**Chose VPS because:**
- Single monthly cost vs. multiple service bills
- No cold start delays (always-on)
- Full control over configuration
- Easier debugging via SSH
- Database on same host (lower latency)

**Trade-offs accepted:**
- Manual server maintenance
- No auto-scaling (not needed for personal use)

### Caddy over Nginx

**Chose Caddy because:**
- Automatic HTTPS with zero configuration
- Simple Caddyfile syntax
- Built-in HTTP/3 support
- No certbot renewal cron jobs

### Same-Origin Architecture

Frontend and API share the same domain:
- No CORS complexity
- Simpler cookie handling
- Single TLS termination point
- Caddy handles routing by path
