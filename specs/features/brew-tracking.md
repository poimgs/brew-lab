# Brew Tracking

## Overview

Brew tracking is the core feature—logging coffee brews with their parameters and outcomes. A Brew represents a single pour-over brewing session, capturing the full context: which coffee was used, all brewing parameters, and the resulting taste outcomes.

The design prioritizes:
- Minimal required fields (coffee only — everything else optional)
- Single scrollable form with 3 collapsible sections (all collapsed by default)
- Auto-fill from reference brew, latest brew, or user defaults
- Low-friction entry that scales with user sophistication

---

## Entity: Brew

### Core Fields

Fields in this section are not defaultable.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| coffee_id | UUID | Yes | Reference to Coffee entity |
| brew_date | date | No | User-provided brew date. Defaults to today if omitted from POST. Cannot be in the future. |
| days_off_roast | integer | No | Days between coffee's roast_date and brew_date (computed at save time, stored immutably) |
| overall_notes | text | No | Free-form notes about the brew |
| overall_score | integer | No | 1-10 rating |
| improvement_notes | text | No | Ideas for improving the next brew |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

### Setup Variables

These are set before brewing begins.

| Field | Type | Unit | Defaultable | Description |
|-------|------|------|-------------|-------------|
| coffee_weight | decimal | grams | Yes | Dose of coffee grounds |
| ratio | decimal | — | Yes | Brew ratio (e.g., 15 for 1:15). Used with coffee_weight to compute water_weight on display. |
| grind_size | decimal | — | Yes | Numeric grinder setting (e.g., 3.5 for Fellow Ode 2) |
| water_temperature | decimal | C | Yes | Water temperature at pour |
| filter_paper_id | UUID | — | Yes | Reference to filter paper (see [Equipment](setup.md)) |

### Brewing Variables

Parameters during the brewing process. Fields in this section (excluding pours) are not defaultable.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| pours | array | — | List of pour entries (see brew_pours table). Pour #1 is the bloom pour. Individual pour fields are defaultable — see Pours table below. |
| total_brew_time | integer | seconds | Total time from first pour to drawdown complete |
| technique_notes | text | — | Additional technique details |

### Quantitative Outcomes

Fields in this section are not defaultable.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| coffee_ml | decimal | milliliters | Volume of brewed coffee |
| tds | decimal | % | Total Dissolved Solids reading |

### Sensory Outcomes

Fields in this section are not defaultable. All intensity fields are 1-10 scale. Six sensory attributes, intensity only (no per-attribute notes).

| Field | Type | Description |
|-------|------|-------------|
| aroma_intensity | integer | Strength and quality of aroma |
| body_intensity | integer | Body/mouthfeel weight and texture |
| sweetness_intensity | integer | Perceived sweetness level |
| brightness_intensity | integer | Perceived acidity quality (liveliness, sparkle) |
| complexity_intensity | integer | Layered, evolving flavor experience |
| aftertaste_intensity | integer | Strength and quality of aftertaste |

**Total: 6 sensory attributes** — aroma, body, sweetness, brightness, complexity, aftertaste

### Pours (brew_pours table)

