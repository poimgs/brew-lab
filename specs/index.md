# Specs Index

## Foundation
Project-level specifications: goals, technology choices, conventions.

| Spec | Code | Purpose |
|------|------|---------|
| [project-overview.md](foundation/project-overview.md) | — | Goals, tech stack, high-level architecture, design principles |

## Domain
Core data model: entities, structures, business rules.

| Spec | Code | Purpose |
|------|------|---------|
| [coffee.md](domain/coffee.md) | — | Coffee entity fields, validation, relationship to experiments |
| [experiment.md](domain/experiment.md) | — | Experiment entity: all variables (pre-brew, brew, post-brew, outcomes), required vs optional |
| [rules.md](domain/rules.md) | — | Rule structure: conditions (input variables), effects (outcome changes), matching logic |
| [issue-tags.md](domain/issue-tags.md) | — | Predefined issue tags, custom tags, mapping to outcome variables |
| [mineral-profiles.md](domain/mineral-profiles.md) | — | Mineral modifier profiles (Catalyst, Affinity), chemical properties |

## Features
User-facing functionality specifications.

| Spec | Code | Purpose |
|------|------|---------|
| [coffee-library.md](features/coffee-library.md) | — | Add/edit coffees, view brew history per coffee |
| [brew-tracking.md](features/brew-tracking.md) | — | Entry flow, optional field expansion, defaults system |
| [experiment-review.md](features/experiment-review.md) | — | List view, detail view, comparison, filtering/sorting |
| [rules-engine.md](features/rules-engine.md) | — | Rule CRUD, condition builder UI, effect specification |
| [recommendations.md](features/recommendations.md) | — | Issue tagging flow, rule matching, displaying suggestions |
| [correlations.md](features/correlations.md) | — | Correlation calculation, table view, heatmap visualization |

## System
Cross-cutting technical concerns: API design, infrastructure, deployment.

| Spec | Code | Purpose |
|------|------|---------|
| [database.md](system/database.md) | — | Schema design decisions, field types, migrations approach |
| [api-design.md](system/api-design.md) | — | REST conventions, endpoint patterns, request/response formats |
| [authentication.md](system/authentication.md) | — | Email/password auth, JWT, session handling, single-user lock |
