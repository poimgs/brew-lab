# Equipment

## Overview

The Equipment page is where users manage their filter papers. It provides a simple CRUD interface for reference data used when logging brews.

**Route:** `/equipment`

**Dependencies:** authentication

---

## Entity: Filter Paper

User-managed reference data for filter paper types used in brews.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| user_id | UUID | Auto | Owner of this filter paper |
| name | string | Yes | Filter name (e.g., "Abaca", "Tabbed") |
| brand | string | No | Manufacturer (e.g., "Cafec", "Hario") |
| notes | text | No | User notes about characteristics |
| deleted_at | timestamp | No | Soft delete timestamp (preserved for brew history) |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

### Database Schema

```sql
CREATE TABLE filter_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    notes TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_filter_papers_user_id ON filter_papers(user_id);
CREATE UNIQUE INDEX idx_filter_papers_user_name ON filter_papers(user_id, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_filter_papers_deleted_at ON filter_papers(deleted_at) WHERE deleted_at IS NULL;
```

---

## API Endpoints

### Filter Papers API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/filter-papers` | List user's filter papers |
| POST | `/api/v1/filter-papers` | Create new filter paper |
| GET | `/api/v1/filter-papers/:id` | Get filter paper details |
| PUT | `/api/v1/filter-papers/:id` | Update filter paper (full replacement) |
| DELETE | `/api/v1/filter-papers/:id` | Delete filter paper |

**Note:** `GET /api/v1/filter-papers` excludes soft-deleted papers by default. Deleted papers are only visible when viewing an existing brew that references them.

**Query Parameters:**
- `page`, `per_page`: Pagination (default: page=1, per_page=20)
- `sort`: Field name, `-` prefix for descending (default: `-created_at`)

**List Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Abaca",
      "brand": "Cafec",
      "notes": "Good for light roasts, increases clarity",
      "created_at": "2026-01-20T10:00:00Z",
      "updated_at": "2026-01-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

**Create/Update Request:**
```json
{
  "name": "Abaca",
  "brand": "Cafec",
  "notes": "Good for light roasts, increases clarity"
}
```

**Delete Behavior:**
- Soft delete: sets `deleted_at` timestamp
- Brews retain their FK reference to the deleted filter paper
- Deleted filter papers are excluded from dropdowns but visible in brew history

---

## User Interface

### Equipment Page

```
+-------------------------------------------------------------+
| Equipment                                                    |
+-------------------------------------------------------------+
|                                          [Add Filter Paper]  |
|                                                              |
| +----------------------------------------------------------+|
| | Abaca                                                     ||
| | Cafec                                                     ||
| | Good for light roasts, increases clarity                  ||
| |                               [Edit] [Delete]             ||
| +----------------------------------------------------------+|
|                                                              |
| +----------------------------------------------------------+|
| | Tabbed                                                    ||
| | Hario                                                     ||
| | Standard V60 filter                                       ||
| |                               [Edit] [Delete]             ||
| +----------------------------------------------------------+|
|                                                              |
| No filter papers yet? [Add your first filter]                |
+-------------------------------------------------------------+
```

### Add/Edit Filter Paper Modal

```
+-------------------------------------------------------------+
| Add Filter Paper                                             |
+-------------------------------------------------------------+
|                                                              |
| Name*           [________________________]                   |
| Brand           [________________________]                   |
|                                                              |
| Notes                                                        |
| [                                                        ]   |
| [                                                        ]   |
|                                                              |
|                          [Cancel]  [Save]                    |
+-------------------------------------------------------------+
```

---

## Design Decisions

### Single Entity Page

The Equipment page currently manages only filter papers. The page is designed to be extensible — future equipment entities (e.g., grinders, brewers) can be added as additional sections or tabs without changing the page structure.

### Soft Delete for Filter Papers

Filter papers use soft delete because:
- Historical brews reference filter papers by FK
- Deleted papers must remain visible in existing brew views
- Users can re-create a paper with the same name after deletion (partial unique index)

### No Mineral Profiles

Mineral profiles were removed from the app because:
- Added complexity without proportional value
- Users can note mineral profile in technique_notes or improvement_notes
- May be reconsidered in a future version
