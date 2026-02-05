# Brew Tracking

## Overview

Brew tracking is the core feature—logging coffee experiments with their parameters and outcomes. An Experiment represents a single pour-over brewing session, capturing the full context: which coffee was used, all brewing parameters, and the resulting taste outcomes.

The design prioritizes:
- Minimal required fields (coffee + notes only)
- Progressive disclosure of optional fields
- Quick entry during/after brewing
- User-configurable defaults
- Low-friction entry that scales with user sophistication

---

## Entity: Experiment

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| coffee_id | UUID | Yes | Reference to Coffee entity |
| brew_date | timestamp | Auto | When the experiment was recorded (defaults to now) |
| overall_notes | text | Yes | Free-form notes about the brew |
| overall_score | integer | No | 1-10 rating |
| improvement_notes | text | No | Ideas for improving the next brew |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

### Pre-Brew Variables

These are set before brewing begins.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| coffee_weight | decimal | grams | Dose of coffee grounds |
| water_weight | decimal | grams | Total water used. Calculated from coffee_weight × ratio, but can be overridden manually. |
| ratio | decimal | — | Brew ratio (e.g., 15 for 1:15). Used with coffee_weight to calculate water_weight. |
| grind_size | decimal | — | Numeric grinder setting (e.g., 3.5 for Fellow Ode 2) |
| water_temperature | decimal | °C | Water temperature at pour |
| filter_paper_id | UUID | — | Reference to filter paper (see [Library](library.md)) |

### Brew Variables

Parameters during the brewing process.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| bloom_water | decimal | grams | Water used for bloom |
| bloom_time | integer | seconds | Bloom duration |
| pours | array | — | List of pour entries (see experiment_pours table) |
| total_brew_time | integer | seconds | Total time from first pour to drawdown complete |
| drawdown_time | integer | seconds | Time for final drawdown |
| technique_notes | text | — | Additional technique details |

### Post-Brew Variables

Modifications made after brewing, before tasting.

| Field | Type | Description |
|-------|------|-------------|
| serving_temperature | enum | Hot, Warm, Cold |
| water_bypass | string | Water added post-brew (e.g., "5 drops") |
| mineral_additions | string | Mineral modifiers added (e.g., "2 drops Catalyst") |

### Quantitative Outcomes

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| final_weight | decimal | grams | Weight of brewed coffee |
| tds | decimal | % | Total Dissolved Solids reading |
| extraction_yield | decimal | % | Calculated or measured extraction |

### Sensory Outcomes

All intensity fields are 1-10 scale.

| Field | Type | Description |
|-------|------|-------------|
| aroma_intensity | integer | Strength of aroma |
| aroma_notes | text | Aroma descriptors |
| acidity_intensity | integer | Perceived acidity level |
| acidity_notes | text | Acidity descriptors |
| sweetness_intensity | integer | Perceived sweetness level |
| sweetness_notes | text | Sweetness descriptors |
| bitterness_intensity | integer | Perceived bitterness level |
| bitterness_notes | text | Bitterness descriptors |
| body_weight | integer | Body/mouthfeel weight |
| body_notes | text | Body/mouthfeel descriptors |
| flavor_intensity | integer | Overall flavor intensity |
| flavor_notes | text | Taste descriptors |
| aftertaste_duration | integer | How long aftertaste persists |
| aftertaste_intensity | integer | Strength of aftertaste |
| aftertaste_notes | text | Aftertaste descriptors |

### Computed Properties

- **Days Off Roast**: `brew_date - coffee.roast_date` (if roast_date provided)
- **Calculated Ratio**: `water_weight / coffee_weight` (if both provided)
- **Extraction Yield**: `(final_weight × tds) / coffee_weight` (if all provided)

### Database Schema

