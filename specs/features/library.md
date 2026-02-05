# Library

## Overview

The Library is a unified page where users manage their coffee beans, filter papers, and view mineral profiles. It uses a tabbed interface to organize these related but distinct reference data types.

**Tabs:**
- **Coffees** - Bean inventory metadata (CRUD)
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
│ [Coffees] [Filter Papers] [Mineral Profiles]                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ [Tab content based on selection]                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Tab behavior:**
- URL updates to reflect active tab: `/library`, `/library/filter-papers`, `/library/mineral-profiles`
- Default tab is Coffees
- Active tab indicated with teal underline/background

---

## Entity: Coffee

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| roaster | string | Yes | Company/person who roasted the beans |
| name | string | Yes | Coffee name (farm, blend name, etc.) |
| country | string | No | Origin country |
| region | string | No | Specific region within country |
| process | string | No | Processing method (Washed, Natural, Honey, etc.) |
| roast_level | enum | No | Light, Medium, Medium-Dark, Dark |
| tasting_notes | string | No | Roaster's described flavor notes |
| roast_date | date | No | Date the coffee was roasted |
| purchase_date | date | No | Date acquired |
| notes | text | No | Personal notes about this coffee |
| archived_at | timestamp | No | When coffee was archived (hidden but still usable) |
| deleted_at | timestamp | No | Soft delete timestamp (preserved for experiment history) |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

### Validation Rules

1. `roaster` and `name` together should be treated as a logical identifier (not enforced unique, but used for display)
2. `roast_date` cannot be in the future
3. `purchase_date` cannot be before `roast_date` if both are provided
4. `process` is free-text but UI may suggest common values:
   - Washed
   - Natural
   - Honey (Yellow, Red, Black)
   - Anaerobic
   - Carbonic Maceration
   - Wet-hulled

### Relationships

- **One-to-Many with Experiment**: A coffee can have many experiments; each experiment references exactly one coffee
- Deleting a coffee uses soft delete (`deleted_at` timestamp) to preserve experiment history
- Archived coffees are hidden from lists but can still be referenced in new experiments

### Computed Properties

- **Days Off Roast**: `current_date - roast_date` (if roast_date provided)
- **Experiment Count**: Number of experiments using this coffee
- **Last Brewed**: Most recent experiment date for this coffee

### Database Schema

```sql
CREATE TABLE coffees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    roaster VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    region VARCHAR(255),
    process VARCHAR(100),
    roast_level VARCHAR(50),
    tasting_notes TEXT,
    roast_date DATE,
    purchase_date DATE,
    notes TEXT,
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coffees_user_id ON coffees(user_id);
CREATE INDEX idx_coffees_roaster ON coffees(roaster);
CREATE INDEX idx_coffees_roast_date ON coffees(roast_date);
CREATE INDEX idx_coffees_deleted_at ON coffees(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_coffees_archived_at ON coffees(archived_at) WHERE archived_at IS NULL;
```

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

### Coffees API

#### List Coffees
```
GET /api/v1/coffees
```

