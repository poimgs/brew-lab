# Coffees

## Overview

The Coffees feature manages coffee bean metadata as a first-class entity, independent from experiments. It provides:
- Coffee inventory management (CRUD)
- **Reference Brew** tracking - mark an experiment as your reference brew for each coffee
- **Target Goals** - set desired outcome targets to track what you're aiming for

**Route:** `/` (landing page)

**Dependencies:** authentication

---

## Entity: Coffee

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| roaster | string | Yes | Company/person who roasted the beans |
| name | string | Yes | Coffee name (blend name, varietal, etc.) |
| country | string | No | Origin country |
| farm | string | No | Farm or estate name |
| process | string | No | Processing method (Washed, Natural, Honey, etc.) |
| roast_level | enum | No | Light, Medium, Medium-Dark, Dark |
| tasting_notes | string | No | Roaster's described flavor notes |
| roast_date | date | No | Date the coffee was roasted |
| notes | text | No | Personal notes about this coffee |
| best_experiment_id | UUID | No | FK to experiment marked as "reference" (API field name unchanged) |
| archived_at | timestamp | No | When coffee was archived (hidden but still usable) |
| deleted_at | timestamp | No | Soft delete timestamp (preserved for experiment history) |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

Note: The API field `best_experiment_id` is displayed as "Reference Brew" in the UI. The field name is unchanged for backwards compatibility.

### Validation Rules

1. `roaster` and `name` together should be treated as a logical identifier (not enforced unique, but used for display)
2. `roast_date` cannot be in the future
3. `best_experiment_id` must reference an experiment belonging to this coffee
4. `process` is free-text but UI may suggest common values:
   - Washed
   - Natural
   - Honey (Yellow, Red, Black)
   - Anaerobic
   - Carbonic Maceration
   - Wet-hulled

### Relationships

- **One-to-Many with Experiment**: A coffee can have many experiments; each experiment references exactly one coffee
- **One-to-One with Coffee Goals**: A coffee can have one set of target goals
- **Reference Experiment**: Optional FK to the experiment marked as the user's reference brew
- Deleting a coffee uses soft delete (`deleted_at` timestamp) to preserve experiment history
- Archived coffees are hidden from lists but can still be referenced in new experiments

### Computed Properties

- **Days Off Roast**: `current_date - roast_date` (if roast_date provided)
- **Experiment Count**: Number of experiments using this coffee (computed via subquery: `SELECT COUNT(*) FROM experiments WHERE coffee_id = c.id`)
- **Last Brewed**: Most recent experiment date for this coffee
- **Effective Reference Experiment**: `best_experiment_id` if set, otherwise latest experiment by brew_date

### Database Schema

