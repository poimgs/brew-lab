# Specs Index

## Project Overview

**Coffee Tracker** is a personal brewing tracker.

### Goals
- **Brew Tracking**: Capture brewing parameters and taste outcomes
- **Coffee Library**: Maintain bean metadata independent from brews
- **Pattern Discovery**: Reveal relationships between variables and outcomes
- **Knowledge Codification**: Record effect mappings (cause→effect relationships)
- **Actionable Recommendations**: Suggest improvements based on score gaps and effect mappings

### Tech Stack
- **Frontend**: React + TypeScript
- **Backend**: Go with chi router
- **Database**: PostgreSQL (cloud-hosted)
- **Auth**: Email/password + JWT

### Architecture Principles
- Separation of concerns: Coffee metadata independent from brews
- Progressive detail: Only coffee reference and notes required; others optional
- Calculated fields: Derive values where possible (days off roast, etc.)
- User defaults: Allow setting defaults for optional fields
- Manual mappings only: No automated inference; users define effect mappings explicitly

### Equipment Assumption
The app assumes a single equipment setup: Fellow Ode 2 grinder and V60 brewer. Grind settings are numeric values specific to this grinder. Future versions may add equipment tracking if needed.

### Data Model
```
Coffee (metadata) 1:N ← Brew (brew record)
Coffee (metadata) 1:N ← Session (variable testing group)
Session N:M ← Brew (many-to-many via join table)
```

---

## Specification Structure

This project uses a **foundations + features** structure designed for AI-assisted development:

- **Foundations**: Cross-cutting conventions (read once, apply everywhere)
- **Features**: Self-contained specs with entity + API + UI in one document

Each feature spec can be read in isolation to understand and implement that feature.

---

## Foundations

Conventions and patterns used across all features. Read these first.

| Spec | Purpose |
|------|---------|
| [api-conventions.md](foundations/api-conventions.md) | REST patterns, errors, pagination, filtering |
| [database-conventions.md](foundations/database-conventions.md) | Schema patterns, types, migrations |
| [deployment.md](foundations/deployment.md) | VPS + Docker deployment setup |
| [design-system.md](foundations/design-system.md) | UI patterns, colors, typography, components |
| [e2e-testing.md](foundations/e2e-testing.md) | Playwright E2E tests, fixtures, patterns |
| [pwa.md](foundations/pwa.md) | Progressive Web App setup, service worker, manifest |

---

## Features

Self-contained feature specifications. Each includes entity definitions, API endpoints, and UI specs.

### Feature Details

| Spec | Dependencies | Purpose |
|------|--------------|---------|
| [authentication.md](features/authentication.md) | — | User entity, login/signup, JWT, session handling |
| [coffees.md](features/coffees.md) | authentication | Coffee beans + reference brew + target goals |
| [library.md](features/library.md) | authentication | Filter papers + mineral profiles with tabbed UI |
| [user-preferences.md](features/user-preferences.md) | authentication | Brew defaults, accessed via user menu |
| [brew-tracking.md](features/brew-tracking.md) | authentication, coffees | Brew entity + logging API + entry forms + reference sidebar |
| [sessions.md](features/sessions.md) | coffees, brew-tracking | Group brews into variable-testing sessions with hypothesis + conclusion |
| [dashboard.md](features/dashboard.md) | coffees, brew-tracking, sessions | Goal-focused analytics hub with correlations and insights |
### Dependency Graph

```
authentication (core)
    │
    ├── coffees (bean metadata + reference brew + goals)
    │       │
    │       ├── brew-tracking (brew logging + wizard + reference sidebar)
    │       │       │
    │       │       ├── sessions (variable testing groups)
    │       │       │
    │       │       └── dashboard (goal tracking + correlations + insights)
    │       │               (uses: coffees, brew-tracking, sessions)
    │       │
    │       └── sessions (per-coffee brew grouping)
    │
    ├── library (filter papers + mineral profiles)
    │
    └── user-preferences (brew defaults)
```

### Navigation Structure

| Item | Route | Feature |
|------|-------|---------|
| Coffees | `/` | coffees (landing page with beans, reference brew, goals) |
| Dashboard | `/dashboard` | dashboard (goal progress, correlations, insights) |
| Library | `/library` | library (filter papers, mineral profiles) |

**Dashboard Sub-Navigation:**
| Route | View |
|-------|------|
| `/dashboard` | Landing — cross-coffee goal progress + correlations |
| `/dashboard?coffee={id}` | Per-coffee drill-down — trends, insights, sessions, brew history |

**User Menu:**
| Item | Route | Feature |
|------|-------|---------|
| Preferences | `/preferences` | user-preferences (brew defaults) |
| Logout | — | authentication (logout action) |

## Reading Guide

**For implementing a feature:**
1. Read the relevant foundations specs (api-conventions, database-conventions, design-system)
2. Read the feature spec for full context (entity, API, UI in one place)
3. Check dependencies and ensure prerequisite features are complete
4. Implement

**For AI agents:**
- Each feature spec is self-contained
- No need to read domain/ or system/ directories (they no longer exist)
- Foundations provide shared conventions referenced by all features

