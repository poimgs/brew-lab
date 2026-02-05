# Library

## Overview

The Library is a unified page where users manage their filter papers and view mineral profiles. It uses a tabbed interface to organize these related reference data types.

**Tabs:**
- **Filter Papers** - User-managed filter paper types (CRUD)
- **Mineral Profiles** - Predefined mineral concentrate profiles (read-only)

**Route:** `/library`

**Dependencies:** authentication

---

## User Interface

### Tabbed Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Library                                                             │
├─────────────────────────────────────────────────────────────────────┤
│ [Filter Papers] [Mineral Profiles]                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ [Tab content based on selection]                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Tab behavior:**
- URL updates to reflect active tab: `/library`, `/library/mineral-profiles`
- Default tab is Filter Papers
- Active tab indicated with teal underline/background

---

## Entity: Filter Paper

User-managed reference data for filter paper types used in experiments.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| user_id | UUID | Auto | Owner of this filter paper |
| name | string | Yes | Filter name (e.g., "Abaca", "Tabbed") |
| brand | string | No | Manufacturer (e.g., "Cafec", "Hario") |
| notes | text | No | User notes about characteristics |
| deleted_at | timestamp | No | Soft delete timestamp (preserved for experiment history) |
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

## Entity: Mineral Profile

Predefined read-only profiles for mineral water additives. Users cannot create, edit, or delete these.

### Fields

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| id | UUID | — | Unique identifier |
| name | string | — | Profile name (e.g., "Catalyst", "Affinity") |
| brand | string | — | Product brand |
| hardness | decimal | ppm | Total hardness (as CaCO3) |
| alkalinity | decimal | ppm | Total alkalinity (as CaCO3) |
| magnesium | decimal | mg/L | Mg concentration |
| calcium | decimal | mg/L | Ca concentration |
| potassium | decimal | mg/L | K concentration |
| sodium | decimal | mg/L | Na concentration |
| chloride | decimal | mg/L | Cl concentration |
| sulfate | decimal | mg/L | SO4 concentration |
| bicarbonate | decimal | mg/L | HCO3 concentration |
| typical_dose | string | — | Usage instructions (e.g., "2 drops per cup") |
| taste_effects | text | — | Expected taste impact |

### Predefined Profiles

**Catalyst** (Valence Coffee Studio)
| Property | Value |
|----------|-------|
| Hardness | 70.9 ppm |
| Alkalinity | 15 ppm |
| Magnesium | 12.2 mg/L |
| Calcium | 8.2 mg/L |
| Potassium | 14.3 mg/L |
| Sodium | 3.9 mg/L |
| Chloride | 58.7 mg/L |
| Bicarbonate | 18.3 mg/L |
| Typical Dose | 2 drops per cup |
| Taste Effects | Increased body, enhanced sweetness |

**Affinity** (Valence Coffee Studio)
| Property | Value |
|----------|-------|
| Hardness | 50.45 ppm |
| Alkalinity | 12.18 ppm |
| Magnesium | 12.25 mg/L |
| Sodium | 16.51 mg/L |
| Chloride | 46.55 mg/L |
| Sulfate | 8.15 mg/L |
| Bicarbonate | 14.86 mg/L |
| Typical Dose | 2 drops per cup |
| Taste Effects | Clarity, balanced acidity |

### Database Schema

```sql
CREATE TABLE mineral_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    hardness DECIMAL(6,2),
    alkalinity DECIMAL(6,2),
    magnesium DECIMAL(6,2),
    calcium DECIMAL(6,2),
    potassium DECIMAL(6,2),
    sodium DECIMAL(6,2),
    chloride DECIMAL(6,2),
    sulfate DECIMAL(6,2),
    bicarbonate DECIMAL(6,2),
    typical_dose VARCHAR(100),
    taste_effects TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed predefined profiles
INSERT INTO mineral_profiles (name, brand, hardness, alkalinity, magnesium, calcium, potassium, sodium, chloride, sulfate, bicarbonate, typical_dose, taste_effects)
VALUES
('Catalyst', 'Valence Coffee Studio', 70.9, 15.0, 12.2, 8.2, 14.3, 3.9, 58.7, NULL, 18.3, '2 drops per cup', 'Increased body, enhanced sweetness'),
('Affinity', 'Valence Coffee Studio', 50.45, 12.18, 12.25, NULL, NULL, 16.51, 46.55, 8.15, 14.86, '2 drops per cup', 'Clarity, balanced acidity');
```

### Integration with Experiments

