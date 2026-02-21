# Specs Index

## Project Overview

**Coffee Tracker** is a personal brewing tracker.

### Goals

- **Brew Tracking**: Capture brewing parameters and taste outcomes
- **Coffee Library**: Maintain bean metadata independent from brews

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
- Reference fallback: Starred reference > latest brew > user defaults > blank

### Equipment Assumption

The app assumes a single equipment setup: Fellow Ode 2 grinder and V60 brewer. Grind settings are numeric values specific to this grinder. Future versions may add equipment tracking if needed.

### Data Model

```
Coffee (metadata) 1:N <- Brew (brew record)
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

| Spec                                                           | Purpose                                             |
| -------------------------------------------------------------- | --------------------------------------------------- |
| [api-conventions.md](foundations/api-conventions.md)           | REST patterns, errors, pagination, filtering        |
| [database-conventions.md](foundations/database-conventions.md) | Schema patterns, types, migrations                  |
| [deployment.md](foundations/deployment.md)                     | VPS + Docker deployment setup                       |
| [design-system.md](foundations/design-system.md)               | UI patterns, colors, typography, components         |
| [pwa.md](foundations/pwa.md)                                   | Progressive Web App setup, service worker, manifest |

---

## Features

Self-contained feature specifications. Each includes entity definitions, API endpoints, and UI specs.

### Feature Details

| Spec                                            | Dependencies                  | Purpose                                                |
| ----------------------------------------------- | ----------------------------- | ------------------------------------------------------ |
| [authentication.md](features/authentication.md) | —                             | User entity, login/signup, JWT, session handling       |
| [home.md](features/home.md)                     | authentication, brew-tracking | Home page with recent brews + "Log a Brew" quick-start |
| [brews.md](features/brews.md)                   | authentication, coffees, brew-tracking | Global brew history with filters + pagination  |
| [brew-comparison.md](features/brew-comparison.md) | authentication, coffees, brew-tracking | Side-by-side brew comparison (same coffee, up to 4) |
| [coffees.md](features/coffees.md)               | authentication                | Coffee beans + reference brew                          |
| [setup.md](features/setup.md)                   | authentication                | Equipment management (filter papers)                   |
| [brew-tracking.md](features/brew-tracking.md)   | authentication, coffees       | Brew entity + logging form + reference sidebar         |
| [preferences.md](features/preferences.md)       | authentication, brew-tracking | User defaults entity + API + Preferences page UI       |
| [share-link.md](features/share-link.md)         | authentication, coffees, brew-tracking | Share coffee collection via public token URL |

### Dependency Graph

```
authentication (core)
    |
    +-- coffees (bean metadata + reference brew)
    |       |
    |       +-- brew-tracking (brew logging + form + sidebar)
    |               |
    |               +-- home (recent brews + quick-start)
    |               |
    |               +-- brews (global brew history + filters)
    |               |
    |               +-- brew-comparison (side-by-side brew diff)
    |               |
    |               +-- preferences (user defaults + Preferences page)
    |               |
    |               +-- share-link (public coffee collection sharing)
    |
    +-- setup (equipment — filter papers)
```

### Navigation Structure

| Item      | Route        | Feature                                        |
| --------- | ------------ | ---------------------------------------------- |
| Home      | `/`          | home (recent brews, "Log a Brew" button)       |
| Brews     | `/brews`     | brews (global brew history, filters, sorting)  |
| Coffees   | `/coffees`   | coffees (coffee grid, add/edit/archive/detail) |
| Equipment | `/equipment` | setup (filter papers)                          |

**User Menu:**
| Item | Route | Feature |
|------|-------|---------|
| Preferences | `/preferences` | preferences (user defaults) |
| Logout | — | authentication (logout action) |

## Reading Guide

**For implementing a feature:**

1. Read the relevant foundations specs (api-conventions, database-conventions, design-system)
2. Read the feature spec for full context (entity, API, UI in one place)
3. Check dependencies and ensure prerequisite features are complete
4. Implement