```sql
CREATE TABLE coffees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    roaster VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    farm VARCHAR(255),
    process VARCHAR(100),
    roast_level VARCHAR(50),
    tasting_notes TEXT,
    roast_date DATE,
    notes TEXT,
    best_experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL,
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

## Entity: Coffee Goals

Target outcomes for a coffee. One set of goals per coffee. Fields align with experiment quantitative and sensory outcomes.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| coffee_id | UUID | Yes | FK to coffee (unique per coffee) |
| coffee_ml | decimal | No | Target brewed coffee volume (ml) |
| tds | decimal | No | Target TDS |
| extraction_yield | decimal | No | Target extraction % |
| aroma_intensity | int 1-10 | No | Target aroma |
| sweetness_intensity | int 1-10 | No | Target sweetness |
| body_intensity | int 1-10 | No | Target body |
| flavor_intensity | int 1-10 | No | Target flavor |
| brightness_intensity | int 1-10 | No | Target brightness (perceived acidity quality) |
| cleanliness_intensity | int 1-10 | No | Target cleanliness (clarity of flavors) |
| complexity_intensity | int 1-10 | No | Target complexity (layered flavors) |
| balance_intensity | int 1-10 | No | Target balance (harmony of attributes) |
| aftertaste_intensity | int 1-10 | No | Target aftertaste intensity |
| overall_score | int 1-10 | No | Target overall |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

**Total: 13 target fields** — 3 quantitative (coffee_ml, tds, extraction_yield) + 9 sensory intensities + overall_score

### Database Schema

```sql
CREATE TABLE coffee_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coffee_id UUID NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
    coffee_ml DECIMAL(6,2),
    tds DECIMAL(4,2),
    extraction_yield DECIMAL(5,2),
    aroma_intensity INTEGER CHECK (aroma_intensity BETWEEN 1 AND 10),
    sweetness_intensity INTEGER CHECK (sweetness_intensity BETWEEN 1 AND 10),
    body_intensity INTEGER CHECK (body_intensity BETWEEN 1 AND 10),
    flavor_intensity INTEGER CHECK (flavor_intensity BETWEEN 1 AND 10),
    brightness_intensity INTEGER CHECK (brightness_intensity BETWEEN 1 AND 10),
    cleanliness_intensity INTEGER CHECK (cleanliness_intensity BETWEEN 1 AND 10),
    complexity_intensity INTEGER CHECK (complexity_intensity BETWEEN 1 AND 10),
    balance_intensity INTEGER CHECK (balance_intensity BETWEEN 1 AND 10),
    aftertaste_intensity INTEGER CHECK (aftertaste_intensity BETWEEN 1 AND 10),
    overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coffee_id)
);

CREATE INDEX idx_coffee_goals_coffee_id ON coffee_goals(coffee_id);
```

---

## API Endpoints

### Coffees API

#### List Coffees
```
GET /api/v1/coffees
```

**Query Parameters:**
- `page`, `per_page`: Pagination
- `roaster`: Filter by roaster name
- `country`: Filter by country
- `process`: Filter by process
- `search`: Search roaster and name fields
- `include_archived`: `true` to include archived coffees (default: `false`)
- `archived_only`: `true` to show only archived coffees, hiding active ones (default: `false`)
- `include_deleted`: `true` to include soft-deleted coffees (default: `false`)

**Default sort:** `-created_at` (newest first, not configurable via API)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "roaster": "Cata Coffee",
      "name": "Kiamaina",
      "country": "Kenya",
      "farm": "Kiamaina Estate",
      "process": "Washed",
      "roast_level": "Light",
      "tasting_notes": "Apricot Nectar, Lemon Sorbet, Raw Honey",
      "roast_date": "2025-11-19",
      "notes": "Best around 3-4 weeks off roast",
      "best_experiment_id": "uuid",
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

**Note:** `experiment_count` is computed via a subquery: `(SELECT COUNT(*) FROM experiments WHERE coffee_id = c.id)`. This must be present in both `List` and `GetByID` repository queries.

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
  "farm": "Kiamaina Estate",
  "process": "Washed",
  "roast_level": "Light",
  "tasting_notes": "Apricot Nectar, Lemon Sorbet, Raw Honey",
  "roast_date": "2025-11-19",
  "notes": "Best around 3-4 weeks off roast"
}
```

**Response:** `201 Created` with coffee object

#### Get Coffee
```
GET /api/v1/coffees/:id
```

**Response:** Coffee object with computed properties (including `experiment_count` via subquery)

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

### Coffee Goals API

#### Get Target Goals
```
GET /api/v1/coffees/:id/goals
```

**Response:**
```json
{
  "id": "uuid",
  "coffee_id": "uuid",
  "coffee_ml": 180.0,
  "tds": 1.38,
  "extraction_yield": 20.5,
  "aroma_intensity": 7,
  "sweetness_intensity": 8,
  "body_intensity": 7,
  "flavor_intensity": 8,
  "brightness_intensity": 7,
  "cleanliness_intensity": 7,
  "complexity_intensity": 6,
  "balance_intensity": 8,
  "aftertaste_intensity": 7,
  "overall_score": 9,
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-18T14:30:00Z"
}
```

Returns `404 Not Found` if no goals exist for this coffee.