Mineral additions remain as a string field (no FK) because:
- Users enter dose + timing info with the profile name
- Value like "Catalyst, 2 drops post-brew" is natural
- Keeps backward compatibility

The UI provides dropdowns to assist selection, but the field stores the combined description.

---

## API Endpoints

### Filter Papers API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/filter-papers` | List user's filter papers |
| POST | `/api/v1/filter-papers` | Create new filter paper |
| GET | `/api/v1/filter-papers/:id` | Get filter paper details |
| PUT | `/api/v1/filter-papers/:id` | Update filter paper |
| DELETE | `/api/v1/filter-papers/:id` | Delete filter paper |

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
- Experiments retain their FK reference to the deleted filter paper
- Deleted filter papers are excluded from dropdowns but visible in experiment history

### Mineral Profiles API (Read-only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/mineral-profiles` | List all predefined profiles |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Catalyst",
      "brand": "Valence Coffee Studio",
      "hardness": 70.9,
      "alkalinity": 15.0,
      "magnesium": 12.2,
      "calcium": 8.2,
      "potassium": 14.3,
      "sodium": 3.9,
      "chloride": 58.7,
      "bicarbonate": 18.3,
      "typical_dose": "2 drops per cup",
      "taste_effects": "Increased body, enhanced sweetness"
    }
  ]
}
```

---

## User Interface Details

### Filter Papers Tab

```
┌─────────────────────────────────────────────────────────────┐
│ Library                                                     │
├─────────────────────────────────────────────────────────────┤
│ [Filter Papers] [Mineral Profiles]                          │
├─────────────────────────────────────────────────────────────┤
│                                                [Add Filter] │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Abaca                                                   │ │
│ │ Cafec                                                   │ │
│ │ Good for light roasts, increases clarity                │ │
│ │                               [Edit] [Delete]           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Tabbed                                                  │ │
│ │ Hario                                                   │ │
│ │ Standard V60 filter                                     │ │
│ │                               [Edit] [Delete]           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ No filter papers yet? [Add your first filter]               │
└─────────────────────────────────────────────────────────────┘
```

#### Add/Edit Filter Paper Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Add Filter Paper                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Name*           [________________________]                  │
│ Brand           [________________________]                  │
│                                                             │
│ Notes                                                       │
│ [                                                       ]   │
│ [                                                       ]   │
│                                                             │
│                          [Cancel]  [Save]                   │
└─────────────────────────────────────────────────────────────┘
```

### Mineral Profiles Tab

```
┌─────────────────────────────────────────────────────────────┐
│ Library                                                     │
├─────────────────────────────────────────────────────────────┤
│ [Filter Papers] [Mineral Profiles]                          │
├─────────────────────────────────────────────────────────────┤
│ Predefined profiles (read-only)                             │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Catalyst                              [View Details]    │ │
│ │ Valence Coffee Studio                                   │ │
│ │ Hardness: 70.9 ppm · Mg: 12.2 mg/L                      │ │
│ │ → Increased body, enhanced sweetness                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Affinity                              [View Details]    │ │
│ │ Valence Coffee Studio                                   │ │
│ │ Hardness: 50.45 ppm · Mg: 12.25 mg/L                    │ │
│ │ → Clarity, balanced acidity                             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Mineral Profile Detail Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Catalyst                                                    │
│ Valence Coffee Studio                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ─── Chemical Composition ───                                │
│                                                             │
│ Hardness        70.9 ppm                                    │
│ Alkalinity      15 ppm                                      │
│ Magnesium       12.2 mg/L                                   │
│ Calcium         8.2 mg/L                                    │
│ Potassium       14.3 mg/L                                   │
│ Sodium          3.9 mg/L                                    │
│ Chloride        58.7 mg/L                                   │
│ Bicarbonate     18.3 mg/L                                   │
│                                                             │
│ ─── Usage ───                                               │
│                                                             │
│ Typical Dose: 2 drops per cup                               │
│ Effects: Increased body, enhanced sweetness                 │
│                                                             │
│                                            [Close]          │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Decisions

### Tabbed Interface

Two tabs in one page because:
- Both are reference data used when creating experiments
- Reduces navigation complexity
- Single "Library" nav item
- Clear mental model: "my brewing reference data"

### Read-Only Mineral Profiles

Mineral profiles are system-defined because:
- Chemical compositions are fixed by product
- Prevents user error in data entry
- Can add more profiles in future updates

---

## Open Questions

1. **Filter Paper Metadata**: Add fields like flow rate, material type for correlation analysis?
2. **User Mineral Profiles**: Allow user-created profiles in the future?
3. **Bulk Import**: Import filter papers from CSV or common presets?
