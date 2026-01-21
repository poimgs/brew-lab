# Specs Index

## Project Overview

**Coffee Tracker** is a personal brewing experiment tracker.

### Goals
- **Experiment Tracking**: Capture brewing parameters and taste outcomes
- **Coffee Library**: Maintain bean metadata independent from experiments
- **Pattern Discovery**: Reveal relationships between variables and outcomes
- **Knowledge Codification**: Record brewing rules and heuristics
- **Actionable Recommendations**: Suggest improvements based on issues and rules

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
- Manual rules only: No automated inference; users define rules explicitly

### Data Model
```
Coffee (metadata) 1:N ← Experiment (brew record)
                              ↓ N:M
                        Issue Tags
                              ↓ matched against
                            Rules
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

| Spec | Status | Purpose |
|------|--------|---------|
| [authentication.md](features/authentication.md) | Complete | User entity, login/signup, JWT, session handling |
| [coffee-library.md](features/coffee-library.md) | Frontend Complete | Coffee entity + CRUD API + library UI |
| [brew-tracking.md](features/brew-tracking.md) | Not Started | Experiment entity + logging API + entry forms |
| [experiment-review.md](features/experiment-review.md) | Not Started | List/detail views, comparison, filtering |
| [rules-engine.md](features/rules-engine.md) | Not Started | Rules entity + issue tags + rule management UI |
| [recommendations.md](features/recommendations.md) | Not Started | Rule matching, suggestion display, try/dismiss flow |
| [correlations.md](features/correlations.md) | Not Started | Correlation analysis + matrix/heatmap visualization |
| [mineral-profiles.md](features/mineral-profiles.md) | Not Started | Mineral profile reference data |

---

## Reading Guide

**For implementing a feature:**
1. Read the relevant foundations specs (api-conventions, database-conventions, design-system)
2. Read the feature spec for full context (entity, API, UI in one place)
3. Implement

**For AI agents:**
- Each feature spec is self-contained
- No need to read domain/ or system/ directories (they no longer exist)
- Foundations provide shared conventions referenced by all features

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Authentication | Complete | `backend/internal/services/auth/` |
| Database Schema | Not Started | Migrations pending |
| Coffee API | Not Started | — |
| Experiment API | Not Started | — |
| Rules API | Not Started | — |
| Frontend Coffee Library | Complete | `frontend/src/features/library/` |
| Frontend Brew Tracking | Not Started | — |
| Frontend Review | Not Started | — |
| Frontend Rules | Not Started | — |
| Frontend Recommendations | Not Started | — |
| Frontend Correlations | Not Started | — |
