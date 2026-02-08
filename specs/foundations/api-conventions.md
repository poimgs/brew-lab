# API Conventions

## Context

This specification defines the REST API conventions for the Coffee Tracker backend. The API serves a React SPA frontend and follows standard RESTful practices.

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
| PUT | Full resource replacement |
| DELETE | Remove resource |

All update operations use PUT with full resource replacement. The client must send the complete object; omitted optional fields are set to their zero/null values. There is no PATCH endpoint.

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
GET /api/v1/coffees/:id/brews?page=1&per_page=20
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
GET /api/v1/coffees/:id/brews?sort=-brew_date&score_gte=7
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

Resources with strong parent-child relationships use nested endpoints:
```
GET /api/v1/coffees/:id/brews      # Brews for a specific coffee
GET /api/v1/coffees/:id/reference   # Reference data for a coffee
```

Brews are accessible via both the nested coffee endpoint and a top-level endpoint:
- `GET /api/v1/coffees/:id/brews` — coffee-scoped (coffee detail page)
- `GET /api/v1/brews` — global, paginated with filters (global Brews page, see [brews.md](../features/brews.md))
- `GET /api/v1/brews/recent` — recent brews widget (Home page, see below)

## Recent Brews Endpoint

```
GET /api/v1/brews/recent?limit=5
```

Returns the most recent brews across all coffees for the authenticated user. Used by the Home page recent brews widget.

**Query Parameters:**
- `limit`: Number of brews to return (default: 5, max: 20)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "coffee_id": "uuid",
      "coffee_name": "Kiamaina",
      "coffee_roaster": "Cata Coffee",
      "brew_date": "2026-01-19",
      "overall_score": 7,
      "days_off_roast": 61,
      "ratio": 15.0,
      "water_temperature": 96.0,
      "filter_paper": {
        "id": "uuid",
        "name": "Abaca",
        "brand": "Cafec"
      }
    }
  ]
}
```

**Note:** All brew responses include `coffee_name`, `coffee_roaster`, and a nested `filter_paper` object (`{ id, name, brand }`). Soft-deleted filter papers are still included for historical accuracy.

**Sorting:** `brew_date DESC` (most recent first, not configurable).

## Computed Properties

API returns computed properties in responses:
- `days_off_roast`: Stored on brew at save time (computed from coffee's `roast_date` and user-provided `brew_date`)
- `brew_count`: Count of brews for a coffee
- `water_weight`: `coffee_weight × ratio`. Not stored in the database. Null until both inputs are set.
- `extraction_yield`: `(coffee_ml × tds) / coffee_weight`. Not stored in the database. Null until all three inputs are set. Included in all brew GET responses.

These are read-only and not accepted in request bodies.

**Note:** `brew_date` is user-provided (optional in POST, defaults to today if omitted, editable on PUT). It is not a computed property — it is accepted in request bodies.

## Validation

Field validation (value ranges, format checks, future date prevention) is enforced **client-side only**. The backend trusts validated input from the frontend. The backend enforces structural constraints (required fields, foreign key references, unique constraints) but does not duplicate business-rule validation such as "temperature must be 0-100" or "roast_date cannot be in the future."

## Design Decisions

### REST over GraphQL

REST chosen because:
- Simpler implementation
- Well-understood patterns
- Sufficient for this use case
- Easier caching
- No query complexity concerns

### Nested Resources for Parent-Child Relationships

Nested endpoints (e.g., `/coffees/:id/brews`) for strong parent-child relationships:
- Brews belong to a coffee — accessible via nested endpoint for coffee-scoped views
- A top-level `GET /api/v1/brews` endpoint also exists for cross-coffee views (global Brews page)
- Reference data is a per-coffee resource
- Keeps the API surface clean while supporting both scoped and global access patterns

### Bulk Operations Limited

Bulk create/update not initially supported:
- Single-brew entry is primary use case
- Keeps API simple
- Can add later if needed
