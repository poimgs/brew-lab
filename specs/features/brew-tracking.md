# Brew Tracking

## Overview

Brew tracking is the core feature—logging coffee brews with their parameters and outcomes. A Brew represents a single pour-over brewing session, capturing the full context: which coffee was used, all brewing parameters, and the resulting taste outcomes.

The design prioritizes:
- Minimal required fields (coffee only — everything else optional)
- Free navigation between wizard steps
- Auto-save drafts every 60 seconds
- User-configurable defaults
- Low-friction entry that scales with user sophistication

---

## Entity: Brew

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| coffee_id | UUID | Yes | Reference to Coffee entity |
| brew_date | timestamp | Auto | When the brew was recorded (defaults to now) |
| roast_date | date | No | Roast date for the specific bag used in this brew |
| overall_notes | text | No | Free-form notes about the brew |
| overall_score | integer | No | 1-10 rating |
| improvement_notes | text | No | Ideas for improving the next brew |
| is_draft | boolean | Auto | Whether this is an auto-saved draft (default false) |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

### Pre-Brew Variables

These are set before brewing begins.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| coffee_weight | decimal | grams | Dose of coffee grounds |
| water_weight | decimal | grams | Total water used. Calculated from coffee_weight x ratio, but can be overridden manually. |
| ratio | decimal | — | Brew ratio (e.g., 15 for 1:15). Used with coffee_weight to calculate water_weight. |
| grind_size | decimal | — | Numeric grinder setting (e.g., 3.5 for Fellow Ode 2) |
| water_temperature | decimal | C | Water temperature at pour |
| filter_paper_id | UUID | — | Reference to filter paper (see [Library](library.md)) |

### Brew Variables

Parameters during the brewing process.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| bloom_water | decimal | grams | Water used for bloom |
| bloom_time | integer | seconds | Bloom duration |
| pours | array | — | List of pour entries (see brew_pours table) |
| total_brew_time | integer | seconds | Total time from first pour to drawdown complete |
| drawdown_time | integer | seconds | Time for final drawdown |
| technique_notes | text | — | Additional technique details |

### Post-Brew Variables

Modifications made after brewing, before tasting.

| Field | Type | Description |
|-------|------|-------------|
| water_bypass_ml | integer | Water added post-brew in milliliters |
| mineral_profile_id | UUID | Reference to mineral profile (see [Library](library.md)) |

### Quantitative Outcomes

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| coffee_ml | decimal | milliliters | Volume of brewed coffee |
| tds | decimal | % | Total Dissolved Solids reading |
| extraction_yield | decimal | % | Calculated or measured extraction |

### Sensory Outcomes

All intensity fields are 1-10 scale. Each attribute has an intensity score and optional notes.

| Field | Type | Description |
|-------|------|-------------|
| aroma_intensity | integer | Strength and quality of aroma |
| aroma_notes | text | Aroma descriptors |
| body_intensity | integer | Body/mouthfeel weight and texture |
| body_notes | text | Body/mouthfeel descriptors |
| flavor_intensity | integer | Overall flavor intensity and clarity |
| flavor_notes | text | Taste descriptors |
| brightness_intensity | integer | Perceived acidity quality (liveliness, sparkle) |
| brightness_notes | text | Brightness/acidity descriptors |
| sweetness_intensity | integer | Perceived sweetness level |
| sweetness_notes | text | Sweetness descriptors |
| cleanliness_intensity | integer | Clarity and definition of flavors |
| cleanliness_notes | text | Cleanliness descriptors |
| complexity_intensity | integer | Layered, evolving flavor experience |
| complexity_notes | text | Complexity descriptors |
| balance_intensity | integer | Harmony between all taste attributes |
| balance_notes | text | Balance descriptors |
| aftertaste_intensity | integer | Strength and quality of aftertaste |
| aftertaste_notes | text | Aftertaste descriptors |

### Computed Properties