**Query Parameters:**
- `page`, `per_page`: Pagination
- `sort`: Field name, `-` prefix for descending (default: `-created_at`)
- `roaster`: Filter by roaster name
- `country`: Filter by country
- `process`: Filter by process
- `search`: Search roaster and name fields
- `include_archived`: `true` to include archived coffees (default: `false`)
- `include_deleted`: `true` to include soft-deleted coffees (default: `false`)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "roaster": "Cata Coffee",
      "name": "Kiamaina",
      "country": "Kenya",
      "region": "Nyeri",
      "process": "Washed",
      "roast_level": "Light",
      "tasting_notes": "Apricot Nectar, Lemon Sorbet, Raw Honey",
      "roast_date": "2025-11-19",
      "purchase_date": "2025-11-22",
      "notes": "Best around 3-4 weeks off roast",
      "days_off_roast": 61,
      "experiment_count": 8,
      "last_brewed": "2026-01-19T10:30:00Z",
      "created_at": "2025-11-22T15:00:00Z",
      "updated_at": "2025-11-22T15:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 12,
    "total_pages": 1
  }
}
```

#### Create Coffee
```
POST /api/v1/coffees
```

**Request:**
```json
{
  "roaster": "Cata Coffee",
  "name": "Kiamaina",
  "country": "Kenya",
  "region": "Nyeri",
  "process": "Washed",
  "roast_level": "Light",
  "tasting_notes": "Apricot Nectar, Lemon Sorbet, Raw Honey",
  "roast_date": "2025-11-19",
  "purchase_date": "2025-11-22",
  "notes": "Best around 3-4 weeks off roast"
}
```

**Response:** `201 Created` with coffee object

#### Get Coffee
```
GET /api/v1/coffees/:id
```

**Response:** Coffee object with computed properties

#### Update Coffee
```
PUT /api/v1/coffees/:id
```

**Request:** Full coffee object (partial updates via PATCH)

**Response:** Updated coffee object

#### Archive Coffee
```
POST /api/v1/coffees/:id/archive
```

**Behavior:**
- Sets `archived_at` timestamp
- Coffee hidden from default list but still usable in experiments
- Returns `200 OK` with updated coffee object

#### Unarchive Coffee
```
POST /api/v1/coffees/:id/unarchive
```

**Behavior:**
- Clears `archived_at` timestamp
- Coffee visible in default list again
- Returns `200 OK` with updated coffee object

#### Delete Coffee
```
DELETE /api/v1/coffees/:id
```

**Behavior:**
- Soft delete: sets `deleted_at` timestamp
- Experiments retain their FK reference to the deleted coffee
- Deleted coffees excluded from lists and dropdowns by default
- Returns `204 No Content`

#### Get Coffee Experiments
```
GET /api/v1/coffees/:id/experiments
```

Returns paginated experiments for this coffee. Supports same filters as `/api/v1/experiments`.

#### Autocomplete Suggestions
```
GET /api/v1/coffees/suggestions?field=roaster&q=cat
```

Returns distinct values for autocomplete:
```json
{
  "items": ["Cata Coffee", "Catalyst Roasters"]
}
```

Supported fields: `roaster`, `country`, `process`

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

### Coffees Tab

#### Coffee List View

**Display Columns:**
- Roaster
- Name
- Country
- Process
- Roast Date
- Days Since Roast (calculated)
- Experiment Count
- Last Brewed

**Interactions:**
- Click row → Coffee detail view
- Sort by any column
- Filter by roaster, country, process
- Search by name/roaster
- "Add Coffee" button

**Empty State:**
- Message: "No coffees in your library yet"
- Prominent "Add Your First Coffee" button

#### Add/Edit Coffee Form

**Layout:**
```
┌─────────────────────────────────────────┐
│ Add Coffee                              │
├─────────────────────────────────────────┤
│ Roaster*         [________________]     │
│ Name*            [________________]     │
│                                         │
│ ─── Origin ───                          │
│ Country          [________________]     │
│ Region           [________________]     │
│                                         │
│ ─── Details ───                         │
│ Process          [________________]     │
│ Roast Level      [Light ▼        ]     │
│ Tasting Notes    [________________]     │
│                                         │
│ ─── Dates ───                           │
│ Roast Date       [____/____/____]       │
│ Purchase Date    [____/____/____]       │
│                                         │
│ ─── Notes ───                           │
│ Personal Notes   [                ]     │
│                  [                ]     │
│                                         │
│         [Cancel]  [Save Coffee]         │
└─────────────────────────────────────────┘
```

**Field Behavior:**
- Roaster: Autocomplete from existing roasters
- Country: Autocomplete from existing + common list
- Process: Autocomplete from existing + common list
- Roast Level: Dropdown (Light, Medium, Medium-Dark, Dark)
- Roast Date: Date picker, defaults empty
- Tasting Notes: Multi-line text (roaster's notes)
- Personal Notes: Multi-line text (user's notes)

#### Coffee Detail View

**Layout:**
```
┌─────────────────────────────────────────┐
│ ← Back to Library                       │
│                                         │
│ Kiamaina                           [Edit]│
│ Cata Coffee · Kenya · Washed            │
│                                         │
│ ┌─────────┬─────────┬─────────────────┐ │
│ │ Roasted │ Days    │ Experiments     │ │
│ │ Nov 19  │ 61      │ 8               │ │
│ └─────────┴─────────┴─────────────────┘ │
│                                         │
│ Tasting Notes                           │
│ Apricot Nectar, Lemon Sorbet, Raw Honey │
│                                         │
│ My Notes                                │
│ Best around 3-4 weeks off roast...      │
│                                         │
│ ─── Brew History ───                    │
│ [Experiment list filtered to this coffee]│
│                                         │
└─────────────────────────────────────────┘
```

**Brew History Section:**
- Shows experiments for this coffee
- Sortable by date, score
- Quick stats: average score, best score, total brews

#### Archive/Unarchive Coffee

**Archive Flow:**
- Archive action available on coffee row and detail view
- Archived coffees hidden from main list by default
- "Show archived" toggle reveals archived coffees with visual indicator
- Archived coffees can still be selected for new experiments

**Unarchive Flow:**
- Unarchive action available on archived coffee rows
- Removes from archive, coffee appears in main list again

#### Delete Coffee

**Rules:**
- Soft delete preserves experiment history
- Deleted coffees hidden from all lists and dropdowns
- Experiments retain reference to deleted coffee for historical accuracy

**Confirmation Dialog:**
```
┌─────────────────────────────────────────┐
│ Delete Coffee?                          │
├─────────────────────────────────────────┤
│ Delete "Kiamaina" by Cata Coffee?       │
│                                         │
│ This coffee will be hidden but your     │
│ experiment history will be preserved.   │
│                                         │
│         [Cancel]  [Delete Coffee]       │
└─────────────────────────────────────────┘
```

### Filter Papers Tab

```
┌─────────────────────────────────────────────────────────────┐
│ Library                                                     │
├─────────────────────────────────────────────────────────────┤
│ [Coffees] [Filter Papers] [Mineral Profiles]                │
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
│ [Coffees] [Filter Papers] [Mineral Profiles]                │
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