```sql
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    coffee_id UUID NOT NULL REFERENCES coffees(id) ON DELETE RESTRICT,
    brew_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

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
    -- Pours stored in experiment_pours table
    total_brew_time INTEGER,
    drawdown_time INTEGER,
    technique_notes TEXT,

    -- Post-brew variables
    serving_temperature VARCHAR(20),
    water_bypass VARCHAR(100),
    mineral_additions VARCHAR(255),

    -- Quantitative outcomes
    final_weight DECIMAL(6,2),
    tds DECIMAL(4,2),
    extraction_yield DECIMAL(5,2),

    -- Sensory outcomes (1-10 scale)
    aroma_intensity INTEGER CHECK (aroma_intensity BETWEEN 1 AND 10),
    aroma_notes TEXT,
    acidity_intensity INTEGER CHECK (acidity_intensity BETWEEN 1 AND 10),
    acidity_notes TEXT,
    sweetness_intensity INTEGER CHECK (sweetness_intensity BETWEEN 1 AND 10),
    sweetness_notes TEXT,
    bitterness_intensity INTEGER CHECK (bitterness_intensity BETWEEN 1 AND 10),
    bitterness_notes TEXT,
    body_weight INTEGER CHECK (body_weight BETWEEN 1 AND 10),
    body_notes TEXT,
    flavor_intensity INTEGER CHECK (flavor_intensity BETWEEN 1 AND 10),
    flavor_notes TEXT,
    aftertaste_duration INTEGER CHECK (aftertaste_duration BETWEEN 1 AND 10),
    aftertaste_intensity INTEGER CHECK (aftertaste_intensity BETWEEN 1 AND 10),
    aftertaste_notes TEXT,

    -- Overall assessment
    overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),
    overall_notes TEXT NOT NULL,
    improvement_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE experiment_pours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    pour_number INTEGER NOT NULL,
    water_amount DECIMAL(5,2),
    pour_style VARCHAR(50),
    notes TEXT,
    UNIQUE(experiment_id, pour_number)
);

CREATE INDEX idx_experiments_user_id ON experiments(user_id);
CREATE INDEX idx_experiments_coffee_id ON experiments(coffee_id);
CREATE INDEX idx_experiments_brew_date ON experiments(brew_date);
CREATE INDEX idx_experiment_pours_experiment_id ON experiment_pours(experiment_id);
```

---

## API Endpoints

### List Experiments
```
GET /api/v1/experiments
```

**Query Parameters:**
- `page`, `per_page`: Pagination
- `sort`: Field name, `-` prefix for descending (default: `-brew_date`)
- `coffee_id`: Filter by coffee
- `score_gte`: Minimum score
- `score_lte`: Maximum score
- `has_tds`: `true` to only show experiments with TDS data
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

### Create Experiment
```
POST /api/v1/experiments
```

**Request:**
```json
{
  "coffee_id": "uuid",
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
  "overall_score": 7
}
```

**Notes:**
- `water_weight` is calculated from `coffee_weight × ratio` if not provided
- `water_weight` can be manually overridden by providing it explicitly
- `pours` array creates corresponding `experiment_pours` records

**Response:** `201 Created` with experiment object including computed fields and nested pours

### Get Experiment
```
GET /api/v1/experiments/:id
```

**Response:** Full experiment object with nested coffee and computed properties

### Update Experiment
```
PUT /api/v1/experiments/:id
```

**Request:** Full or partial experiment object

**Response:** Updated experiment object

### Delete Experiment
```
DELETE /api/v1/experiments/:id
```

**Response:** `204 No Content`

### Copy Experiment as Template
```
POST /api/v1/experiments/:id/copy
```

Creates a new experiment with same parameters:
- New ID and timestamps
- All parameters copied including `coffee_id`
- `overall_notes`, `overall_score`, and `improvement_notes` cleared (must be entered fresh)
- Sensory scores and sensory notes are NOT copied (only input parameters)
- `brew_date` set to now

**Response:** `201 Created` with new experiment template

---

## User Defaults

For defaults API endpoints and database schema, see [User Preferences](user-preferences.md).

---

## User Interface

### User Stories

1. **Quick Log**: As a user, I can log a basic brew in under 30 seconds
2. **Detailed Log**: As a user, I can add detailed parameters when I want precision
3. **Use Defaults**: As a user, I can set defaults for my common setup to reduce entry
4. **Edit Later**: As a user, I can add details after the initial entry
5. **Copy Previous**: As a user, I can start from a previous experiment's settings

### Entry Flow

**Step 1: Select Coffee (Required)**
```
┌─────────────────────────────────────────┐
│ New Experiment                          │
├─────────────────────────────────────────┤
│ Select Coffee*                          │
│ [Search coffees...               ▼]     │
│                                         │
│ Recent:                                 │
│ • Kiamaina - Cata Coffee (61 days)      │
│ • El Calagual - Cata Coffee (52 days)   │
│ • Stellar S Venus - Curista             │
└─────────────────────────────────────────┘
```

**Step 2: Main Entry Form**
```
┌─────────────────────────────────────────┐
│ Kiamaina · Cata Coffee                  │
│ 61 days off roast                       │
├─────────────────────────────────────────┤
│                                         │
│ Overall Notes*                          │
│ [                                   ]   │
│ [                                   ]   │
│                                         │
│ Overall Score                           │
│ [  ] 1-10                               │
│                                         │
│ [+ Pre-Brew Variables]                  │
│ [+ Brew Variables]                      │
│ [+ Post-Brew Variables]                 │
│ [+ Quantitative Outcomes]               │
│ [+ Sensory Outcomes]                    │
│                                         │
│      [Cancel]  [Save Experiment]        │
└─────────────────────────────────────────┘
```