- **Days Off Roast**: `brew_date - brew.roast_date` (falls back to `coffee.roast_date` if brew's roast_date is null)
- **Calculated Ratio**: `water_weight / coffee_weight` (if both provided)
- **Extraction Yield**: `(coffee_ml x TDS%) / coffee_weight` (if all provided)

### Database Schema

```sql
CREATE TABLE brews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    coffee_id UUID NOT NULL REFERENCES coffees(id) ON DELETE RESTRICT,
    brew_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    roast_date DATE,
    is_draft BOOLEAN DEFAULT FALSE,

    -- Pre-brew variables
    coffee_weight DECIMAL(5,2),
    water_weight DECIMAL(6,2),
    ratio DECIMAL(4,1),
    grind_size DECIMAL(4,1),
    water_temperature DECIMAL(4,1),
    filter_paper_id UUID REFERENCES filter_papers(id),

    -- Brew variables
    bloom_water DECIMAL(5,2),
    bloom_time INTEGER,
    -- Pours stored in brew_pours table
    total_brew_time INTEGER,
    drawdown_time INTEGER,
    technique_notes TEXT,

    -- Post-brew variables
    water_bypass_ml INTEGER,
    mineral_profile_id UUID REFERENCES mineral_profiles(id),

    -- Quantitative outcomes
    coffee_ml DECIMAL(6,2),
    tds DECIMAL(4,2),
    extraction_yield DECIMAL(5,2),

    -- Sensory outcomes (1-10 scale)
    aroma_intensity INTEGER CHECK (aroma_intensity BETWEEN 1 AND 10),
    aroma_notes TEXT,
    body_intensity INTEGER CHECK (body_intensity BETWEEN 1 AND 10),
    body_notes TEXT,
    flavor_intensity INTEGER CHECK (flavor_intensity BETWEEN 1 AND 10),
    flavor_notes TEXT,
    brightness_intensity INTEGER CHECK (brightness_intensity BETWEEN 1 AND 10),
    brightness_notes TEXT,
    sweetness_intensity INTEGER CHECK (sweetness_intensity BETWEEN 1 AND 10),
    sweetness_notes TEXT,
    cleanliness_intensity INTEGER CHECK (cleanliness_intensity BETWEEN 1 AND 10),
    cleanliness_notes TEXT,
    complexity_intensity INTEGER CHECK (complexity_intensity BETWEEN 1 AND 10),
    complexity_notes TEXT,
    balance_intensity INTEGER CHECK (balance_intensity BETWEEN 1 AND 10),
    balance_notes TEXT,
    aftertaste_intensity INTEGER CHECK (aftertaste_intensity BETWEEN 1 AND 10),
    aftertaste_notes TEXT,

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
    notes TEXT,
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
```
GET /api/v1/brews
```

**Query Parameters:**
- `page`, `per_page`: Pagination
- `sort`: Field name, `-` prefix for descending (default: `-brew_date`)
- `coffee_id`: Filter by coffee
- `score_gte`: Minimum score
- `score_lte`: Maximum score
- `has_tds`: `true` to only show brews with TDS data
- `date_from`, `date_to`: Date range filter

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "coffee_id": "uuid",
      "coffee": {
        "id": "uuid",
        "roaster": "Cata Coffee",
        "name": "Kiamaina",
        "roast_date": "2025-11-19"
      },
      "filter_paper_id": "uuid",
      "filter_paper": {
        "id": "uuid",
        "name": "Abaca",
        "brand": "Cafec"
      },
      "brew_date": "2026-01-19T10:30:00Z",
      "roast_date": "2025-11-19",
      "days_off_roast": 61,
      "coffee_weight": 15.0,
      "water_weight": 225.0,
      "ratio": 15.0,
      "grind_size": 3.5,
      "overall_score": 7,
      "overall_notes": "Bright acidity, lemon notes...",
      "improvement_notes": "Try finer grind next time",
      "created_at": "2026-01-19T10:35:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

### Create Brew
```
POST /api/v1/brews
```

**Request:**
```json
{
  "coffee_id": "uuid",
  "roast_date": "2025-11-19",
  "coffee_weight": 15.0,
  "ratio": 15.0,
  "water_weight": 225.0,
  "grind_size": 3.5,
  "water_temperature": 90.0,
  "filter_paper_id": "uuid",
  "bloom_water": 45.0,
  "bloom_time": 75,
  "pours": [
    { "pour_number": 1, "water_amount": 90.0, "pour_style": "circular", "notes": "Gentle circles" },
    { "pour_number": 2, "water_amount": 90.0, "pour_style": "circular", "notes": "Faster pour" }
  ],
  "overall_notes": "Bright acidity, lemon notes",
  "overall_score": 7,
  "is_draft": false
}
```

**Notes:**
- `water_weight` is calculated from `coffee_weight x ratio` if not provided
- `water_weight` can be manually overridden by providing it explicitly
- `pours` array creates corresponding `brew_pours` records
- `roast_date` defaults to the coffee's roast_date if not provided
- Only `coffee_id` is required. All other fields are optional.
- `is_draft: true` marks the brew as an auto-save draft

**Response:** `201 Created` with brew object including computed fields and nested pours

### Get Brew
```
GET /api/v1/brews/:id
```

**Response:** Full brew object with nested coffee and computed properties

### Update Brew
```
PUT /api/v1/brews/:id
```

**Request:** Full or partial brew object

**Response:** Updated brew object

### Delete Brew
```
DELETE /api/v1/brews/:id
```

**Response:** `204 No Content`

### Copy Brew as Template
```
POST /api/v1/brews/:id/copy
```

Creates a new brew with same parameters:
- New ID and timestamps
- All parameters copied including `coffee_id` and `roast_date`
- `overall_notes`, `overall_score`, and `improvement_notes` cleared (must be entered fresh)
- Sensory scores and sensory notes are NOT copied (only input parameters)
- `brew_date` set to now

**Response:** `201 Created` with new brew template

### Brew Detail Display

Brew details are displayed in a **modal dialog** (not a dedicated page). The modal is opened from:
- Coffee detail page brew history rows
- Dashboard brew history rows
- Session brew lists

See [dashboard.md](dashboard.md) for the full brew detail modal specification.

---

## User Defaults

For defaults API endpoints and database schema, see [User Preferences](user-preferences.md).

### Pour Defaults

Users can configure default pour templates that are applied when entering the Brew step for new brews.

**Structure:**
- Pour defaults are stored as a JSON string containing an array of pour templates
- Each template specifies: `water_amount`, `pour_style`, and optional `notes`
- When the user enters the Brew step, the pours field is pre-populated with these defaults
- Users can modify, add, or remove pours as needed for each brew

**Example JSON:**
```json
{
  "pours": [
    { "water_amount": 90, "pour_style": "circular", "notes": "" },
    { "water_amount": 90, "pour_style": "circular", "notes": "" }
  ]
}
```

---

## User Interface

### User Stories

1. **Quick Log**: As a user, I can log a basic brew in under 30 seconds
2. **Detailed Log**: As a user, I can add detailed parameters when I want precision
3. **Use Defaults**: As a user, I can set defaults for my common setup to reduce entry
4. **Edit Later**: As a user, I can add details after the initial entry
5. **Copy Previous**: As a user, I can start from a previous brew's settings
6. **Auto-Save**: As a user, my in-progress brew is auto-saved so I don't lose data

### Entry Flow

**Step 1: Select Coffee (Required)**
```
+---------------------------------------+
| New Brew                              |
+---------------------------------------+
| Select Coffee*                        |
| [Search coffees...               v]   |
|                                       |
| Roast Date (this bag)                 |
| [____/____/____]                      |
|                                       |
| Recent:                               |
| - Kiamaina - Cata Coffee (61 days)    |
| - El Calagual - Cata Coffee (52 days) |
| - Stellar S Venus - Curista           |
+---------------------------------------+
```

**Step 2-7: All steps freely navigable**

All wizard steps are always clickable. Users can jump to any step at any time.

```
+---------------------------------------+
| Kiamaina - Cata Coffee                |
| 61 days off roast    Saved at 10:32   |
+---------------------------------------+
|                                       |
| Overall Notes                         |
| [                                 ]   |
| [                                 ]   |
|                                       |
| Overall Score                         |
| [  ] 1-10                             |
|                                       |
| [+ Pre-Brew Variables]                |
| [+ Brew Variables]                    |
| [+ Post-Brew Variables]              |
| [+ Quantitative Outcomes]            |
| [+ Sensory Outcomes]                 |
|                                       |
|      [Cancel]  [Save Brew]           |
+---------------------------------------+
```

**Expanded Section Example (Pre-Brew):**
```
| --- Pre-Brew Variables ---        [-] |
|                                       |
| Coffee Weight    [15    ] g           |
| Ratio            [15    ] (1:15)      |
| Water Weight     [225   ] g           |
| Grind Size       [3.5   ]             |
| Temperature      [90    ] C           |
| Filter           [Select filter... v] |
```

Note: Water weight is auto-calculated from coffee_weight x ratio but the "(auto-calculated)" indicator is not displayed. The calculation still happens automatically when coffee weight and ratio are entered.

### Field Sections

**Pre-Brew Variables:**
- Coffee Weight (g)
- Ratio (numeric, e.g., 15 for 1:15)
- Water Weight (g) - calculated from coffee_weight x ratio, editable to override
- Grind Size (numeric, e.g., 3.5 for Fellow Ode 2)
- Water Temperature (C)
- Filter Paper (dropdown, see [Library](library.md))

**Brew Variables:**
- Bloom Water (g)
- Bloom Time (seconds)
- Pours (dynamic list):
  - Pour Number (auto-incremented)
  - Water Amount (g)
  - Pour Style (dropdown: circular, center, pulse)
  - Notes (text)
  - [+ Add Pour] button
  - Pre-populated from user's pour defaults (if configured)
- Total Brew Time (seconds)
- Drawdown Time (seconds)
- Technique Notes (text)

**Water Weight Validation:**
- Non-blocking warning when `bloom_water + sum(pour amounts) != water_weight`
- Displayed as informational warning, does not prevent saving
- Helps users catch input errors

**Post-Brew Variables:**
- Water Bypass (ml) - with equal spacing to mineral profile
- Mineral Profile (dropdown with "None" option, see [Library](library.md))

**Quantitative Outcomes (Step 5):**
- Coffee (ml) - volume of brewed coffee
- TDS (%)
- Extraction Yield (%)
- **Target Goals subsection** (editable, see Target Goals on Wizard Steps below)

**Sensory Outcomes (Step 6):**

Nine sensory attributes, each with intensity (1-10) and optional notes:

1. Aroma - strength and quality of smell
2. Body - weight and texture of mouthfeel
3. Flavor - overall taste intensity and clarity
4. Brightness - perceived acidity quality (liveliness, sparkle)
5. Sweetness - perceived sweetness level
6. Cleanliness - clarity and definition of flavors
7. Complexity - layered, evolving flavor experience
8. Balance - harmony between all taste attributes
9. Aftertaste - strength and quality of finish

- **Target Goals subsection** (editable, see Target Goals on Wizard Steps below)

**Flavor Wheel Reference:**
- Collapsible image showing SCA/common flavor wheel
- Helps users identify and describe flavor notes
- Displayed in a collapsible section to save space

### Target Goals on Wizard Steps

Steps 5 (Quantitative) and 6 (Sensory) include editable target goal sections that allow users to view and update their coffee's target goals inline while filling out the brew.

**Step 5 — Quantitative Outcomes:**
```
+---------------------------------------+
| --- Quantitative Outcomes ---         |
|                                       |
| Coffee (ml)      [180   ]             |
| TDS (%)          [1.38  ]             |
| Extraction (%)   [20.1  ]             |
|                                       |
| --- Target Goals ---                  |
| Coffee (ml)      [180   ]             |
| TDS              [1.38  ]             |
| Extraction       [20.5  ]             |
|                                       |
|       [Back]  [Next]  [Save Brew]     |
+---------------------------------------+
```

**Step 6 — Sensory Outcomes:**
```
+---------------------------------------+
| --- Sensory Outcomes ---              |
|                                       |
| [Sensory attribute fields...]         |
|                                       |
| --- Target Goals ---                  |
| Aroma       [7 ]  Sweetness  [8 ]    |
| Body        [7 ]  Flavor     [8 ]    |
| Brightness  [7 ]  Cleanliness [7]    |
| Complexity  [6 ]  Balance    [8 ]    |
| Aftertaste  [7 ]  Overall    [9 ]    |
|                                       |
|       [Back]  [Next]  [Save Brew]     |
+---------------------------------------+
```

**Behavior:**
- Target goals are fetched when a coffee is selected (from `GET /api/v1/coffees/:id/goals`)
- Goals are pre-populated with existing values (if any)
- Changes to target goals are saved via `PUT /api/v1/coffees/:id/goals` when the user navigates away from the step or saves
- Target goal fields are visually distinct from brew outcome fields (e.g., different background or border)
- All target goal fields are optional
- Step 5 targets: `coffee_ml`, `tds`, `extraction_yield`
- Step 6 targets: 9 sensory intensities (`aroma_intensity`, `sweetness_intensity`, `body_intensity`, `flavor_intensity`, `brightness_intensity`, `cleanliness_intensity`, `complexity_intensity`, `balance_intensity`, `aftertaste_intensity`) + `overall_score`

### Defaults System

**Setting Defaults:**

Brew defaults are managed in User Preferences (see [user-preferences.md](user-preferences.md) for UI wireframe).

Navigate to: User menu → Preferences → Brew Defaults section

**Default Behavior:**
- Defaults pre-populate fields when expanding sections
- User can override any default per brew
- Defaults are per-user
- Clear button removes individual defaults

### Copy from Previous

**Access Points:**
- Brew list: "Copy" action on brew row
- Brew detail: "Use as Template" button

**Behavior:**
- Creates new brew with same parameters including coffee selection
- Notes and score are NOT copied (must be entered fresh)
- Useful for A/B testing with one variable changed

### Real-Time Calculations

**Water Weight Calculation:**
- If coffee weight and ratio entered, water weight is calculated: `coffee_weight x ratio`
- User can override water_weight by editing the field directly
- Visual indicator shows "calculated" vs "manual" state
- Example: 15g coffee x 15 ratio = 225g water

**Extraction Yield:**
- If TDS, coffee weight, and coffee_ml entered:
- `EY = (coffee_ml x TDS%) / coffee_weight`
- Display calculated value with "calculated" indicator

**Days Off Roast:**
- Calculated from brew's roast_date (or coffee's roast_date as fallback) and brew_date
- Displayed but not stored (derived on read)

### Validation

**Required:**
- Coffee selection (only field required for saving)

**Format Validation:**
- Weights: Positive decimals
- Temperature: 0-100C
- Intensity scores: 1-10 integers
- Times: Positive integers (seconds)
- Volume: Positive decimals for coffee_ml

**Warnings (not blocking):**
- Unusual values: "Temperature 50C seems low for brewing"
- Missing common fields: "Consider adding brew time for better analysis"
- Water weight mismatch: "Bloom + pours (X g) differs from water weight (Y g)"

### Navigation & Save Behavior

**Free Navigation:**
- All wizard step circles are always clickable
- Users can jump to any step at any time
- No step-locking or forced linear progression

**Auto-Save:**
- Auto-saves as draft every 60 seconds after coffee_id is set
- Status indicator in form header: "Saving..." / "Saved at HH:MM" / "Unsaved changes"
- First auto-save creates the brew (POST with `is_draft: true`), subsequent auto-saves update it (PUT)
- Auto-save compares form values to last-saved snapshot; only saves if dirty

**Save Brew:**
- "Save Brew" button available on every step (alongside "Next" on non-last steps)
- Validates only coffee_id, then saves with `is_draft: false`
- If the brew was previously auto-saved as a draft, updates it (PUT with `is_draft: false`)
- If new, creates it (POST with `is_draft: false`)

**Continue Brew:**
- When a coffee has a draft brew, the coffee card shows a "Continue Brew" button
- Clicking "Continue Brew" opens the wizard with the draft's data pre-loaded
- The draft ID is tracked so updates go to the existing draft

### Wizard Progress Indicator

The wizard displays a progress indicator showing all steps with their current state.

**Step Circles:**
```
+---------------------------------------------------+
|  1 --- 2 --- 3 --- 4 --- 5 --- 6 --- 7            |
|  *     o     o     o     o     o     o              |
| Coffee Pre   Brew  Post  Quant Sens  Notes          |
+---------------------------------------------------+
```

**States:**
- **Default**: Neutral circle (unfilled)
- **Active**: Highlighted circle (current step)
- **Completed**: Filled circle (step visited and has data)

All steps are always clickable regardless of state.

---

## Reference Sidebar

When logging a brew, users can view reference information for the selected coffee in a sidebar. This shows the reference brew parameters and target goals, providing context while filling out the form.

### Layout

**Desktop (lg+ breakpoints):**
```
+-----------------------------------+---------------------------------+
| Log Brew                          | Reference Brew        [Change]  |
|                                   | --------------------------------|
| Coffee*  [Kiamaina - Cata v]      | Based on: Jan 15 brew           |
|                                   |                                 |
| --- Pre-Brew ---                  | INPUT PARAMETERS                |
| Coffee (g)  [15        ]          | - Coffee: 15g                   |
| Ratio       [15        ]          | - Ratio: 1:15                   |
| Water (g)   [225       ] calc     | - Water: 225g                   |
| Grind       [3.5       ]          | - Grind: 3.5                    |
| Temp (C)    [96        ]          | - Temp: 96C                     |
| Filter      [Abaca v   ]          | - Filter: Abaca                 |
|                                   | - Bloom: 40g / 30s              |
| --- Brew ---                      |                                 |
| Bloom (g)   [40        ]          | ---------------------------------|
| Bloom (s)   [30        ]          | TARGET GOALS              [edit]|
| ...                               | - TDS: 1.35-1.40                |
|                                   | - Extraction: 20-22%            |
| --- Outcomes ---                  | - Brightness: 7/10              |
| TDS         [1.38      ]          | - Sweetness: 8/10               |
| Extraction  [20.1      ]          | - Balance: 8/10                 |
| ...                               | - Overall: 9/10                 |
|                                   |                                 |
|                                   | ---------------------------------|
|                                   | IMPROVEMENT NOTES               |
|                                   | "Try finer grind to boost       |
|                                   | sweetness, maybe 3.2"           |
|                                   |                                 |
|              [Save Brew]          | [Copy Parameters]               |
+-----------------------------------+---------------------------------+
```

**Mobile (< lg breakpoint):**

On mobile, the sidebar is a **slide-out drawer** (Sheet component) rather than stacking below the form:
- Triggered by a "Reference" floating button visible on all wizard steps
- Slides in from the right, overlays the form
- Same content and functionality as desktop sidebar
- Close button or swipe to dismiss

### Select Different Reference Brew

A **[Change]** button in the sidebar header allows the user to view a different brew as the reference during this session.

**Behavior:**
- Clicking "Change" opens a modal dialog listing all brews for the selected coffee
- Dialog shows: Date, Score, key params (grind, ratio, temp) for each brew
- Current sidebar reference has a checkmark
- Selecting a brew updates the sidebar to show that brew's parameters
- This is a **session-level override** — it does NOT change the coffee's `best_brew_id` in the database
- Useful for comparing against a specific past brew while brewing
- Reset to default reference when coffee selection changes

### Sidebar Behavior

**Visibility:**
- Sidebar hidden when no coffee is selected
- Desktop: Sidebar appears when coffee is selected (collapsed by default), fixed position on the right (w-80)
- Mobile: "Reference" button appears when coffee is selected
- Expansion state persists during the session

**Data Source:**
- Fetches data from `GET /api/v1/coffees/:id/reference` when coffee is selected
- Shows reference brew parameters (or latest if no reference marked)
- Shows target goals if they exist for this coffee
- When user selects a different reference via "Change", fetches that brew's data from `GET /api/v1/brews/:id`

**Sections:**

1. **Reference Brew Header**
   - Shows date of the reference brew
   - [Change] button to select a different reference
   - Indicates if this is explicitly marked reference or just latest

2. **Input Parameters**
   - Coffee weight, ratio, water weight
   - Grind size, temperature
   - Filter paper name
   - Bloom water and time
   - Total brew time (if recorded)

3. **Target Goals** (editable)
   - Target outcome values (TDS, extraction, sensory scores)
   - Edit icon opens inline edit or modal
   - Changes saved to `PUT /api/v1/coffees/:id/goals`

4. **Improvement Notes**
   - Shows the latest brew's `improvement_notes` for this coffee
   - Read-only in sidebar context

**Actions:**

- **Copy Parameters**: Fills form fields with reference brew's input parameters
  - Copies: coffee weight, ratio, water weight, grind, temp, filter, bloom
  - Does NOT copy: outcomes, sensory data, notes
  - Shows toast confirmation: "Parameters copied from Jan 15 brew"

- **Edit Goals** (edit icon): Opens inline editor for target goals
  - All goal fields editable
  - Save/Cancel buttons
  - Auto-saves on blur or explicit save

### Empty States

**No brews for coffee:**
```
+---------------------------------+
| Reference Brew                  |
| --------------------------------|
|                                 |
| No brews yet for this           |
| coffee. This will show your     |
| reference brew parameters after |
| you log some brews.             |
|                                 |
| --------------------------------|
| TARGET GOALS              [edit]|
| No goals set. Add targets to    |
| track what you're aiming for.   |
|                                 |
+---------------------------------+
```

**No goals set:**
```
| TARGET GOALS              [Add] |
| No goals set yet.               |
| Set targets for TDS,            |
| extraction, or taste scores.    |
```

---

## Design Decisions

### Minimal Required Fields

Only `coffee_id` is required because:
- Reduces friction for quick logging
- Users may not have measuring equipment initially
- Auto-save captures whatever the user enters, even if incomplete
- Overall notes are encouraged but not enforced

### Roast Date Per Brew

`roast_date` is on the brew (not just the coffee) because:
- Same coffee beans bought at different times have different roast dates (multi-bag support)
- Days Off Roast calculation is per-brew, using the brew's roast_date
- Falls back to coffee's roast_date for backwards compatibility
- Coffee detail shows "Latest Roast Date" for the coffee-level roast_date

### Free Navigation

All wizard steps are always clickable because:
- Users know their own workflow — some fill sensory first, others parameters
- Reduces frustration from forced linear progression
- Auto-save prevents data loss regardless of navigation pattern
- Validation only happens on final "Save Brew"

### Auto-Save Replacing Manual Drafts

Auto-save every 60 seconds replaces the manual "Save Draft" button because:
- Users don't have to remember to save
- Prevents data loss from accidental navigation
- Reduces cognitive load — one less decision to make
- Status indicator keeps users informed without requiring action

### Brew Date Auto-Population

`brew_date` defaults to current timestamp at entry. Users can edit it for backdated entries. Combined with brew's `roast_date` (or coffee's `roast_date`), this enables calculating days off roast.

### Structured Pours

Pour data stored in a separate `brew_pours` table because:
- Enables variable number of pours (not limited to 3)
- Structured data allows for analysis and correlation
- Each pour captures water amount, style, and notes
- Maintains flexibility while enabling pattern discovery

### Ratio-Driven Water Calculation

Ratio is a numeric value (e.g., 15 for 1:15) that drives water calculation:
- User enters coffee_weight and ratio
- water_weight is calculated as coffee_weight x ratio
- User can override water_weight manually if needed
- Common workflow: "I use 15g at 1:15" -> auto-calculates 225g water

### Sensory Scales

1-10 scale chosen for consistency and granularity:
- Sufficient resolution to track changes
- Intuitive for users
- Matches common cupping conventions

### Sessions for Brew Grouping

Brews can be grouped into sessions for deliberate variable testing. See [sessions.md](sessions.md) for the full Sessions feature spec. Sessions are created from the coffee detail page and group brews with a hypothesis and conclusion.

### Collapsible Sections

Optional fields in collapsible sections because:
- Reduces visual overwhelm for quick entries
- Users expand what they care about
- Sections remember expansion state per session
- Progressive disclosure pattern

### Grind Size as Numeric

Grind size is a decimal value rather than free text because:
- App assumes Fellow Ode 2 grinder (see index.md)
- Numeric values enable correlation analysis
- Common usage: "3.5" rather than "3.5 on Ode"
- Future equipment tracking can add grinder context if needed

### No Timer Integration (Initial)

Built-in timer not included initially:
- Users have phone timers, scales with timers
- Adds significant UI complexity
- Can be added later as enhancement

### Target Goals Inline on Wizard Steps

Target goals editable directly on quantitative/sensory steps because:
- Users can compare their outcomes against targets as they fill them in
- Reduces context switching between brew form and coffee goals
- Goals naturally evolve as users learn about a coffee
- Saves are implicit (on step navigation), reducing friction

### Reference Sidebar as Drawer on Mobile

Mobile uses a slide-out drawer instead of stacking below the form because:
- Form is the primary focus — sidebar should not push it down
- Drawer provides on-demand access without layout shift
- Consistent with mobile UX patterns for supplementary content
- Right-side slide matches the desktop sidebar position

### Session-Level Reference Override

The "Change" reference in the sidebar doesn't persist because:
- Users may want to compare against a specific brew during this session only
- Changing the coffee's permanent reference should be a deliberate action (done from coffee detail)
- Avoids accidental changes to the reference brew

---

## Open Questions

1. **Equipment Tracking**: Should brewer device (V60, Kalita, etc.) be a field? Currently implicit.
2. **Photo Attachments**: Capture images of the brew/cup?
3. **Timestamps During Brew**: Would step-by-step timer integration be valuable?
4. **Offline Support**: Cache form state if connection lost?
5. **Timer**: Add built-in brew timer with auto-fill?
6. **Voice Entry**: Dictate notes while brewing?
