# Coffees

## Overview

The Coffees feature manages coffee bean metadata as a first-class entity, independent from brews. It provides:
- Coffee inventory management (CRUD)
- **Reference Brew** tracking — starred reference > latest brew > user defaults > blank

**Route:** `/coffees`

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
| roast_date | date | No | Date the coffee was roasted (shown as "Latest Roast Date" in UI) |
| notes | text | No | Personal notes about this coffee |
| reference_brew_id | UUID | No | FK to brew marked as "reference" (starred) |
| archived_at | timestamp | No | When coffee was archived (hidden but still usable) |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

Note: The UI displays "Reference Brew" terminology. The `roast_date` field on Coffee is used to compute `days_off_roast` on brews at save time.

### Validation Rules

1. `roaster` and `name` together should be treated as a logical identifier (not enforced unique, but used for display)
2. `roast_date` cannot be in the future
3. `reference_brew_id` must reference a brew belonging to this coffee
4. `process` is free-text but UI may suggest common values:
   - Washed
   - Natural
   - Honey (Yellow, Red, Black)
   - Anaerobic
   - Carbonic Maceration
   - Wet-hulled

### Relationships

- **One-to-Many with Brew**: A coffee can have many brews; each brew references exactly one coffee
- **Reference Brew**: Optional FK to the brew explicitly starred as the user's reference brew
- Deleting a coffee is a **hard delete** that cascades: all brews for that coffee are also deleted
- Archived coffees are hidden from default lists and from the brew form coffee selector. Must unarchive first to create new brews.
- Archived coffees can still be viewed and edited. Archiving only hides the coffee from the brew form coffee selector and the default coffees list.

### Computed Properties

- **Brew Count**: Number of brews using this coffee (computed via subquery: `SELECT COUNT(*) FROM brews WHERE coffee_id = c.id`)
- **Last Brewed**: Most recent brew date for this coffee
- **Reference Brew**: The explicitly starred `reference_brew_id`. If none starred, the brew form falls back to the latest brew, then user defaults, then blank. The coffee entity itself stores only the starred reference — fallback logic lives in the brew form client.

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
    reference_brew_id UUID REFERENCES brews(id) ON DELETE SET NULL,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coffees_user_id ON coffees(user_id);
CREATE INDEX idx_coffees_roaster ON coffees(roaster);
CREATE INDEX idx_coffees_roast_date ON coffees(roast_date);
CREATE INDEX idx_coffees_archived_at ON coffees(archived_at) WHERE archived_at IS NULL;
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
- `archived_only`: `true` to show only archived coffees, hiding active ones (default: `false`)

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
      "reference_brew_id": "uuid",
      "brew_count": 8,
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

**Note:** `brew_count` is computed via a subquery: `(SELECT COUNT(*) FROM brews WHERE coffee_id = c.id)`. Must be present in both `List` and `GetByID` repository queries.

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

**Response:** Coffee object with computed properties (including `brew_count` via subquery)

#### Update Coffee
```
PUT /api/v1/coffees/:id
```

**Request:** Full coffee object (all fields; omitted optional fields are set to null)

**Response:** Updated coffee object

#### Archive Coffee
```
POST /api/v1/coffees/:id/archive
```

**Behavior:**
- Sets `archived_at` timestamp
- Coffee hidden from default list but still usable in brews
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
- Hard delete: permanently removes the coffee and all associated data
- Cascades: all brews for this coffee are also deleted
- Returns `204 No Content`

#### Get Coffee Brews
```
GET /api/v1/coffees/:id/brews
```

Returns paginated brews for this coffee. Brews are also available via the global `GET /api/v1/brews` endpoint (see [brews.md](brews.md)). Supports filters: `page`, `per_page`, `sort`, `score_gte`, `score_lte`, `has_tds`, `date_from`, `date_to`.

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

### Reference Brew API

#### Set Reference Brew (Star)
```
POST /api/v1/coffees/:id/reference-brew
```

**Request:**
```json
{
  "brew_id": "uuid"
}
```

**Validation:**
- `brew_id` must reference a brew belonging to this coffee
- Returns `400 Bad Request` if brew doesn't belong to coffee

**Response:** `200 OK` with updated coffee object

To clear the starred reference brew, send `null`:
```json
{
  "brew_id": null
}
```

#### Get Reference Data
```
GET /api/v1/coffees/:id/reference
```

Returns the reference brew for the sidebar. The backend returns the starred reference brew if set, otherwise the latest brew for this coffee.