**Expanded Section Example (Pre-Brew):**
```
│ ─── Pre-Brew Variables ───        [−]   │
│                                         │
│ Coffee Weight    [15    ] g             │
│ Ratio            [15    ] (1:15)        │
│ Water Weight     [225   ] g (calculated)│
│ Grind Size       [3.5   ]               │
│ Temperature      [90    ] °C            │
│ Filter           [Select filter... ▼]   │
```

### Field Sections

**Pre-Brew Variables:**
- Coffee Weight (g)
- Ratio (numeric, e.g., 15 for 1:15)
- Water Weight (g) - calculated from coffee_weight × ratio, editable to override
- Grind Size (numeric, e.g., 3.5 for Fellow Ode 2)
- Water Temperature (°C)
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
- Total Brew Time (seconds)
- Drawdown Time (seconds)
- Technique Notes (text)

**Post-Brew Variables:**
- Serving Temperature (Hot/Warm/Cold)
- Water Bypass (description)
- Mineral Additions (description + profile selection)

**Quantitative Outcomes:**
- Final Weight (g)
- TDS (%)
- Extraction Yield (%)

**Sensory Outcomes:**
- Aroma Intensity (1-10) + Notes
- Acidity Intensity (1-10) + Notes
- Sweetness Intensity (1-10) + Notes
- Bitterness Intensity (1-10) + Notes
- Body Weight (1-10) + Notes
- Flavor Intensity (1-10) + Notes
- Aftertaste Duration (1-10)
- Aftertaste Intensity (1-10)
- Aftertaste Notes (text)

### Defaults System

**Setting Defaults:**

Brew defaults are managed in User Preferences (see [user-preferences.md](user-preferences.md) for UI wireframe).

Navigate to: User menu → Preferences → Brew Defaults section

**Default Behavior:**
- Defaults pre-populate fields when expanding sections
- User can override any default per experiment
- Defaults are per-user
- Clear button removes individual defaults

### Copy from Previous

**Access Points:**
- Experiment list: "Copy" action on experiment row
- Experiment detail: "Use as Template" button

**Behavior:**
- Creates new experiment with same parameters including coffee selection
- Notes and score are NOT copied (must be entered fresh)
- Useful for A/B testing with one variable changed

### Real-Time Calculations

**Water Weight Calculation:**
- If coffee weight and ratio entered, water weight is calculated: `coffee_weight × ratio`
- User can override water_weight by editing the field directly
- Visual indicator shows "calculated" vs "manual" state
- Example: 15g coffee × 15 ratio = 225g water

**Extraction Yield:**
- If TDS, coffee weight, and final weight entered:
- `EY = (final_weight × TDS) / coffee_weight`
- Display calculated value with "calculated" indicator

**Days Off Roast:**
- Calculated from coffee's roast date and experiment brew date
- Displayed but not stored (derived on read)

### Validation

**Required:**
- Coffee selection
- Overall notes (minimum 10 characters)

**Format Validation:**
- Weights: Positive decimals
- Temperature: 0-100°C
- Intensity scores: 1-10 integers
- Times: Positive integers (seconds)

**Warnings (not blocking):**
- Unusual values: "Temperature 50°C seems low for brewing"
- Missing common fields: "Consider adding brew time for better analysis"

---

## Reference Sidebar

When logging an experiment, users can view reference information for the selected coffee in a collapsible sidebar. This shows the best brew parameters and target goals, providing context while filling out the form.

### Layout

```
┌─────────────────────────────────────┬─────────────────────────────────┐
│ Log Experiment                      │ ▼ Reference (Best Brew)        │
│                                     │ ─────────────────────────────── │
│ Coffee*  [Kiamaina - Cata ▼]        │ Based on: Jan 15 brew           │
│                                     │                                 │
│ ─── Pre-Brew ───                    │ INPUT PARAMETERS                │
│ Coffee (g)  [15        ]            │ • Coffee: 15g                   │
│ Ratio       [15        ]            │ • Ratio: 1:15                   │
│ Water (g)   [225       ] calc       │ • Water: 225g                   │
│ Grind       [3.5       ]            │ • Grind: 3.5                    │
│ Temp (°C)   [96        ]            │ • Temp: 96°C                    │
│ Filter      [Abaca ▼   ]            │ • Filter: Abaca                 │
│                                     │ • Bloom: 40g / 30s              │
│ ─── Brew ───                        │                                 │
│ Bloom (g)   [40        ]            │ ─────────────────────────────── │
│ Bloom (s)   [30        ]            │ TARGET GOALS              [✏️]  │
│ ...                                 │ • TDS: 1.35-1.40                │
│                                     │ • Extraction: 20-22%            │
│ ─── Outcomes ───                    │ • Acidity: 7/10                 │
│ TDS         [1.38      ]            │ • Sweetness: 8/10               │
│ Extraction  [20.1      ]            │ • Overall: 9/10                 │
│ ...                                 │                                 │
│                                     │ ─────────────────────────────── │
│                                     │ IMPROVEMENT NOTES         [✏️]  │
│                                     │ "Try finer grind to boost       │
│                                     │ sweetness, maybe 3.2"           │
│                                     │                                 │
│              [Save Experiment]      │ [Copy Parameters]               │
└─────────────────────────────────────┴─────────────────────────────────┘
```

