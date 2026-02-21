# Preferences

## Overview

The Preferences page lets users configure default brewing parameters. These defaults are the lowest-priority auto-fill source when creating a new brew — they apply only when no starred reference or latest brew exists for the selected coffee.

Route: `/preferences` (accessed via user menu -> Preferences)

---

## Entity: User Defaults

Defaults are stored as key-value pairs per user, allowing flexibility in which fields have defaults.

### Supported Default Fields

These correspond to the fields marked **Defaultable: Yes** in [brew-tracking.md](brew-tracking.md).

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| coffee_weight | decimal | grams | Default dose |
| ratio | decimal | — | Default ratio (e.g., 15 for 1:15) |
| grind_size | decimal | — | Default grind setting (numeric) |
| water_temperature | decimal | C | Default water temperature |
| filter_paper_id | UUID | — | Default filter paper |
| dripper_id | UUID | — | Default dripper |

### Database Schema

```sql
CREATE TABLE user_defaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    default_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, field_name)
);

CREATE INDEX idx_user_defaults_user_id ON user_defaults(user_id);
```

---

## API Endpoints

### Get Defaults
```
GET /api/v1/defaults
```

**Response:**
```json
{
  "coffee_weight": 15,
  "ratio": 15,
  "grind_size": 3.5,
  "water_temperature": 90,
  "filter_paper_id": "uuid-string",
  "dripper_id": "uuid-string"
}
```

Note: Default values use the same JSON types as their corresponding brew fields (numbers for numeric fields, strings for UUIDs).

### Update Defaults
```
PUT /api/v1/defaults
```

**Request:**
```json
{
  "coffee_weight": 15,
  "ratio": 15,
  "grind_size": 3.5,
  "water_temperature": 90,
  "filter_paper_id": "uuid-string",
  "dripper_id": "uuid-string",
  "pour_defaults": [
    { "pour_number": 1, "water_amount": 45.0, "pour_style": "center", "wait_time": 30 },
    { "pour_number": 2, "water_amount": 90.0, "pour_style": "circular" }
  ]
}
```

Full replacement: the client sends the complete defaults object. Omitted fields have their defaults removed. The `pour_defaults` array is replaced in full — the backend deletes existing pour defaults and inserts the new set.

**Response:** Updated defaults object

### Delete a Single Default
```
DELETE /api/v1/defaults/:field
```

Removes a single default value by field name.

**Response:** `204 No Content`

---

## Pour Defaults

Users can configure default pour templates that are applied when creating new brews.

**Storage:**
- Pour defaults are stored in a dedicated `user_pour_defaults` table mirroring the `brew_pours` structure
- Each entry has `pour_number`, `water_amount`, `pour_style`, and `wait_time`
- When creating a new brew, the pours field is pre-populated with these defaults (if no reference brew exists)
- Users can modify, add, or remove pours as needed for each brew

**Database Schema:**
```sql
CREATE TABLE user_pour_defaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pour_number INTEGER NOT NULL,
    water_amount DECIMAL(6,1),
    pour_style VARCHAR(50),
    wait_time INTEGER,
    UNIQUE(user_id, pour_number)
);

CREATE INDEX idx_user_pour_defaults_user_id ON user_pour_defaults(user_id);
```

**API:**
- Pour defaults are included in `GET /api/v1/defaults` and `PUT /api/v1/defaults` responses as a `pour_defaults` array
- `PUT /api/v1/defaults` replaces the entire `pour_defaults` array. Send the full array; the backend deletes existing pours and inserts the new set.
- Example response:
```json
{
  "coffee_weight": 15,
  "ratio": 15,
  "pour_defaults": [
    { "pour_number": 1, "water_amount": 45.0, "pour_style": "center", "wait_time": 30 },
    { "pour_number": 2, "water_amount": 90.0, "pour_style": "circular" }
  ]
}
```

---

## Preferences Page UI

```
+-----------------------------------------------------------------------+
| Preferences                                                           |
+-----------------------------------------------------------------------+
|                                                                       |
| +- Brew Defaults ------------------------------------------[Save]---+|
| | These values are used when no reference brew exists for a coffee.  ||
| |                                                                    ||
| | --- Setup Defaults ---                                             ||
| | Coffee Weight [15    ] g  [x]                                      ||
| | Ratio         [15    ]    [x]                                      ||
| | Grind Size    [3.5   ]    [x]                                      ||
| | Temperature   [93    ] C  [x]                                      ||
| | Filter Paper  [Abaca (Cafec) v] [x]                                ||
| | Dripper       [V60 02 (Hario) v] [x]                               ||
| |                                                                    ||
| | --- Pour Defaults ---                                              ||
| | #1  [45   ] g  [center v]  wait [30] s  [x]                       ||
| | #2  [90   ] g  [circular v]  [x]                                   ||
| | [+ Add Pour]                                                       ||
| +--------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

### Section Organization

- **Setup Defaults**: coffee_weight, ratio, grind_size, water_temperature, filter_paper_id, dripper_id
- **Pour Defaults**: pour templates with pour_number, water_amount, pour_style, wait_time

### Explicit Note

"These values are used when no reference brew exists for a coffee."

### Field Behavior

- Each field has a clear button [x] to remove that default
- Empty fields mean no default (field left blank in new brews)
- Save button persists all changes
- Filter Paper dropdown shows user's filter papers from Equipment
- Ratio and Grind Size are numeric inputs (not text fields)

---

## Design Decisions

### Key-Value Storage for Defaults

Defaults stored as key-value pairs because:
- Flexible — easy to add new defaultable fields
- Sparse storage — only stores set defaults
- Simple schema evolution

### Defaults Separate from Brew-Tracking Spec

Defaults are extracted into their own spec because:
- The entity, schema, and API are self-contained
- Brew-tracking fields annotated with `Defaultable: Yes` serve as the source of truth for which fields support defaults
- Preferences page UI is unrelated to the brew form UI
- Keeps brew-tracking.md focused on brew logging