| Field | Type | Defaultable | Description |
|-------|------|-------------|-------------|
| pour_number | integer | No | Sequence number (1-based). Pour #1 is the bloom. |
| water_amount | decimal | Yes | Water amount in grams |
| pour_style | enum | Yes | `circular` or `center` |
| wait_time | integer | Yes | Wait time in seconds after this pour before the next (used for bloom on pour #1, nullable for other pours) |

**Bloom handling:** Pour #1 in the pours array represents the bloom. It has a `wait_time` field (seconds) indicating the bloom wait before the next pour. Other pours may also use `wait_time` if desired but it's primarily for bloom.

### Computed Properties (not stored in DB)

- **Water Weight**: `coffee_weight × ratio`. Null until both `coffee_weight` and `ratio` are set. Included in API responses as a convenience field.
- **Extraction Yield**: `(coffee_ml × tds) / coffee_weight`. TDS is stored as `DECIMAL(4,2)` representing the percentage directly (e.g., 1.38 means 1.38%). The formula produces EY as a percentage (e.g., 18.4%). Example: `(200ml × 1.38) / 15g = 18.4%`. Null until all three inputs are present. Included in API GET responses as a computed field — not accepted in POST/PUT request bodies.

### Database Schema

```sql
CREATE TABLE brews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    coffee_id UUID NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
    brew_date DATE NOT NULL DEFAULT CURRENT_DATE,
    days_off_roast INTEGER,

    -- Setup variables
    coffee_weight DECIMAL(5,2),
    ratio DECIMAL(4,1),
    -- water_weight is computed as coffee_weight × ratio (not stored)
    grind_size DECIMAL(4,1),
    water_temperature DECIMAL(4,1),
    filter_paper_id UUID REFERENCES filter_papers(id),

    -- Brewing variables
    -- Pours stored in brew_pours table (pour #1 = bloom)
    total_brew_time INTEGER,
    technique_notes TEXT,

    -- Quantitative outcomes
    coffee_ml DECIMAL(6,2),
    tds DECIMAL(4,2),
    -- extraction_yield is computed: (coffee_ml * tds) / coffee_weight (not stored)

    -- Sensory outcomes (1-10 scale, 6 attributes, intensity only)
    aroma_intensity INTEGER CHECK (aroma_intensity BETWEEN 1 AND 10),
    body_intensity INTEGER CHECK (body_intensity BETWEEN 1 AND 10),
    sweetness_intensity INTEGER CHECK (sweetness_intensity BETWEEN 1 AND 10),
    brightness_intensity INTEGER CHECK (brightness_intensity BETWEEN 1 AND 10),
    complexity_intensity INTEGER CHECK (complexity_intensity BETWEEN 1 AND 10),
    aftertaste_intensity INTEGER CHECK (aftertaste_intensity BETWEEN 1 AND 10),

    -- Overall assessment
    overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),
    overall_notes TEXT,
    improvement_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE brew_pours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brew_id UUID NOT NULL REFERENCES brews(id) ON DELETE CASCADE,
    pour_number INTEGER NOT NULL,
    water_amount DECIMAL(5,2),
    pour_style VARCHAR(50),
    wait_time INTEGER,
    UNIQUE(brew_id, pour_number)
);

CREATE INDEX idx_brews_user_id ON brews(user_id);
CREATE INDEX idx_brews_coffee_id ON brews(coffee_id);
CREATE INDEX idx_brews_brew_date ON brews(brew_date);
CREATE INDEX idx_brew_pours_brew_id ON brew_pours(brew_id);
```

---

## API Endpoints

### List Brews

Brews are accessible via two endpoints:
- **Coffee-scoped:** `GET /api/v1/coffees/:id/brews` — see [coffees.md](coffees.md) for query parameters and response format
- **Global:** `GET /api/v1/brews` — paginated, with filters for date, score, and coffee — see [brews.md](brews.md) for full spec

### Recent Brews
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
      "coffee_reference_brew_id": "uuid-or-null",
      "brew_date": "2026-01-19",
      "days_off_roast": 61,
      "ratio": 15.0,
      "overall_score": 7,
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

**Sorting:** `brew_date DESC` (most recent first, not configurable).

**Note:** All brew list/detail responses include `coffee_name`, `coffee_roaster`, and `coffee_reference_brew_id` fields, as well as a nested `filter_paper` object (`{ id, name, brand }`) instead of just `filter_paper_id`. Soft-deleted filter papers are still included in responses for historical accuracy.

### Create Brew
```
POST /api/v1/brews
```

**Request:**
```json
{
  "coffee_id": "uuid",
  "brew_date": "2026-01-19",
  "coffee_weight": 15.0,
  "ratio": 15.0,
  "grind_size": 3.5,
  "water_temperature": 90.0,
  "filter_paper_id": "uuid",
  "pours": [
    { "pour_number": 1, "water_amount": 45.0, "pour_style": "center", "wait_time": 30 },
    { "pour_number": 2, "water_amount": 90.0, "pour_style": "circular" },
    { "pour_number": 3, "water_amount": 90.0, "pour_style": "circular" }
  ],
  "total_brew_time": 165,
  "technique_notes": "Gentle swirl after bloom",
  "coffee_ml": 200.0,
  "tds": 1.38,
  "aroma_intensity": 7,
  "body_intensity": 7,
  "sweetness_intensity": 8,
  "brightness_intensity": 7,
  "complexity_intensity": 6,
  "aftertaste_intensity": 7,
  "overall_score": 8,
  "overall_notes": "Bright acidity, lemon notes",
  "improvement_notes": "Try finer grind to boost sweetness"
}
```

**Notes:**
- `brew_date` is optional — defaults to today if omitted. Cannot be in the future. Editable on PUT.
- `water_weight` is not stored — it is computed as `coffee_weight × ratio` and included in GET responses
- `extraction_yield` is not accepted in the request body — it is computed from `(coffee_ml × tds) / coffee_weight` and included in GET responses
- `pours` array creates corresponding `brew_pours` records. Pour #1 is bloom (has `wait_time`).
- `days_off_roast` is computed at save time: `brew_date - coffee.roast_date`. Stored as an immutable integer (not recomputed on read). If the coffee has no `roast_date`, `days_off_roast` is `null`.
- Only `coffee_id` is required. All other fields are optional.

**Response:** `201 Created` with brew object including computed fields and nested pours

### Get Brew
```
GET /api/v1/brews/:id
```

**Response:** Full brew object with coffee metadata, nested filter_paper, and computed properties

```json
{
  "id": "uuid",
  "coffee_id": "uuid",
  "coffee_name": "Kiamaina",
  "coffee_roaster": "Cata Coffee",
  "coffee_reference_brew_id": "uuid-or-null",
  "brew_date": "2026-01-15",
  "days_off_roast": 57,
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
    { "pour_number": 2, "water_amount": 90.0, "pour_style": "circular" }
  ],
  "total_brew_time": 165,
  "technique_notes": "Gentle swirl after bloom",
  "coffee_ml": 200.0,
  "tds": 1.38,
  "extraction_yield": 18.4,
  "aroma_intensity": 7,
  "body_intensity": 7,
  "sweetness_intensity": 8,
  "brightness_intensity": 7,
  "complexity_intensity": 6,
  "aftertaste_intensity": 7,
  "overall_score": 8,
  "overall_notes": "Bright acidity, lemon notes",
  "improvement_notes": "Try finer grind",
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-01-15T11:00:00Z"
}
```

**Note:** `water_weight` and `extraction_yield` are computed fields (not stored). `coffee_name`, `coffee_roaster`, and `filter_paper` are joined/nested from related tables.

### Update Brew
```
PUT /api/v1/brews/:id
```

**Request:** Full brew object (all fields; omitted optional fields are set to null). Includes `brew_date` (cannot be in the future). `days_off_roast` is recomputed when `brew_date` changes.

**Pours replacement:** The `pours` array in the PUT body is the complete set. The backend deletes all existing `brew_pours` rows for this brew and inserts the new set. Sending `pours: []` removes all pours. This matches the pour defaults replacement pattern.

**Response:** Updated brew object (same format as GET, with computed fields)

### Delete Brew
```
DELETE /api/v1/brews/:id
```

**Behavior:**
- Hard delete: permanently removes the brew
- Cascades: brew_pours rows for this brew are also deleted
- If this brew was the coffee's `reference_brew_id`, that field is set to NULL

**Response:** `204 No Content`

### Brew Detail Modal

Brew details are displayed in a **modal dialog** (not a dedicated page). The modal is opened from:
- Coffee detail page brew history rows
- Home page recent brews widget

**Modal Content:**
```
+-----------------------------------------------------+
| Brew Detail — Jan 15, 2026                       [x]  |
+-----------------------------------------------------+
| Kiamaina - Cata Coffee                               |
| Days Off Roast: 57                                   |
|                                                      |
| --- Setup ---                                        |
| Coffee: 15g  Ratio: 1:15  Water: 225g (computed)     |
| Grind: 3.5  Temp: 96C  Filter: Abaca (Cafec)        |
|                                                      |
| --- Brewing ---                                      |
| Pours: 45g center (30s bloom), 90g circular, 90g circular |
| Total: 2:45                                          |
| Technique: Gentle swirl after bloom                  |
|                                                      |
| --- Tasting ---                                      |
| Coffee: 180ml  TDS: 1.38  Extraction: 20.1%         |
| Overall: 8/10                                        |
|                                                      |
|       Sweetness                                      |
|          8                                           |
|    Aroma / \ Brightness                              |
|      7  /   \  7                                     |
|        /     \                                       |
|  Body 7 ----- 6 Complexity                           |
|        \     /                                       |
|         \   /                                        |
|     Aftertaste 7                                     |
|   (Sensory Radar Chart — see design-system.md)       |
|                                                      |
| Notes: "Bright acidity, lemon notes..."              |
| Improvement: "Try finer grind to boost sweetness"    |
|                                                      |
| [Edit] [Brew Again] [Star as Reference] [Delete]     |
+-----------------------------------------------------+
```

**Sensory Radar Chart:**
- A hexagonal radar chart (see [design-system.md](../foundations/design-system.md#10-sensory-radar-chart)) visualizes the 6 sensory attribute intensities
- Displayed within the Tasting section, below TDS/extraction/overall score, above notes
- Size: ~180px on desktop, ~140px on mobile
- Only shown when at least one sensory attribute has a value; otherwise omitted

**Actions:**
- **[Edit]**: Navigate to `/brews/:id/edit` (closes modal)
- **[Brew Again]**: Navigate to `/brews/new?from=:id`. The form fetches `GET /api/v1/brews/:id` and pre-fills Setup + Brewing fields. Outcomes, notes, and sensory scores are NOT pre-filled (must be fresh). No server-side copy endpoint — no record created until user saves.
- **[Star as Reference]**: Stars/unstars this brew as reference for its coffee
- **[Delete]**: Hard-deletes the brew with confirmation dialog

**Note:** The modal receives `referenceBrewId` from `coffee_reference_brew_id` in the brew response, enabling the "Star as Reference" action to show correct state on all pages (Home, Brews, Coffee detail).

---

## User Defaults

User defaults (entity, schema, API, and Preferences page UI) are defined in [preferences.md](preferences.md). The brew form auto-fills from defaults — see Auto-Fill Priority below. Fields that support defaults are marked **Defaultable: Yes** in the entity tables above.

---

## User Interface

### User Stories

1. **Quick Log**: As a user, I can log a basic brew in under 30 seconds
2. **Detailed Log**: As a user, I can add detailed parameters when I want precision
3. **Use Defaults**: As a user, I can set defaults for my common setup to reduce entry
4. **Edit Later**: As a user, I can add details after the initial entry
5. **Brew Again**: As a user, I can start from a previous brew's settings via "Brew Again"

### Entry Flow

**Single scrollable form** with 3 collapsible sections, all collapsed by default.

**Route:** `/brews/new` (new brew) or `/brews/:id/edit` (edit existing)

**Form Layout:**
```
+---------------------------------------+
| New Brew                              |
+---------------------------------------+
| Coffee*  [Search coffees...        v] |
| Kiamaina - Cata Coffee                |
|                                       |
| Brew Date     [2026-01-19  📅]        |
| Days Off Roast: 61                    |
|                                       |
| [★] Set as reference brew             |
|                                       |
| Overall Notes                         |
| [                                 ]   |
| [                                 ]   |
|                                       |
| Overall Score                         |
| [  ] 1-10                             |
|                                       |
| Improvement Notes                     |
| [                                 ]   |
|                                       |
| [> Setup          ○]                  |
| [> Brewing        ○]                  |
| [> Tasting        ○]                  |
|                                       |
|      [Cancel]  [Save Brew]            |
+---------------------------------------+
```

**Top-level fields** (always visible):
- Coffee selector (required)
- Brew date (calendar date picker, defaults to today)
- Days off roast (computed live from coffee's roast_date minus brew_date, display only)
- "Set as reference brew" checkbox (shown when coffee selected, pre-checked when editing the current reference)
- Overall notes
- Overall score
- Improvement notes

**Section fill-status indicators** (see [design-system.md](../foundations/design-system.md)):
- Each collapsible section header has a 3-state dot indicator
- Gray dot (○): no fields filled in section
- Half-teal dot (◐): some fields filled
- Full teal dot (●): all fields filled
- Indicators update in real-time as the user fills or clears fields

**Section 1 — Setup** (collapsible, collapsed by default):
```
| --- Setup ---                    [-]  |
|                                       |
| Coffee Weight    [15    ] g           |
| Ratio            [15    ] (1:15)      |
| Water Weight     225g (computed)      |
| Grind Size       [3.5   ]            |
| Temperature      [90    ] C          |
| Filter           [Select filter... v] |
```

Fields: coffee_weight, ratio, *water_weight (display only)*, grind_size, water_temperature, filter_paper_id

**Section 2 — Brewing** (collapsible, collapsed by default):
```
| --- Brewing ---                  [-]  |
|                                       |
| Pours:                                |
| #1 [45   ] g  [center v]  wait [30]s |
| #2 [90   ] g  [circular v]           |
| #3 [90   ] g  [circular v]           |
| [+ Add Pour]                          |
|                                       |
| Total Brew Time  [2:45 ]  (165s)      |
| Technique Notes  [                ]   |
```

Fields: pours array (pour_number, water_amount, pour_style, wait_time for pour #1), total_brew_time, technique_notes

**Section 3 — Tasting** (collapsible, collapsed by default):
```
| --- Tasting ---                  [-]  |
|                                       |
| Coffee (ml)      [200   ]            |
| TDS              [1.38  ]            |
| Extraction Yield  18.4% (computed)    |
|                                       |
| --- Sensory (1-10) ---               |
| Aroma     [7 ]  Body       [7 ]      |
| Sweetness [8 ]  Brightness [7 ]      |
| Complexity[6 ]  Aftertaste [7 ]      |
```

Fields: coffee_ml, tds, extraction_yield (read-only, computed from `(coffee_ml × tds) / coffee_weight` — shows "—" when inputs missing), 6 sensory intensities

**Note:** Archived coffees are hidden from the coffee selector. Users must unarchive a coffee before creating new brews for it.

### Auto-Fill Priority

When creating a new brew, fields are auto-filled following this priority chain:
1. **Starred reference brew** — if the selected coffee has a starred `reference_brew_id`
2. **Latest brew** — most recent brew for the selected coffee (by brew_date)
3. **User defaults** — from `/api/v1/defaults`
4. **Blank** — no auto-fill

Auto-fill applies to Setup and Brewing section fields only (not tasting/sensory outcomes). When the coffee selection changes, auto-fill re-runs with the new coffee's data.

### Field Details

**Setup:**
- Coffee Weight (g)
- Ratio (numeric, e.g., 15 for 1:15)
- Water Weight (g) - display-only, computed as `coffee_weight × ratio`. Shown for reference but not stored.
- Grind Size (numeric, e.g., 3.5 for Fellow Ode 2)
- Water Temperature (C)
- Filter Paper (dropdown, see [Equipment](setup.md)). Soft-deleted filter papers are excluded from the dropdown when creating/editing brews, but show normally in existing brew views (detail modal, history table).

**Brewing:**
- Pours (dynamic list):
  - Pour Number (auto-incremented, #1 = bloom)
  - Water Amount (g)
  - Pour Style (dropdown: circular, center)
  - Wait Time (seconds, shown for pour #1 as bloom wait; available for other pours)
  - [+ Add Pour] button
  - Pre-populated from reference brew or user's pour defaults
  - Mobile: pours displayed as stacked cards (not inline rows)
- Total Brew Time: input accepts mm:ss format (e.g., "2:45"). Stored as seconds in DB (165). Display: mm:ss primary, seconds in parentheses.
- Technique Notes (text)

**Water Weight Validation:**
- Non-blocking warning when `sum(pour amounts) != computed water_weight`
- Displayed as informational warning, does not prevent saving
- Show computed water_weight for reference when the warning fires

**Tasting:**
- Coffee (ml) - volume of brewed coffee
- TDS (%)
- Extraction Yield — read-only, auto-calculated from `(coffee_ml × tds) / coffee_weight`. Shows "—" when any input is missing. Not a form input.
- 6 sensory intensity fields (1-10 scale)

### Brew Again

**Access Points:**
- Brew detail modal: "Brew Again" button
- Home page recent brews: row action button
- Global Brews page: (via brew detail modal)

**Behavior:**
- Navigates to `/brews/new?from=:id`
- Form loads, fetches `GET /api/v1/brews/:id`, pre-fills Setup + Brewing fields
- `coffee_id` is also pre-filled (coffee selector shows the original brew's coffee)
- `brew_date` defaults to today (not copied from original)
- Outcomes (`coffee_ml`, `tds`), overall notes, overall score, improvement notes, and sensory scores are NOT pre-filled (must be entered fresh)
- No server-side copy endpoint — no record created until user saves
- Useful for A/B testing with one variable changed

### Real-Time Calculations

**Water Weight Display:**
- Computed as `coffee_weight × ratio` and displayed as a read-only value
- Not stored in the database — computed on display
- Example: 15g coffee × 15 ratio = 225g water

**Extraction Yield:**
- If TDS, coffee weight, and coffee_ml entered:
- `EY = (coffee_ml × tds) / coffee_weight` (TDS stored as percentage, e.g., 1.38 = 1.38%)
- Display calculated value with "calculated" indicator

**Days Off Roast:**
- Computed at save time: `brew_date - coffee.roast_date` (uses user-provided `brew_date`, or today if omitted)
- Stored as an immutable integer on the brew record
- Recomputed if `brew_date` is changed via PUT
- If coffee has no roast_date, value is null
- Displayed in brew header and brew history tables

### Validation

**Required:**
- Coffee selection (only field required for saving)

**Format Validation:**
- Weights: Positive decimals
- Temperature: 0-100C
- Intensity scores: 1-10 integers
- Times: Positive integers (seconds)
- Volume: Positive decimals for coffee_ml
- Brew date: Valid date, cannot be in the future

**Warnings (not blocking):**
- Unusual values: "Temperature 50C seems low for brewing"
- Water weight mismatch: "Sum of pours (X g) differs from computed water weight (Y g)"

### Navigation & Save Behavior

**Save Brew:**
- "Save Brew" button at the bottom of the form
- Validates only coffee_id, then saves
- If editing an existing brew, updates it (PUT)
- If new, creates it (POST)

**Post-save navigation:**
- Entry from Home (`/`) -> save -> return to Home
- Entry from Coffee detail (`/coffees/:id`) -> save -> return to Coffee detail
- Direct navigation -> save -> return to Home

**Post-save reference setting:**
- If "Set as reference" is checked, calls `POST /api/v1/coffees/:id/reference-brew` after successful save
- If unchecked on edit (was previously reference), clears the reference via the same endpoint with `null`
- Reference API failure shows warning toast but doesn't block navigation

**Unsaved changes:**
- Browser `beforeunload` warning when form has changes and user navigates away
- Cancel button navigates back without saving (with beforeunload warning if dirty)

---

## Reference Sidebar

When logging a brew, users can view reference information for the selected coffee in a sidebar. The sidebar is a **single panel** (no tabs) showing whichever brew is being used as reference.

### Layout

**Desktop (`lg+` breakpoints):**

Form and sidebar are shown side-by-side. Sidebar is **collapsed by default** — displayed as a thin panel/button labeled "Reference" on the right. Click to expand and see reference content alongside the form.

**Collapsed state:**
```
+-----------------------------------------------+---+
| New Brew                                       |[R]|
|                                                |[e]|
| Coffee*  [Kiamaina - Cata v]                   |[f]|
| Brew Date [2026-01-19 📅]                       |   |
| Days Off Roast: 61                             |   |
|                                                |   |
| Overall Notes                                  |   |
| [                                          ]   |   |
|                                                |   |
| [> Setup          ○]                           |   |
| [> Brewing        ○]                           |   |
| [> Tasting        ○]                           |   |
|                                                |   |
|                 [Save Brew]                     |   |
+-----------------------------------------------+---+
```

**Expanded state:**
```
+-----------------------------------+---------------------------------+
| New Brew                          | Reference (starred)    [Change] |
|                                   | --------------------------------|
| Coffee*  [Kiamaina - Cata v]      | Based on: Jan 15 brew           |
| Brew Date [2026-01-19 📅]         |                                 |
| Days Off Roast: 61                | INPUT PARAMETERS                |
|                                   | - Coffee: 15g                   |
| Overall Notes                     | - Ratio: 1:15                   |
| [                             ]   | - Water: 225g                   |
|                                   | - Grind: 3.5                    |
| Overall Score  [  ]               | - Temp: 96C                     |
|                                   | - Filter: Abaca (Cafec)         |
| Improvement Notes                 | - Bloom: 45g / 30s wait         |
| [                             ]   | - Pours: 90g circ, 90g circ     |
|                                   |                                 |
| [> Setup          ○]             | OUTCOMES                        |
| [> Brewing        ○]             | - Score: 8/10                   |
| [> Tasting        ○]             | - TDS: 1.38                     |
|                                   | - Extraction: 20.1%             |
|              [Save Brew]          |                                 |
|                                   | IMPROVEMENT NOTES               |
|                                   | "Try finer grind to boost       |
|                                   | sweetness, maybe 3.2"           |
+-----------------------------------+---------------------------------+
```

**Mobile/tablet (`< lg` breakpoint):**

Sidebar becomes a **Sheet overlay**:
- Triggered by a "Reference" button visible when a coffee is selected
- Tapping the button dims the background and slides the sidebar in from the right, taking focus
- Same content and functionality as the desktop expanded sidebar
- Tap outside or close button to dismiss

### Sidebar Content

**Header:**
- Label: "Reference (starred)" or "Reference (latest)" based on source
- [Change] button to select a different reference

**Sections:**

1. **Input Parameters**
   - Coffee weight, ratio, water weight (computed)
   - Grind size, temperature
   - Filter paper name (soft-deleted filter papers show normally here)
   - Pours summary (amounts, styles, bloom wait time)
   - Total brew time (if recorded)

2. **Outcomes**
   - Overall score
   - TDS, extraction yield
   - Sensory radar chart (see [design-system.md](../foundations/design-system.md#10-sensory-radar-chart)) — shows the reference brew's sensory profile as a hexagonal chart. Sized to fit sidebar width. Only shown when at least one sensory attribute has a value.

3. **Improvement Notes**
   - Shows the reference brew's `improvement_notes`
   - Read-only in sidebar context

### Select Different Reference Brew

A **[Change]** button in the sidebar header allows the user to view a different brew as the reference during this form session.

**Behavior:**
- Clicking "Change" opens a modal dialog listing all brews for the selected coffee
- Dialog shows: Date, Score, key params (grind, ratio, temp) for each brew
- Current sidebar reference has a checkmark
- Selecting a brew updates the sidebar to show that brew's parameters
- This is a **form-session-level override** — it does NOT change the coffee's `reference_brew_id` in the database
- Useful for comparing against a specific past brew while brewing
- Reset to default reference when coffee selection changes

### Sidebar Behavior

**Visibility:**
- Sidebar hidden when no coffee is selected
- Desktop (`lg+`): Sidebar appears as a thin collapsed panel when coffee is selected. Click to expand to full width (w-80). Click again to collapse.
- Mobile/tablet (`< lg`): "Reference" button appears when coffee is selected. Opens Sheet overlay.
- Expansion state persists during the form lifecycle

**Data Source:**
- Fetches data from `GET /api/v1/coffees/:id/reference` when coffee is selected
- Returns starred reference brew, or falls back to latest brew
- When user selects a different reference via "Change", fetches that brew's data from `GET /api/v1/brews/:id`

### Empty States

**No brews for coffee:**
```
+---------------------------------+
| Reference                       |
| --------------------------------|
|                                 |
| No brews yet for this           |
| coffee. This will show your     |
| reference brew parameters after |
| you log some brews.             |
|                                 |
+---------------------------------+
```

---

## Toast Notifications

The following actions trigger toast notifications (see [design-system.md](../foundations/design-system.md) for style/duration):

| Action | Type | Message |
|--------|------|---------|
| Save brew (create/update) | Success | "Brew saved" |
| Delete brew | Success | "Brew deleted" |
| Star/unstar reference | Success | "Reference updated" / "Reference cleared" |
| Archive coffee | Success | "Coffee archived" |
| Unarchive coffee | Success | "Coffee unarchived" |
| Delete coffee | Success | "Coffee deleted" |
| Water weight mismatch | Warning | "Sum of pours (X g) differs from water weight (Y g)" |
| Server error | Error | "Something went wrong. Please try again." |

---

## Autocomplete Behavior (Coffee Form)

Applies to: roaster, country, process fields in the Add/Edit Coffee form.

- **Debounce:** 300ms after last keystroke before fetching suggestions
- **Minimum characters:** 2 characters before triggering autocomplete
- **Empty state:** "No matches" message when query returns no results
- **Endpoint:** `GET /api/v1/coffees/suggestions?field={field}&q={query}`

---

## Mobile Form Layout

- Brew form takes full width on mobile (no side margins beyond standard page padding)
- Reference sidebar presented as Sheet overlay (see sidebar layout above)
- Pours: displayed as stacked cards on mobile (not inline row layout)
- All collapsible sections work identically on mobile and desktop

---

## Design Decisions

### Single Form Over Wizard

The brew form uses a single scrollable page with collapsible sections instead of a multi-step wizard because:
- Reduces step count from 7 to 1 page with 3 optional sections
- All fields visible at a glance when expanded
- Faster for experienced users who want to fill everything
- No step-tracking UI complexity (progress indicators, step circles)
- Sections collapsed by default keeps it clean for quick entries

### Collapsible Sections All Collapsed

All 3 sections (Setup, Brewing, Tasting) are collapsed by default because:
- Quick log: just pick coffee, add notes/score, save
- Detailed log: expand the sections you care about
- Progressive disclosure without forcing navigation

### Bloom as Pour #1

Bloom is modeled as the first pour (with a `wait_time` field) rather than separate bloom fields because:
- Simplifies the data model — one table for all pours including bloom
- `wait_time` on pour #1 captures the bloom wait naturally
- Reduces field count (removed separate `bloom_water` and `bloom_time`)
- More flexible — some techniques don't use a traditional bloom

### Reduced Sensory Attributes (9 -> 6)

Reduced from 9 to 6 sensory attributes (removed flavor, cleanliness, balance) because:
- Flavor overlaps heavily with the overall score
- Cleanliness is hard to distinguish from other attributes for most users
- Balance is a meta-attribute that's better captured by overall score
- 6 attributes is enough granularity without being overwhelming
- Faster to fill out during tasting

### No Per-Sensory Notes

Removed per-attribute notes (e.g., `aroma_notes`) because:
- `overall_notes` covers the tasting narrative
- Per-attribute notes were rarely useful in practice
- Reduces form fields significantly (removed 9 text fields)

### Minimal Required Fields

Only `coffee_id` is required because:
- Reduces friction for quick logging
- Users may not have measuring equipment initially
- Overall notes are encouraged but not enforced

### Auto-Fill Priority Chain

Starred reference > latest brew > user defaults > blank because:
- Starred reference is the user's explicit choice — highest priority
- Latest brew provides continuity when no reference is starred
- User defaults provide a baseline for new coffees
- Blank is the fallback when nothing else exists

### Days Off Roast as Stored Column

`days_off_roast` is stored on the brew (not computed at read time) because:
- Immutable once saved — the value captures the state at brew time
- Coffee's `roast_date` may be updated later (new bag), which shouldn't retroactively change historical brews
- Simpler queries — no need to join coffee table for this field

### Brew Date User-Editable

`brew_date` is user-provided via a calendar date picker, defaulting to today if omitted. It is included in both POST and PUT request bodies and cannot be in the future. Combined with coffee's `roast_date`, this enables calculating `days_off_roast` at save time. Users can back-date brews (e.g., logging a brew from yesterday) which is a common need.

### Ratio-Driven Water Calculation

Ratio is a numeric value (e.g., 15 for 1:15) that drives water calculation:
- User enters coffee_weight and ratio
- water_weight is computed as `coffee_weight × ratio` and displayed as a read-only value
- water_weight is not stored in the database — only coffee_weight and ratio are persisted

### Structured Pours

Pour data stored in a separate `brew_pours` table because:
- Enables variable number of pours (not limited to 3)
- Structured data allows for analysis and correlation
- Each pour captures water amount, style, and optional wait time
- Pour #1 with wait_time naturally represents bloom

### Reference Sidebar as Drawer on Mobile

Mobile uses a slide-out drawer instead of stacking below the form because:
- Form is the primary focus — sidebar should not push it down
- Drawer provides on-demand access without layout shift
- Consistent with mobile UX patterns for supplementary content

### Form-Level Reference Override

The "Change" reference in the sidebar doesn't persist because:
- Users may want to compare against a specific brew during this form interaction only
- Changing the coffee's permanent reference should be a deliberate action (done from coffee detail)
- Avoids accidental changes to the reference brew