**Response:**
```json
{
  "brew": {
    "id": "uuid",
    "brew_date": "2026-01-15T10:30:00Z",
    "coffee_weight": 15.0,
    "ratio": 15.0,
    "water_weight": 225.0,
    "grind_size": 3.5,
    "water_temperature": 96.0,
    "filter_paper": {
      "id": "uuid",
      "name": "Abaca",
      "brand": "Cafec"
    },
    "pours": [
      { "pour_number": 1, "water_amount": 45.0, "pour_style": "center", "wait_time": 30 },
      { "pour_number": 2, "water_amount": 90.0, "pour_style": "circular" },
      { "pour_number": 3, "water_amount": 90.0, "pour_style": "circular" }
    ],
    "total_brew_time": 165,
    "tds": 1.38,
    "extraction_yield": 20.1,
    "overall_score": 8,
    "improvement_notes": "Try finer grind to boost sweetness"
  },
  "source": "starred"
}
```

- `brew` is `null` if no brews exist for this coffee
- `source` is `"starred"` if the brew is the explicitly starred reference, or `"latest"` if falling back to most recent brew

---

## User Interface

### Coffee Grid View

**Route:** `/coffees`

**Layout:** Responsive grid of coffee cards

**Responsive Card Count:**
- Mobile (< 640px): 1 column
- Tablet (640px - 1024px): 2 columns
- Desktop (> 1024px): 3 columns

**Card Content:**
- Coffee name (bold, primary)
- Roaster name (muted)
- Archived badge (if archived)
- Reference Brew summary (if exists):
  - Score badge, ratio, temperature, filter
  - Improvement note snippet (from reference brew)

