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

## Domain
Core data model: entities, structures, business rules.

| Spec | Status | Code | Purpose |
|------|--------|------|---------|
| [coffee.md](domain/coffee.md) | Not Started | — | Coffee entity fields, validation, relationship to experiments |
| [experiment.md](domain/experiment.md) | Not Started | — | Experiment entity: all variables (pre-brew, brew, post-brew, outcomes), required vs optional |
| [rules.md](domain/rules.md) | Not Started | — | Rule structure: conditions (input variables), effects (outcome changes), matching logic |
| [issue-tags.md](domain/issue-tags.md) | Not Started | — | Predefined issue tags, custom tags, mapping to outcome variables |
| [mineral-profiles.md](domain/mineral-profiles.md) | Not Started | — | Mineral modifier profiles (Catalyst, Affinity), chemical properties |

## Features
User-facing functionality specifications.

| Spec | Status | Code | Purpose |
|------|--------|------|---------|
| [coffee-library.md](features/coffee-library.md) | Not Started | — | Add/edit coffees, view brew history per coffee |
| [brew-tracking.md](features/brew-tracking.md) | Not Started | — | Entry flow, optional field expansion, defaults system |
| [experiment-review.md](features/experiment-review.md) | Not Started | — | List view, detail view, comparison, filtering/sorting |
| [rules-engine.md](features/rules-engine.md) | Not Started | — | Rule CRUD, condition builder UI, effect specification |
| [recommendations.md](features/recommendations.md) | Not Started | — | Issue tagging flow, rule matching, displaying suggestions |
| [correlations.md](features/correlations.md) | Not Started | — | Correlation calculation, table view, heatmap visualization |

## System
Cross-cutting technical concerns: API design, infrastructure, deployment.

| Spec | Status | Code | Purpose |
|------|--------|------|---------|
| [database.md](system/database.md) | Partial (~15%) | — | Schema design decisions, field types, migrations approach |
| [api-design.md](system/api-design.md) | Partial (~10%) | — | REST conventions, endpoint patterns, request/response formats |
| [authentication.md](system/authentication.md) | Complete (~90%) | `backend/internal/services/auth/` | Email/password auth, JWT, session handling, single-user lock |
| [design-system.md](system/design-system.md) | Partial (~70%) | `frontend/src/` | Colors, typography, spacing, components, accessibility |
