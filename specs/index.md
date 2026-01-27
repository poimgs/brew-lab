# Specs Index

## Project Overview

**Coffee Tracker** is a personal brewing experiment tracker.

### Goals
- **Experiment Tracking**: Capture brewing parameters and taste outcomes
- **Coffee Library**: Maintain bean metadata independent from experiments
- **Pattern Discovery**: Reveal relationships between variables and outcomes
- **Knowledge Codification**: Record effect mappings (cause→effect relationships)
- **Actionable Recommendations**: Suggest improvements based on score gaps and effect mappings

### Tech Stack
- **Frontend**: React + TypeScript
- **Backend**: Go with chi router
- **Database**: PostgreSQL (cloud-hosted)
- **Auth**: Email/password + JWT

### Architecture Principles
- Separation of concerns: Coffee metadata independent from experiments
- Progressive detail: Only coffee reference and notes required; others optional
- Calculated fields: Derive values where possible (days off roast, etc.)
- User defaults: Allow setting defaults for optional fields
- Manual mappings only: No automated inference; users define effect mappings explicitly

### Data Model
```
Coffee (metadata) 1:N ← Experiment (brew record)
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
| [design-system.md](foundations/design-system.md) | UI patterns, colors, typography, components |

---

## Features

Self-contained feature specifications. Each includes entity definitions, API endpoints, and UI specs.

### Feature Details

| Spec | Dependencies | Purpose |
|------|--------------|---------|
| [authentication.md](features/authentication.md) | — | User entity, login/signup, JWT, session handling |
| [coffee-library.md](features/coffee-library.md) | authentication | Coffee entity + CRUD API + library UI |
| [reference-data.md](features/reference-data.md) | authentication | Filter papers (CRUD) + mineral profiles (read-only) + brew defaults |
| [brew-tracking.md](features/brew-tracking.md) | authentication, coffee-library | Experiment entity + logging API + entry forms |
| [experiment-review.md](features/experiment-review.md) | brew-tracking | List/compare/analyze views, correlation analysis |
| [dashboard.md](features/dashboard.md) | brew-tracking | Home landing page with quick experiment logging |

### Dependency Graph

```
authentication (core)
    │
    ├── coffee-library
    │       │
    │       └── brew-tracking ←── reference-data
    │               │
    │               ├── experiment-review
    │               │       (includes correlation analysis)
    │               │
    │               └── dashboard (home)
    │
    └── reference-data (filter papers + mineral profiles)
```

### Navigation Structure

| Item | Route | Feature |
|------|-------|---------|
| Home | `/` | dashboard (home landing page) |
| Experiments | `/experiments` | experiment-review (brew list and review) |
| Library | `/library` | coffee-library + reference-data (combined) |
| Settings | `/settings` | authentication (user preferences) |

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
