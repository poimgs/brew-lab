# User Preferences

## Overview

User Preferences contains user-configurable settings that affect experiment entry. Currently this includes Brew Defaults—values that pre-populate when creating new experiments, organized into sections matching the experiment wizard steps.

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
│ │ ─── Pre-Brew Defaults ───                                       ││
│ │ Coffee Weight [15    ] g  [×]                                    ││
│ │ Water Weight  [250   ] g  [×]                                    ││
│ │ Ratio         [15    ]    [×]                                    ││
│ │ Grind Size    [3.5   ]    [×]                                    ││
│ │ Temperature   [93    ] °C [×]                                    ││
│ │ Filter Paper  [Abaca (Cafec) ▼] [×]                              ││
│ │                                                                  ││
│ │ ─── Brew Defaults ───                                            ││
│ │ Bloom Water   [45    ] g  [×]                                    ││
│ │ Bloom Time    [45    ] s  [×]                                    ││
│ │ Pour Defaults [Configure...]  [×]                                ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Section Organization:**
- **Pre-Brew Defaults**: Fields matching the Pre-Brew wizard step — coffee_weight, water_weight, ratio, grind_size, water_temperature, filter_paper_id
- **Brew Defaults**: Fields matching the Brew wizard step — bloom_water, bloom_time, pour_defaults

**Field Behavior:**
- Each field has a clear button [×] to remove that default
- Empty fields mean no default (field left blank in new experiments)
- Save button persists all changes
- Filter Paper dropdown shows user's filter papers from Library
- Ratio and Grind Size are numeric inputs (not text fields)

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
| ratio | decimal | — | Default ratio (e.g., 15 for 1:15) |
| grind_size | decimal | — | Default grind setting (numeric) |
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
  "coffee_weight": "15",
  "ratio": "15",
  "grind_size": "3.5",
  "water_temperature": "90",
  "filter_paper_id": "uuid",
  "bloom_water": "45",
  "bloom_time": "75"
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
  "ratio": "15"
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

### Section Organization Matching Wizard Steps

Defaults are organized into Pre-Brew and Brew sections because:
- Mirrors the experiment wizard step structure
- Users mentally map defaults to where they're used
- Easier to find and configure relevant fields

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

### Numeric Types for Ratio and Grind Size

Ratio and grind_size use numeric input types (not text) because:
- The experiment wizard treats these as numeric values
- Enables proper validation (positive decimals)
- Consistent with how they're stored and used in experiments

---

## Open Questions

1. **Additional Preferences**: What other user preferences might be needed? (e.g., theme, units)
2. **Modal vs Page**: Should preferences be a modal overlay or full page?
3. **Quick Access**: Add shortcut to set current experiment values as defaults?