Three tabs in one page because:
- All are reference data used when creating experiments
- Reduces navigation complexity
- Single "Library" nav item instead of multiple
- Clear mental model: "my brewing reference data"

### Roaster as Free Text

Roaster is stored as free-text rather than a separate entity because:
- Users may have one-off coffees from various sources
- Autocomplete from existing values provides sufficient convenience
- Avoids complexity of managing a roaster entity

### Process as Free Text with Suggestions

Processing methods evolve and vary regionally. Free text with UI suggestions balances:
- Flexibility to enter any process type
- Consistency through autocomplete of previously used values

### No Bag/Inventory Tracking

The system tracks coffee metadata, not inventory levels. Users manually decide when a coffee is "finished" by simply not creating new experiments for it.

### Card Grid as Primary View

Coffee library uses a card grid layout because:
- Better visual scanning for coffee metadata
- Cards accommodate varying content lengths (tasting notes, etc.)
- More engaging visual presentation for a collection
- Natural grouping of related information per coffee

### Autocomplete over Dropdowns

Free text with autocomplete for roaster, country, process:
- Users have varied coffees from many sources
- Predefined lists would be incomplete
- Autocomplete provides consistency benefits
- No admin needed to maintain lists

### Days Off Roast Prominence

Days off roast shown prominently because:
- Critical variable for coffee freshness
- Helps users choose which coffee to brew
- Changes daily—needs to be calculated

### Personal Notes Separate from Tasting Notes

Two note fields because:
- Tasting notes = roaster's description (reference)
- Personal notes = user's observations (evolving)
- Common pattern: roaster says X, user experiences Y

### Archive and Soft Delete

Coffees support both archive and soft delete:
- **Archive** (`archived_at`): Hidden from default list but still usable for experiments. Use for finished bags you might buy again.
- **Soft Delete** (`deleted_at`): Hidden everywhere, preserved for experiment history. Use for coffees you won't use again.

Filter papers use soft delete only (no archive) since they're simpler reference data.

### Read-Only Mineral Profiles

Mineral profiles are system-defined because:
- Chemical compositions are fixed by product
- Prevents user error in data entry
- Can add more profiles in future updates

---

## Open Questions

1. **Archiving**: Should coffees be archivable/hideable when finished, or just filtered by recency?
2. **Image Upload**: Would coffee bag photos be valuable? Adds storage complexity.
3. **Duplicate Detection**: Warn if adding coffee with same roaster+name?
4. **Import**: Support importing coffee list from CSV?
5. **Freshness Indicator**: Visual indicator for coffees past peak freshness?
6. **Filter Paper Metadata**: Add fields like flow rate, material type for correlation analysis?
7. **User Mineral Profiles**: Allow user-created profiles in the future?
8. **Bulk Import**: Import filter papers from CSV or common presets?