### Behavior

**Visibility:**
- Sidebar hidden when no coffee is selected
- Sidebar appears when coffee is selected (collapsed by default)
- User can expand/collapse the sidebar
- Expansion state persists during the session

**Data Source:**
- Fetches data from `GET /api/v1/coffees/:id/reference` when coffee is selected
- Shows best experiment parameters (or latest if no best marked)
- Shows target goals if they exist for this coffee

**Sections:**

1. **Best Brew Header**
   - Shows date of the reference experiment
   - Indicates if this is explicitly marked best or just latest

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

4. **Improvement Notes** (editable)
   - Free-form notes about what to try next
   - Part of coffee goals entity
   - Edit icon toggles inline editing
   - Changes saved to `PUT /api/v1/coffees/:id/goals`

**Actions:**

- **Copy Parameters**: Fills form fields with best brew's input parameters
  - Copies: coffee weight, ratio, water weight, grind, temp, filter, bloom
  - Does NOT copy: outcomes, sensory data, notes
  - Shows toast confirmation: "Parameters copied from Jan 15 brew"

- **Edit Goals** (✏️): Opens inline editor for target goals
  - All goal fields editable
  - Save/Cancel buttons
  - Auto-saves on blur or explicit save

- **Edit Notes** (✏️): Opens inline text editor for improvement notes
  - Auto-saves on blur

### Empty States

**No experiments for coffee:**
```
┌─────────────────────────────────┐
│ ▼ Reference                     │
│ ─────────────────────────────── │
│                                 │
│ No experiments yet for this     │
│ coffee. This will show your     │
│ best brew parameters after      │
│ you log some experiments.       │
│                                 │
│ ─────────────────────────────── │
│ TARGET GOALS              [✏️]  │
│ No goals set. Add targets to    │
│ track what you're aiming for.   │
│                                 │
└─────────────────────────────────┘
```

**No goals set:**
```
│ TARGET GOALS              [Add] │
│ No goals set yet.               │
│ Set targets for TDS,            │
│ extraction, or taste scores.    │
```

### Mobile Behavior

On mobile (< 768px):
- Sidebar displays below the form instead of beside it
- Collapsible accordion style
- Same content and functionality

---

## Design Decisions

### Minimal Required Fields

Only `coffee_id` and `overall_notes` are required because:
- Reduces friction for quick logging
- Users may not have measuring equipment initially
- Overall notes capture the essential learnings even without quantitative data

### Brew Date Auto-Population

`brew_date` defaults to current timestamp at entry. Users can edit it for backdated entries. Combined with coffee's `roast_date`, this enables calculating days off roast.

### Structured Pours

Pour data stored in a separate `experiment_pours` table because:
- Enables variable number of pours (not limited to 3)
- Structured data allows for analysis and correlation
- Each pour captures water amount, style, and notes
- Maintains flexibility while enabling pattern discovery

### Ratio-Driven Water Calculation

Ratio is a numeric value (e.g., 15 for 1:15) that drives water calculation:
- User enters coffee_weight and ratio
- water_weight is calculated as coffee_weight × ratio
- User can override water_weight manually if needed
- Common workflow: "I use 15g at 1:15" → auto-calculates 225g water

### Sensory Scales

1-10 scale chosen for consistency and granularity:
- Sufficient resolution to track changes
- Intuitive for users
- Matches common cupping conventions

### No Experiment Grouping

Experiments are not explicitly grouped into "sessions." The CSV shows multiple experiments done together (same experiment number), but for the app:
- Filtering by date range achieves similar grouping
- Comparison feature handles side-by-side analysis
- Simplifies data model

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

---

## Open Questions

1. **Equipment Tracking**: Should brewer device (V60, Kalita, etc.) be a field? Currently implicit.
2. **Photo Attachments**: Capture images of the brew/cup?
3. **Timestamps During Brew**: Would step-by-step timer integration be valuable?
4. **Offline Support**: Cache form state if connection lost?
5. **Timer**: Add built-in brew timer with auto-fill?
6. **Voice Entry**: Dictate notes while brewing?
