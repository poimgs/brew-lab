# User Preferences

## Overview

User Preferences contains user-configurable settings that affect experiment entry. Currently this includes Brew Defaults—values that pre-populate when creating new experiments.

**Access:** Via user menu dropdown (not main navigation)

**Route:** `/preferences` (or modal)

**Dependencies:** authentication

---

## User Interface

### Access Pattern

User Preferences is accessed via the user menu dropdown in the header, not through main navigation.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Coffee Tracker     [Home] [Experiments] [Library]        [User ▼]  │
│                                                    ┌──────────────┐│
│                                                    │ Preferences  ││
│                                                    │ Logout       ││
│                                                    └──────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Preferences Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ Preferences                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─ Brew Defaults ────────────────────────────────────────────[Save]┐│
│ │ These values will be pre-filled when creating a new experiment.  ││
│ │                                                                  ││
│ │ Coffee Weight [15    ] g  [×]                                    ││
│ │ Water Weight  [250   ] g  [×]                                    ││
│ │ Temperature   [93    ] °C [×]                                    ││
│ │ Grind Size    [24 clicks ] [×]                                   ││
│ │ Filter Paper  [Abaca (Cafec) ▼] [×]                              ││
│ │ Bloom Water   [45    ] g  [×]                                    ││
│ │ Bloom Time    [45    ] s  [×]                                    ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Field Behavior:**
- Each field has a clear button [×] to remove that default
- Empty fields mean no default (field left blank in new experiments)
- Save button persists all changes
- Filter Paper dropdown shows user's filter papers from Library

### Default Behavior in Experiment Entry

When creating a new experiment:
1. Defaults pre-populate fields when expanding sections
2. User can override any default per experiment
3. Defaults are per-user
4. Clear button removes individual defaults

---

## Entity: User Defaults

### Storage Model

Defaults are stored as key-value pairs per user, allowing flexibility in which fields have defaults.

### Supported Default Fields

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| coffee_weight | decimal | grams | Default dose |
| water_weight | decimal | grams | Default water amount |
| ratio | string | — | Default ratio (e.g., "1:15") |
| grind_size | string | — | Default grind setting |
| water_temperature | decimal | °C | Default water temperature |
| filter_paper_id | UUID | — | Default filter paper |
| bloom_water | decimal | grams | Default bloom water |
| bloom_time | integer | seconds | Default bloom duration |

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
  "data": {
    "coffee_weight": "15",
    "ratio": "1:15",
    "grind_size": "8 clicks",
    "water_temperature": "90",
    "filter_paper_id": "uuid",
    "bloom_water": "45",
    "bloom_time": "75"
  }
}
```

### Update Defaults
```
PUT /api/v1/defaults
```

**Request:**
```json
{
  "coffee_weight": "15",
  "ratio": "1:15"
}
```

Updates only the fields provided. Existing defaults for other fields are preserved.

**Response:** Updated defaults object

### Delete a Single Default
```
DELETE /api/v1/defaults/:field
```

Removes a single default value by field name.

**Response:** `204 No Content`

---

## Design Decisions

### User Menu Access

Preferences accessed via user menu dropdown because:
- Not a frequently accessed page (set once, use many times)
- Keeps main navigation focused on primary workflows
- Common pattern for user-specific settings
- Reduces nav bar clutter

### Key-Value Storage

Defaults stored as key-value pairs because:
- Flexible—easy to add new defaultable fields
- Sparse storage—only stores set defaults
- Simple schema evolution

### Per-Field Clear

Individual clear buttons per field because:
- Users may want some defaults but not others
- More granular control than "clear all"
- Clear visual indication of which fields have defaults

### No Default for Coffee Selection

Coffee is not defaultable because:
- Users typically rotate through different coffees
- Defaulting to a specific coffee would often be wrong
- Coffee selection is the first, intentional step in logging

---

## Open Questions

1. **Additional Preferences**: What other user preferences might be needed? (e.g., theme, units)
2. **Modal vs Page**: Should preferences be a modal overlay or full page?
3. **Quick Access**: Add shortcut to set current experiment values as defaults?
