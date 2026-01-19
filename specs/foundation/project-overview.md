# Project Overview

## Context

This specification establishes the foundational context for the Coffee Experiment Tracker—a web application designed to help coffee enthusiasts systematically track, analyze, and improve their pour-over brewing experiments.

The application addresses the challenge of optimizing coffee brewing, which involves many interdependent variables (grind size, water temperature, brew time, water chemistry, etc.) that affect taste outcomes in complex ways. By capturing experiment data and surfacing patterns, users can make informed adjustments rather than relying on guesswork.

## Requirements

### Goals

1. **Experiment Tracking**: Capture detailed brewing parameters and taste outcomes with minimal friction
2. **Coffee Library**: Maintain metadata about coffee beans separate from individual brews
3. **Pattern Discovery**: Reveal relationships between brewing variables and outcomes through correlation analysis
4. **Knowledge Codification**: Allow users to record brewing rules/heuristics they discover
5. **Actionable Recommendations**: Suggest improvements based on identified issues and stored rules

### Non-Goals

- Machine learning or AI-based predictions (rules are manual only)
- Social features or sharing between users
- E-commerce or inventory management
- Mobile-native application (web-first, responsive design)

### User Profile

- Single user per instance (personal tool)
- Coffee hobbyist with interest in systematic improvement
- Comfortable with technical detail (TDS, extraction yield, mineral chemistry)

## Design Decisions

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React + TypeScript | Type safety, component reusability, rich ecosystem |
| Backend | Go | Fast compilation, strong typing, simple deployment, good for API servers |
| Database | PostgreSQL (cloud-hosted) | Relational model suits structured experiment data; cloud hosting for reliability |
| Authentication | Email/password + JWT | Simple, sufficient for single-user; no OAuth complexity needed |

### Architecture Principles

1. **Separation of Concerns**: Coffee metadata exists independently from brew experiments; brews reference coffees
2. **Progressive Detail**: Only coffee reference and overall notes are required; all other fields optional and expandable
3. **Calculated Fields**: Derive values where possible (e.g., days off roast from coffee's roast date and brew date)
4. **User Defaults**: Allow setting defaults for commonly-used optional fields to reduce entry friction
5. **Manual Rules Only**: No automated inference; users explicitly define condition→effect rules

### Data Model Overview

```
┌─────────────┐       ┌─────────────────┐
│   Coffee    │◄──────│   Experiment    │
│  (metadata) │ 1:N   │  (brew record)  │
└─────────────┘       └────────┬────────┘
                               │
                               │ N:M
                               ▼
                      ┌─────────────────┐
                      │   Issue Tags    │
                      └────────┬────────┘
                               │
                               │ matched against
                               ▼
                      ┌─────────────────┐
                      │     Rules       │
                      │ (condition →    │
                      │  effect)        │
                      └─────────────────┘
```

### API Design Philosophy

- RESTful conventions
- JSON request/response bodies
- Consistent error format
- Pagination for list endpoints
- Filter/sort via query parameters

### Frontend Architecture

- Component-based UI with React
- Form state management for experiment entry
- Client-side routing (SPA)
- Responsive design for tablet use during brewing

## Open Questions

1. **Deployment Target**: Specific cloud provider and hosting approach TBD
2. **Backup Strategy**: How to handle database backups and data export
3. **Future Multi-User**: Architecture should not preclude eventual multi-user support, but not designed for it initially
