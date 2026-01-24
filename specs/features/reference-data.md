# Reference Data

## Overview

Reference data consists of reusable brewing inputs that users configure once and select during experiment entry. This reduces repetitive typing and enables consistent data for analysis.

**Includes:**
- **Filter Papers** - User-managed list of filter paper types (CRUD)
- **Mineral Profiles** - Predefined mineral concentrate profiles (read-only)

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_filter_papers_user_id ON filter_papers(user_id);
CREATE UNIQUE INDEX idx_filter_papers_user_name ON filter_papers(user_id, name);
```

### Integration with Experiments

Experiments reference filter papers via foreign key:

```sql
-- Add to experiments table
ALTER TABLE experiments
    ADD COLUMN filter_paper_id UUID REFERENCES filter_papers(id) ON DELETE SET NULL;

-- Migration: Convert existing filter_type strings to filter_paper_id
-- For each unique filter_type value per user:
-- 1. Create a filter_paper record
-- 2. Update experiments to reference the new filter_paper_id
-- 3. Drop the old filter_type column

ALTER TABLE experiments DROP COLUMN filter_type;
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

**Catalyst** (Lotus Coffee Products)
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

**Affinity** (Lotus Coffee Products)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed predefined profiles
INSERT INTO mineral_profiles (name, brand, hardness, alkalinity, magnesium, calcium, potassium, sodium, chloride, sulfate, bicarbonate, typical_dose, taste_effects)
VALUES
('Catalyst', 'Lotus Coffee Products', 70.9, 15.0, 12.2, 8.2, 14.3, 3.9, 58.7, NULL, 18.3, '2 drops per cup', 'Increased body, enhanced sweetness'),
('Affinity', 'Lotus Coffee Products', 50.45, 12.18, 12.25, NULL, NULL, 16.51, 46.55, 8.15, 14.86, '2 drops per cup', 'Clarity, balanced acidity');
```

### Integration with Experiments

Mineral additions remain as a string field (no FK) because:
- Users enter dose + timing info with the profile name
- Value like "Catalyst, 2 drops post-brew" is natural
- Keeps backward compatibility

The UI provides dropdowns to assist selection, but the field stores the combined description.

---

## API Endpoints

### Filter Papers (User-managed CRUD)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/filter-papers` | List user's filter papers |
| POST | `/api/v1/filter-papers` | Create new filter paper |
| GET | `/api/v1/filter-papers/:id` | Get filter paper details |
| PUT | `/api/v1/filter-papers/:id` | Update filter paper |
| DELETE | `/api/v1/filter-papers/:id` | Delete filter paper |

**List Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Abaca",
      "brand": "Cafec",
      "notes": "Good for light roasts, increases clarity",
      "created_at": "2026-01-20T10:00:00Z",
      "updated_at": "2026-01-20T10:00:00Z"
    }
  ]
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
- If filter paper is referenced by experiments, set `filter_paper_id = NULL` on those experiments
- Delete the filter paper record

### Mineral Profiles (Read-only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/mineral-profiles` | List all predefined profiles |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Catalyst",
      "brand": "Lotus Coffee Products",
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

## User Interface

### Reference Data Page

Accessed from Settings menu.

