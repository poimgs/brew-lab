# API Design

## Context

This specification defines the REST API conventions and endpoint patterns for the Coffee Experiment Tracker backend. The API serves a React SPA frontend and follows standard RESTful practices.

## Requirements

### General Conventions

#### Base URL
```
/api/v1
```

#### Content Type
- Request: `application/json`
- Response: `application/json`

#### Authentication
All endpoints except `/auth/*` require a valid JWT in the Authorization header:
```
Authorization: Bearer <token>
```

#### HTTP Methods

| Method | Usage |
|--------|-------|
| GET | Retrieve resource(s) |
| POST | Create new resource |
| PUT | Replace entire resource |
| PATCH | Partial update |
| DELETE | Remove resource |

#### Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (with body) |
| 201 | Created |
| 204 | Success (no body) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (valid token, insufficient permissions) |
| 404 | Not found |
| 409 | Conflict (e.g., duplicate) |
| 422 | Unprocessable entity (semantic error) |
| 500 | Server error |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "coffee_weight",
        "message": "must be positive number"
      }
    ]
  }
}
```

### Pagination

List endpoints support pagination via query parameters:

```
GET /api/v1/experiments?page=1&per_page=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### Filtering and Sorting

```
GET /api/v1/experiments?coffee_id=uuid&sort=-brew_date&filter[score_gte]=7
```

- `sort`: Field name, prefix `-` for descending
- `filter[field_operator]`: Filter conditions

### Endpoints

#### Authentication

```
POST   /api/v1/auth/register    # Create account
POST   /api/v1/auth/login       # Get JWT token
POST   /api/v1/auth/logout      # Invalidate token
POST   /api/v1/auth/refresh     # Refresh JWT token
GET    /api/v1/auth/me          # Current user info
```

#### Coffees

```
GET    /api/v1/coffees              # List coffees
POST   /api/v1/coffees              # Create coffee
GET    /api/v1/coffees/:id          # Get coffee
PUT    /api/v1/coffees/:id          # Update coffee
DELETE /api/v1/coffees/:id          # Delete coffee
GET    /api/v1/coffees/:id/experiments  # Experiments for coffee
```

#### Experiments

```
GET    /api/v1/experiments          # List experiments
POST   /api/v1/experiments          # Create experiment
GET    /api/v1/experiments/:id      # Get experiment
PUT    /api/v1/experiments/:id      # Update experiment
DELETE /api/v1/experiments/:id      # Delete experiment
POST   /api/v1/experiments/:id/tags # Add tags to experiment
DELETE /api/v1/experiments/:id/tags/:tag_id  # Remove tag
```

#### Issue Tags

```
GET    /api/v1/tags                 # List all tags
POST   /api/v1/tags                 # Create custom tag
GET    /api/v1/tags/:id             # Get tag
PUT    /api/v1/tags/:id             # Update custom tag
DELETE /api/v1/tags/:id             # Delete custom tag
```

#### Rules

```
GET    /api/v1/rules                # List rules
POST   /api/v1/rules                # Create rule
GET    /api/v1/rules/:id            # Get rule
PUT    /api/v1/rules/:id            # Update rule
DELETE /api/v1/rules/:id            # Delete rule
POST   /api/v1/rules/match          # Find matching rules for conditions
```

#### Mineral Profiles

```
GET    /api/v1/mineral-profiles     # List profiles
POST   /api/v1/mineral-profiles     # Create profile
GET    /api/v1/mineral-profiles/:id # Get profile
PUT    /api/v1/mineral-profiles/:id # Update profile
DELETE /api/v1/mineral-profiles/:id # Delete profile
```

#### User Defaults

```
GET    /api/v1/defaults             # Get all defaults
PUT    /api/v1/defaults             # Update defaults (bulk)
DELETE /api/v1/defaults/:field      # Remove default for field
```

#### Analysis

```
GET    /api/v1/analysis/correlations    # Get correlation data
POST   /api/v1/analysis/recommendations # Get recommendations for issues
```

### Request/Response Examples

#### Create Experiment

Request:
```json
POST /api/v1/experiments
{
  "coffee_id": "uuid",
  "coffee_weight": 15.0,
  "water_weight": 225.0,
  "grind_size": "8 clicks",
  "water_temperature": 90.0,
  "filter_type": "Hario V60",
  "bloom_water": 45.0,
  "bloom_time": 75,
  "pour_1": "90g, circular motion",
  "pour_2": "90g, circular motion",
  "overall_notes": "Bright acidity, lemon notes",
  "overall_score": 7,
  "issue_tags": ["too_acidic"]
}
```

Response:
```json
{
  "data": {
    "id": "uuid",
    "coffee_id": "uuid",
    "coffee": {
      "id": "uuid",
      "roaster": "Cata Coffee",
      "name": "Kiamaina",
      "roast_date": "2025-11-19"
    },
    "brew_date": "2026-01-19T10:30:00Z",
    "days_off_roast": 61,
    "coffee_weight": 15.0,
    ...
  }
}
```

#### Get Recommendations

Request:
```json
POST /api/v1/analysis/recommendations
{
  "issue_tags": ["too_acidic", "lacks_body"],
  "experiment_id": "uuid"  // optional, for context
}
```

Response:
```json
{
  "data": {
    "recommendations": [
      {
        "rule_id": "uuid",
        "rule_name": "Reduce Acidity",
        "suggestion": "Lower water temperature by 2-3°C",
        "confidence": "high",
        "matched_conditions": ["too_acidic"],
        "expected_effects": [
          {"variable": "acidity_intensity", "direction": "decrease"}
        ]
      }
    ]
  }
}
```

## Design Decisions

### REST over GraphQL

REST chosen because:
- Simpler implementation
- Well-understood patterns
- Sufficient for this use case
- Easier caching
- No query complexity concerns

### Nested Resources Sparingly

Limited nesting (e.g., `/coffees/:id/experiments`) for:
- Logical relationships
- Convenience queries
- Flat primary resources for most operations

### Include Related Data

Experiment responses include nested coffee data:
- Reduces round trips
- Common access pattern
- Optional expansion via `?include=` parameter

### Bulk Operations Limited

Bulk create/update not initially supported:
- Single-experiment entry is primary use case
- Keeps API simple
- Can add later if needed

### Computed Fields in Response

API returns computed fields:
- `days_off_roast` calculated from dates
- Avoids client calculation
- Consistent computation

## Open Questions

1. **Rate Limiting**: Needed for single-user? Probably not initially.
2. **WebSocket**: Real-time updates for timer feature?
3. **Export Endpoint**: `/api/v1/export/csv` for data export?
