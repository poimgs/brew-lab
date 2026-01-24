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
Coffee (metadata) 1:N ← Experiment (brew record + target profile)
                              ↓ gaps computed
                        Effect Mappings (cause→effect)
                              ↓ matched by
                        Recommendations
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

### Completion Summary

| Status | Count | Features |
|--------|-------|----------|
| ✅ Complete | 7 | authentication, coffee-library, brew-tracking, reference-data, effect-mappings, brew-optimization, recommendations |
| 🚧 Not Started | 1 | experiment-review |

**Overall Progress: 7/8 features (88%)**

### Feature Details

| Spec | Status | Dependencies | Purpose |
|------|--------|--------------|---------|
| [authentication.md](features/authentication.md) | ✅ Complete | — | User entity, login/signup, JWT, session handling |
| [coffee-library.md](features/coffee-library.md) | ✅ Complete | authentication | Coffee entity + CRUD API + library UI |
| [brew-tracking.md](features/brew-tracking.md) | ✅ Complete | authentication, coffee-library | Experiment entity + logging API + entry forms |
| [reference-data.md](features/reference-data.md) | ✅ Complete | authentication | Filter papers (CRUD) + mineral profiles (read-only) |
| [brew-optimization.md](features/brew-optimization.md) | ✅ Complete | brew-tracking | Target profiles, radar chart, gap analysis |
| [experiment-review.md](features/experiment-review.md) | 🚧 Not Started | brew-tracking, effect-mappings | List/compare/analyze views, correlation analysis, effect mapping management |
| [effect-mappings.md](features/effect-mappings.md) | ✅ Complete | authentication | Effect mapping entity + CRUD API |
| [recommendations.md](features/recommendations.md) | ✅ Complete | brew-optimization, effect-mappings | Gap-based recommendations, mapping matching |

### Dependency Graph

```
authentication (core)
    │
    ├── coffee-library
    │       │
    │       └── brew-tracking ←── reference-data
    │               │
    │               ├── brew-optimization
    │               │       │
    │               │       └── recommendations ←── effect-mappings
    │               │
    │               └── experiment-review ←── effect-mappings
    │                       (includes correlation analysis)
    │
    ├── reference-data (filter papers + mineral profiles)
    │
    └── effect-mappings
```

### Recommended Implementation Order

1. **reference-data** — Filter papers + mineral profiles, needed by brew-tracking form
2. **effect-mappings** — Independent entity, needed by recommendations and experiment-review
3. **brew-optimization** — Adds target profiles to experiments, enables gap analysis
4. **experiment-review** — List/compare/analyze experiments, manage effect mappings, correlation analysis
5. **recommendations** — Connect gaps to effect mappings for suggestions

---

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

---

## Implementation Status

### Backend

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Authentication | ✅ Complete | `backend/internal/services/auth/` | JWT + session handling |
| Database Schema | ✅ Complete | `backend/migrations/` | Core tables created |
| Coffee API | ✅ Complete | `backend/internal/handlers/coffee/` | Full CRUD |
| Experiment API | ✅ Complete | `backend/internal/handlers/experiment/` | Full CRUD + analyze endpoints |
| Reference Data API | ✅ Complete | `backend/internal/handlers/filterpaper/`, `mineralprofile/` | Filter papers CRUD + mineral profiles |
| Effect Mappings API | ✅ Complete | `backend/internal/handlers/effectmapping/` | CRUD + relevance matching |
| Recommendations API | ✅ Complete | `backend/internal/handlers/recommendation/` | Gap-based matching, dismiss/undo, try mapping |

**Backend Progress: 7/7 components (100%)**

### Frontend

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Authentication | ✅ Complete | `frontend/src/features/auth/` | Login/signup flow |
| Coffee Library | ✅ Complete | `frontend/src/features/library/` | List + CRUD forms |
| Brew Tracking | ✅ Complete | `frontend/src/features/experiments/` | Entry forms |
| Reference Data | ✅ Complete | `frontend/src/features/reference-data/` | Filter papers CRUD + mineral profiles |
| Brew Optimization | ✅ Complete | `frontend/src/features/experiments/components/optimization/` | Target inputs, radar chart, gap analysis |
| Experiment Review | 🚧 Not Started | — | List, compare, analyze views, correlation matrix |
| Effect Mappings UI | ✅ Complete | `frontend/src/features/effect-mappings/` | CRUD + filtering |
| Recommendations | ✅ Complete | `frontend/src/features/experiments/components/optimization/` | Gap-based suggestions, dismiss/try actions |

**Frontend Progress: 7/8 components (88%)**

### Overall Project Progress

| Layer | Complete | Total | Progress |
|-------|----------|-------|----------|
| Specs | 8 | 8 | 100% |
| Backend | 7 | 7 | 100% |
| Frontend | 7 | 8 | 88% |
| **Total** | **22** | **23** | **96%** |