#### Upsert Target Goals
```
PUT /api/v1/coffees/:id/goals
```

**Request:**
```json
{
  "coffee_ml": 180.0,
  "tds": 1.38,
  "extraction_yield": 20.5,
  "sweetness_intensity": 8,
  "overall_score": 9
}
```

**Behavior:**
- Creates goals if none exist
- Updates existing goals if present
- Returns `200 OK` with goals object

**Response:**
```json
{
  "id": "uuid",
  "coffee_id": "uuid",
  "coffee_ml": 180.0,
  "tds": 1.38,
  "extraction_yield": 20.5,
  "sweetness_intensity": 8,
  "overall_score": 9,
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-18T14:30:00Z"
}
```

#### Clear Goals
```
DELETE /api/v1/coffees/:id/goals
```

**Behavior:**
- Deletes goals for this coffee
- Returns `204 No Content`

### Reference Experiment API

#### Set Reference Experiment
```
POST /api/v1/coffees/:id/best-experiment
```

Note: API endpoint name unchanged for backwards compatibility. UI displays as "Reference Brew".

**Request:**
```json
{
  "experiment_id": "uuid"
}
```

**Validation:**
- `experiment_id` must reference an experiment belonging to this coffee
- Returns `400 Bad Request` if experiment doesn't belong to coffee

**Response:** `200 OK` with updated coffee object

To clear the reference experiment, send `null`:
```json
{
  "experiment_id": null
}
```

#### Get Reference Data
```
GET /api/v1/coffees/:id/reference
```

Returns the reference experiment (or latest if none marked) along with target goals. Used by the experiment form reference sidebar.

**Response:**
```json
{
  "experiment": {
    "id": "uuid",
    "brew_date": "2026-01-15T10:30:00Z",
    "coffee_weight": 15.0,
    "water_weight": 225.0,
    "ratio": 15.0,
    "grind_size": 3.5,
    "water_temperature": 96.0,
    "filter_paper": {
      "id": "uuid",
      "name": "Abaca",
      "brand": "Cafec"
    },
    "bloom_water": 40.0,
    "bloom_time": 30,
    "total_brew_time": 165,
    "tds": 1.38,
    "extraction_yield": 20.1,
    "overall_score": 8,
    "is_best": true
  },
  "goals": {
    "id": "uuid",
    "coffee_ml": 180.0,
    "tds": 1.38,
    "extraction_yield": 20.5,
    "aroma_intensity": 7,
    "sweetness_intensity": 8,
    "overall_score": 9
  }
}
```

- `experiment` is `null` if no experiments exist for this coffee
- `goals` is `null` if no goals have been set
- `experiment.is_best` is `true` if this is the explicitly marked reference, `false` if it's just the latest

---

## User Interface

### Coffee Grid View

**Route:** `/` (landing page)

**Layout:** Responsive grid of coffee cards

**Responsive Card Count:**
- Mobile (< 640px): 1 column
- Tablet (640px - 1024px): 2 columns
- Desktop (> 1024px): 3 columns

**Card Content:**
- Coffee name (bold, primary)
- Roaster name (muted)
- Archived badge (if archived)
- Reference Brew section:
  - "Reference Brew (date)" + score badge
  - Params: ratio, temperature, filter, minerals
  - Pour info: bloom time, pour count, pour style(s)
  - Improvement note snippet (from coffee goals)
- Action buttons (always visible, not hidden behind menus):
  - **[+ New Experiment]** — Navigates to experiment form with coffee pre-selected
  - **[Edit]** — Opens edit form for this coffee
  - **[Archive]** — Archives the coffee (with confirmation)
  - For archived cards: **[Re-activate]** replaces Archive button