**Card Behavior:**
- Entire card is clickable → navigates to Coffee detail view (`/coffees/:id`)
- No action buttons on cards — all actions (New Brew, Edit, Archive, Delete) live exclusively on the coffee detail page

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
+---------------------------------------+
| Add Coffee                            |
+---------------------------------------+
| Roaster*         [________________]   |
| Name*            [________________]   |
|                                       |
| --- Origin ---                        |
| Country          [________________]   |
| Farm             [________________]   |
|                                       |
| --- Details ---                       |
| Process          [________________]   |
| Roast Level      [Light v        ]   |
| Tasting Notes    [________________]   |
| Latest Roast Date [____/____/____]    |
|                                       |
| --- Notes ---                         |
| Personal Notes   [                ]   |
|                  [                ]   |
|                                       |
|         [Cancel]  [Save Coffee]       |
+---------------------------------------+
```

**Field Behavior:**
- Roaster: Autocomplete from existing roasters
- Country: Autocomplete from existing + common list
- Farm: Free text for farm/estate name
- Process: Autocomplete from existing + common list
- Roast Level: Dropdown (Light, Medium, Medium-Dark, Dark)
- Latest Roast Date: Date picker, defaults empty
- Tasting Notes: Multi-line text (roaster's notes)
- Personal Notes: Multi-line text (user's notes)

### Coffee Detail View

**Route:** `/coffees/:id`

**Header Actions:**
- **[+ New Brew]** - Prominent primary button, navigates to `/brews/new?coffee_id=:id`
- **[Edit]** - Opens edit form for coffee metadata
- **[Archive]** / **[Unarchive]** - Archives or unarchives the coffee
- **[Delete]** - Hard-deletes the coffee with confirmation dialog. Navigates back to coffee list after deletion.

Delete uses a confirmation dialog: "Are you sure you want to delete {name} by {roaster}? This will permanently delete the coffee and all its brews. This action cannot be undone." with Cancel (outline) and Delete (destructive) buttons.

**Layout:**
```
+-----------------------------------------------------+
| <- Back to Coffees                                   |
|                                                     |
| Kiamaina                    [+ New Brew] [Edit]      |
| Cata Coffee - Kenya - Kiamaina Estate - Washed       |
|                                                     |
| +----------+------------------+                     |
| | Roasted  | Brews           |                     |
| | Nov 19   | 8               |                     |
| +----------+------------------+                     |
|                                                     |
| Tasting Notes                                       |
| Apricot Nectar, Lemon Sorbet, Raw Honey             |
|                                                     |
| My Notes                                            |
| Best around 3-4 weeks off roast                     |
|                                                     |
| =================================================== |
|                                                     |
| --- Reference Brew --- (Jan 15, 2026)  [star] [Change]|
| Grind: 3.5 - Ratio: 1:15 - Temp: 96C                |
| Pours: 45g center (30s bloom), 90g circular, 90g circular |
| Total: 2:45                                          |
| TDS: 1.38 - Extraction: 20.1%                       |
| Overall: 8/10                                       |
| Improvement: "Try finer grind to boost sweetness"    |
|                                                     |
| =================================================== |
|                                                     |
| --- Brew History ---                                |
| Sort: [Date v] [Score]                              |
| +----------+-------+-------+-------+-------+--------+|
| | Date     | Score | Ratio | Temp  | Filter        ||
| +----------+-------+-------+-------+-------+--------+|
| |*Jan 15   | 8/10  | 1:15  | 96C   | Abaca         ||
| |  Jan 12  | 7/10  | 1:15  | 94C   | Abaca         ||
| |  Jan 10  | 6/10  | 1:16  | 93C   | Tabbed        ||
| |  Jan 08  | 7/10  | 1:15  | 95C   | Abaca         ||
| |  Jan 05  | 5/10  | 1:15  | 92C   | Abaca         ||
| +----------+-------+-------+-------+-------+--------+|
|                                                     |
+-----------------------------------------------------+
```

### Reference Brew Section

**Display:**
- Shows key parameters from the reference brew (starred or latest)
- Labeled "Reference (starred)" or "Reference (latest)" to indicate source
- Date of the brew
- Key parameters: grind, ratio, temperature, pours, total time
- Key outcomes: TDS, extraction yield, overall score
- Sensory radar chart (see [design-system.md](../foundations/design-system.md#10-sensory-radar-chart)) — shows the reference brew's sensory profile as a hexagonal chart, placed below key outcomes (TDS, extraction yield, overall score). Only shown when at least one sensory attribute has a value.
- Improvement notes from the reference brew
- Star icon on the section header — filled if this is the starred reference, outline if showing latest
- If no brews exist, shows empty state: "No brews yet. Log your first brew to see reference data here."

**[Change] Button:**
- Opens modal to select a different brew as the starred reference
- Shows list of brews for this coffee
- Current starred reference has checkmark
- Can also clear selection (sets `reference_brew_id` to NULL)

### Brew History Section

**Display:**
- Table of brews for this coffee (most recent first by default)
- Columns: Checkbox, Date, Score, Ratio, Temp, Filter Paper
- Sort toggle: Date or Score (click column header to toggle, newest/highest first)
- Star icon on rows to mark/unmark as starred reference (one click)
- Infinite scroll — loads more brews as the user scrolls down
- Click row -> opens brew detail modal (see [brew-tracking.md](brew-tracking.md))

**Comparison Selection:**
- Checkbox column on the left of each brew row
- Checkboxes don't interfere with row click (clicking the checkbox toggles selection; clicking elsewhere on the row opens the brew detail modal)
- When 2-4 brews are checked, a "Compare" floating bar appears above the table with text "{N} brews selected" and a "Compare" button
- Clicking "Compare" navigates to `/coffees/:id/compare?brews=id1,id2,...` (see [brew-comparison.md](brew-comparison.md))
- Max 4 selection enforced — checkbox disabled on the 5th brew with tooltip "Maximum 4 brews can be compared"
- Selection state resets on page navigation

**Deleting a reference brew:**
- Warning before deletion: "This is your starred reference brew for {Coffee}. Deleting it will clear the reference. Continue?"

### Star as Reference Action

Available in:
1. Coffee detail brew history table rows (star icon)
2. Brew detail modal

**Behavior:**
- Stars this brew as the reference for its coffee
- Updates coffee's `reference_brew_id`
- Visual feedback: filled star icon, toast confirmation
- Clicking star on already-starred brew clears the reference (unstars)

---

## Design Decisions

### Reference Fallback Chain

The reference brew follows a fallback chain: starred reference > latest brew > user defaults > blank. This ensures:
- New coffees with brews automatically show the latest brew as reference
- Users can explicitly star a specific brew to lock it as reference
- The brew form always has useful data to auto-fill from
- The coffee entity stores only the starred reference — fallback logic lives in the client and the `/reference` endpoint

### Coffee Detail as Hub

The coffee detail page is the hub for viewing and managing brews for a specific coffee:
- Prominent "+ New Brew" button for quick access
- Reference brew summary shows the current reference at a glance
- Brew history table enables comparison and pattern discovery
- Star icon on rows provides one-click reference management

### Archive Toggle Shows Only Archived

The "Show Archived" toggle in the coffee list switches to showing **only** archived coffees (not mixing them with active):
- Clearer mental model — you're either browsing active or archived
- Avoids visual clutter of mixing archived and active cards
- Archive view lets you focus on re-activating coffees

### Hard Delete with Cascade

Coffee deletion is a hard delete that cascades to all brews because:
- Simpler mental model — delete means gone
- No orphaned brew data to confuse users
- Confirmation dialog warns about cascading effects
- Users can archive instead of delete if they want to preserve data

### Brew History as Table

Brew history uses a table format (not a simple list) because:
- Columns enable quick visual comparison across brews
- Sortable by date or score helps find patterns
- More information visible at a glance

### "Latest Roast Date" Label

The coffee-level `roast_date` field is labeled "Latest Roast Date" in the UI because:
- It represents the most recent bag's roast date
- Used to compute `days_off_roast` on brews at save time
- Avoids confusion with individual brew roast tracking
