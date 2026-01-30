# API Conventions

## Context

This specification defines the REST API conventions for the Coffee Experiment Tracker backend. The API serves a React SPA frontend and follows standard RESTful practices.

All feature-specific endpoints are documented in their respective feature specs.

## General Conventions

### Base URL
```
/api/v1
```

### Content Type
- Request: `application/json`
- Response: `application/json`

### Authentication
All endpoints except `/auth/*` require a valid JWT in the Authorization header:
```
Authorization: Bearer <token>
```

### HTTP Methods

| Method | Usage |
|--------|-------|
| GET | Retrieve resource(s) |
| POST | Create new resource |
| PUT | Update resource (partial updates allowed) |
| PATCH | Partial update |
| DELETE | Remove resource |

### Status Codes

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

## Error Response Format

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

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request body failed validation |
| `NOT_FOUND` | Resource does not exist |
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Authenticated but not permitted |
| `CONFLICT` | Resource already exists or conflict |
| `INTERNAL_ERROR` | Server-side error |

## Pagination

List endpoints support pagination via query parameters:

```
GET /api/v1/experiments?page=1&per_page=20
```

Response includes pagination metadata:
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### Defaults
- `page`: 1
- `per_page`: 20 (max: 100)

## Filtering and Sorting

```
GET /api/v1/experiments?coffee_id=uuid&sort=-brew_date&score_gte=7
```

### Sorting
- `sort`: Field name, prefix `-` for descending
- Multiple sort fields: `sort=field1,-field2`

### Filter Operators
| Suffix | Operator | Example |
|--------|----------|---------|
| (none) | equals | `status=active` |
| `_gt` | greater than | `score_gt=5` |
| `_gte` | greater or equal | `score_gte=7` |
| `_lt` | less than | `score_lt=5` |
| `_lte` | less or equal | `score_lte=3` |
| `_contains` | contains substring | `name_contains=Kenya` |

## Response Format

### Success (single resource)
Returns the resource object directly:
```json
{
  "id": "uuid",
  "field": "value"
}
```

### Success (list)
Returns items array with pagination:
```json
{
  "items": [...],
  "pagination": {...}
}
```

### Error
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [...]
  }
}
```

## Nested Resources

Limited nesting for logical relationships:
```
GET /api/v1/coffees/:id/experiments  # Experiments for a coffee
```

Primary resources are flat for most operations.

## Related Data Inclusion

Responses can include related data to reduce round trips:

```
GET /api/v1/experiments?include=coffee
```

Experiment responses include nested coffee data by default for common access patterns.

## Computed Properties

API returns computed properties in responses:
- `days_off_roast`: Calculated from coffee roast_date and experiment brew_date
- `experiment_count`: Count of experiments for a coffee

These are read-only and not accepted in request bodies.

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