```
┌─────────────────────────────────────────────────────────────┐
│ Reference Data                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ Filter Papers ─────────────────────────────────────────┐ │
│ │                                            [Add Filter] │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Abaca                                               │ │ │
│ │ │ Cafec                                               │ │ │
│ │ │ Good for light roasts, increases clarity            │ │ │
│ │ │                               [Edit] [Delete]       │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Tabbed                                              │ │ │
│ │ │ Hario                                               │ │ │
│ │ │ Standard V60 filter                                 │ │ │
│ │ │                               [Edit] [Delete]       │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ No filter papers yet? [Add your first filter]           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ Mineral Profiles ──────────────────────────────────────┐ │
│ │ Predefined profiles (read-only)                         │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Catalyst                              [View Details] │ │ │
│ │ │ Lotus Coffee Products                               │ │ │
│ │ │ Hardness: 70.9 ppm · Mg: 12.2 mg/L                  │ │ │
│ │ │ → Increased body, enhanced sweetness                │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Affinity                              [View Details] │ │ │
│ │ │ Lotus Coffee Products                               │ │ │
│ │ │ Hardness: 50.45 ppm · Mg: 12.25 mg/L                │ │ │
│ │ │ → Clarity, balanced acidity                         │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Add/Edit Filter Paper Modal

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

### Mineral Profile Detail Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Catalyst                                                    │
│ Lotus Coffee Products                                       │
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

### Experiment Form Integration

**Filter Type Field (uses filter_paper_id FK):**
```
│ Filter           [Select filter...          ▼]   [+]       │
│                  ┌──────────────────────────────┐          │
│                  │ Abaca (Cafec)                │          │
│                  │ Tabbed (Hario)               │          │
│                  │ TH-3 (Cafec)                 │          │
│                  │ ────────────────────         │          │
│                  │ + Add new filter             │          │
│                  └──────────────────────────────┘          │
```
- Selecting a filter sets `filter_paper_id` on the experiment
- "+ Add new filter" opens the add modal, then selects the new filter
- Display shows "Name (Brand)" format

**Mineral Additions Field (string-based):**
```
│ Mineral Additions                                          │
│ Profile:  [Select profile...          ▼]                   │
│           ┌──────────────────────────────┐                 │
│           │ Catalyst                     │                 │
│           │ Affinity                     │                 │
│           │ None                         │                 │
│           └──────────────────────────────┘                 │
│ Amount:   [2 drops                       ]                 │
│ Timing:   (○) Pre-brew  (●) Post-brew                      │
```
- Combined into string like "Catalyst, 2 drops post-brew"
- Stored in `mineral_additions` field

---

## Design Decisions

### Foreign Key for Filter Papers

Using `filter_paper_id` FK instead of string because:
- Enables accurate analytics (no string matching issues)
- User can update filter paper name without breaking links
- Cleaner data model for future features
- Worth the migration effort for data integrity

### String for Mineral Additions

Keeping as string because:
- Includes dose and timing info alongside profile name
- More natural: "Catalyst, 2 drops post-brew"
- Less critical for analytics than filter type
- Simpler implementation

### User-Owned Filter Papers

Each user manages their own filter papers:
- Personal preferences and observations
- No shared/system filters needed
- Simple access control (user_id scoping)

### Read-Only Mineral Profiles

Profiles are predefined and immutable:
- Chemical data is standardized (manufacturer specs)
- Users don't need to modify chemistry values
- Simplifies data model
- Can add user profiles later if needed

---

## Migration Strategy

### Existing Data Migration

```sql
-- Step 1: Create filter_papers table
CREATE TABLE filter_papers (...);

-- Step 2: Create unique filter papers from existing experiment data
INSERT INTO filter_papers (user_id, name, brand, notes)
SELECT DISTINCT
    e.user_id,
    e.filter_type,
    NULL,  -- no brand in old data
    NULL   -- no notes in old data
FROM experiments e
WHERE e.filter_type IS NOT NULL AND e.filter_type != '';

-- Step 3: Add filter_paper_id column to experiments
ALTER TABLE experiments ADD COLUMN filter_paper_id UUID REFERENCES filter_papers(id) ON DELETE SET NULL;

-- Step 4: Update experiments to reference filter_papers
UPDATE experiments e
SET filter_paper_id = fp.id
FROM filter_papers fp
WHERE fp.user_id = e.user_id AND fp.name = e.filter_type;

-- Step 5: Drop old filter_type column
ALTER TABLE experiments DROP COLUMN filter_type;
```

---

## Open Questions

1. **Filter Paper Metadata**: Add fields like flow rate, material type for correlation analysis?
2. **User Mineral Profiles**: Allow user-created profiles in the future?
3. **Bulk Import**: Import filter papers from CSV or common presets?