**Card Behavior:**
- Click card → Coffee detail view (`/coffees/:id`)
- Action buttons stop click propagation (don't navigate to detail)

**Toolbar (above grid):**
- Search input with icon
- "Show Archived" toggle — when on, shows **only** archived coffees (hides active). Sends `archived_only=true` to API
- "+ Add Coffee" button

Note: No sort dropdown. Default sort is `-created_at` (newest first).

**Empty State:**
- Message: "No coffees in your library yet"
- Prominent "Add Your First Coffee" button

### Add/Edit Coffee Form

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
│ Farm             [________________]     │
│                                         │
│ ─── Details ───                         │
│ Process          [________________]     │
│ Roast Level      [Light ▼        ]     │
│ Tasting Notes    [________________]     │
│ Roast Date       [____/____/____]       │
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
- Farm: Free text for farm/estate name
- Process: Autocomplete from existing + common list
- Roast Level: Dropdown (Light, Medium, Medium-Dark, Dark)
- Roast Date: Date picker, defaults empty
- Tasting Notes: Multi-line text (roaster's notes)
- Personal Notes: Multi-line text (user's notes)

### Coffee Detail View

**Route:** `/coffees/:id`

**Header Actions:**
- **[+ New Experiment]** - Navigates to `/experiments/new?coffee_id=:id` with coffee pre-selected
- **[Edit]** - Opens edit form for coffee metadata
- **[Archive]** / **[Unarchive]** - Archives or unarchives the coffee

Note: Delete functionality is not exposed in the UI. Use archive to hide coffees while preserving experiment history.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ ← Back to Coffees                                   │
│                                                     │
│ Kiamaina                    [+ New Experiment] [Edit] │
│ Cata Coffee · Kenya · Kiamaina Estate · Washed      │
│                                                     │
│ ┌──────────┬──────────┬──────────────────┐          │
│ │ Roasted  │ Days Off │ Experiments      │          │
│ │ Nov 19   │ 61       │ 8                │          │
│ └──────────┴──────────┴──────────────────┘          │
│                                                     │
│ Tasting Notes                                       │
│ Apricot Nectar, Lemon Sorbet, Raw Honey             │
│                                                     │
│ My Notes                                            │
│ Best around 3-4 weeks off roast                     │
│                                                     │
│ ═══════════════════════════════════════════════════ │
│                                                     │
│ ─── Reference Brew ─── (Jan 15, 2026)      [Change] │
│ Grind: 3.5 · Ratio: 1:15 · Temp: 96°C               │
│ Bloom: 40g/30s · Total: 2:45                        │
│ TDS: 1.38 · Extraction: 20.1%                       │
│ Overall: 8/10                                       │
│                                                     │
│ ─── Target Goals ───                         [Edit] │
│                                                     │
│ Quantitative                                        │
│ Coffee: 180ml · TDS: 1.38 · Extraction: 20.5%      │
│                                                     │
│ Sensory                                             │
│ Aroma: 7 · Sweetness: 8 · Body: 7 · Flavor: 8     │
│ Brightness: 7 · Cleanliness: 7 · Complexity: 6     │
│ Balance: 8 · Aftertaste: 7 · Overall: 9            │
│                                                     │
│ ═══════════════════════════════════════════════════ │
│                                                     │
│ ─── Brew History ───                                │
│ ┌──────────┬──────┬───────┬───────┬───────┬────────┐│
│ │ Date     │ DOR  │ Score │ Grind │ Ratio │ Temp   ││
│ ├──────────┼──────┼───────┼───────┼───────┼────────┤│
│ │⭐Jan 15  │ 57   │ 8/10  │ 3.5   │ 1:15  │ 96°C   ││
│ │  Jan 12  │ 54   │ 7/10  │ 4.0   │ 1:15  │ 94°C   ││
│ │  Jan 10  │ 52   │ 6/10  │ 4.5   │ 1:16  │ 93°C   ││
│ │  Jan 08  │ 50   │ 7/10  │ 3.8   │ 1:15  │ 95°C   ││
│ │  Jan 05  │ 47   │ 5/10  │ 5.0   │ 1:15  │ 92°C   ││
│ └──────────┴──────┴───────┴───────┴───────┴────────┘│
│                                                     │
│ Actions per row:                                    │
│ [Mark as Reference] [View]                          │
│                                                     │
│                               [View All Experiments]│
└─────────────────────────────────────────────────────┘
```

### Reference Brew Section

**Display:**
- Shows input parameters from the reference experiment (or latest if none marked)
- Date of the brew
- Key parameters: grind, ratio, temperature, bloom, total time
- Key outcomes: TDS, extraction yield, overall score
- Indicator showing if this is explicitly marked reference or just latest

**[Change] Button:**
- Opens modal to select a different experiment as reference
- Shows list of experiments for this coffee
- Current reference has checkmark
- Can also clear selection (revert to latest)

### Target Goals Section

**Display:**
- Target outcome values user wants to achieve
- Organized into two subsections: Quantitative and Sensory
- Quantitative: coffee_ml, tds, extraction_yield
- Sensory: 9 intensity fields + overall_score

**[Edit] Button:**
- Opens modal with goal fields organized into Quantitative and Sensory sections
- All fields optional
- No notes field — goals are purely numerical targets

### Brew History Section

**Display:**
- Table of experiments for this coffee (most recent first)
- Columns: Date, Days Off Roast, Score, Grind, Ratio, Temp
- Star icon indicates reference brew
- Shows most recent experiments (paginated or limited to ~10 with "View All" link)
- Row actions: "Mark as Reference", "View" (navigates to experiment detail)

**[View All Experiments] Link:**
- Navigates to `/experiments?coffee_id=:id`

### Mark as Reference Action

Available in:
1. Coffee detail brew history table rows
2. Experiment list when filtered to single coffee
3. Experiment detail view

**Behavior:**
- Sets this experiment as reference for its coffee
- Updates coffee's `best_experiment_id`
- Visual feedback: star icon, toast confirmation

---

## Design Decisions

### Reference Brew vs Latest

The "effective reference" is:
1. The explicitly marked `best_experiment_id` if set
2. Otherwise, the latest experiment by `brew_date`

This ensures:
- Users always have a reference even before marking anything
- Explicit marking overrides recency
- New users get value immediately

### "Reference" Label vs "Best" API Field

The UI uses "Reference Brew" / "Reference" terminology while the API retains `best_experiment_id`:
- "Reference" is more accurate — it's what you compare against, not necessarily the "best"
- API field names are kept for backwards compatibility
- Only UI labels change, not data or API contracts

### Coffee Goals as Separate Entity

Goals stored separately (not inline on Coffee) because:
- Clear separation of concerns
- Goals may have complex structure in future
- Easy to clear/reset without affecting coffee
- Cleaner API semantics

### Goals Aligned with Outcomes (No Notes)

Goals contain only numerical target fields (no `notes` field) because:
- Goals are purely about target numbers to compare against
- Improvement notes live on the experiment's `improvement_notes` field
- Cleaner separation: goals = what to achieve, improvement notes = how to get there

### Reference Data Endpoint

The `/reference` endpoint combines reference experiment + goals because:
- Single request for experiment form sidebar
- Common access pattern
- Reduces client-side coordination

### Archive Toggle Shows Only Archived

The "Show Archived" toggle in the coffee list switches to showing **only** archived coffees (not mixing them with active):
- Clearer mental model — you're either browsing active or archived
- Avoids visual clutter of mixing archived and active cards
- Archive view lets you focus on re-activating coffees

### Brew History as Table

Brew history uses a table format (not a simple list) because:
- Columns enable quick visual comparison across experiments
- Sortable columns help find patterns
- Consistent with the experiments list page
- More information visible at a glance

---

## Open Questions

1. **Goal Ranges**: Should targets support ranges (e.g., TDS 1.35-1.40) or just single values?
2. **Goal History**: Track when goals were changed?
3. **Reference Per Parameter**: Mark different experiments as reference for different attributes?
4. **Goal Templates**: Suggest goals based on coffee characteristics?
5. **Comparison View**: Side-by-side reference brew vs goals with gap analysis?
