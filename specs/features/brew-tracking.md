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
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

### Pre-Brew Variables

These are set before brewing begins.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| coffee_weight | decimal | grams | Dose of coffee grounds |
| water_weight | decimal | grams | Total water used |
| ratio | string | — | Shorthand like "1:15" (can be calculated or entered) |
| grind_size | string | — | Grinder-specific (e.g., "8 clicks", "3.5 on Ode") |
| water_temperature | decimal | °C | Water temperature at pour |
| filter_paper_id | UUID | — | Reference to filter paper (see [Reference Data](reference-data.md)) |

### Brew Variables

Parameters during the brewing process.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| bloom_water | decimal | grams | Water used for bloom |
| bloom_time | integer | seconds | Bloom duration |
| pour_1 | string | — | First pour description (amount, technique) |
| pour_2 | string | — | Second pour description |
| pour_3 | string | — | Third pour description |
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
| sweetness_intensity | integer | Perceived sweetness level |
| bitterness_intensity | integer | Perceived bitterness level |
| body_weight | integer | Body/mouthfeel weight |
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
    ratio VARCHAR(20),
    grind_size VARCHAR(100),
    water_temperature DECIMAL(4,1),
    filter_paper_id UUID REFERENCES filter_papers(id) ON DELETE SET NULL,

    -- Brew variables
    bloom_water DECIMAL(5,2),
    bloom_time INTEGER,
    pour_1 VARCHAR(255),
    pour_2 VARCHAR(255),
    pour_3 VARCHAR(255),
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
    sweetness_intensity INTEGER CHECK (sweetness_intensity BETWEEN 1 AND 10),
    bitterness_intensity INTEGER CHECK (bitterness_intensity BETWEEN 1 AND 10),
    body_weight INTEGER CHECK (body_weight BETWEEN 1 AND 10),
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

CREATE INDEX idx_experiments_user_id ON experiments(user_id);
CREATE INDEX idx_experiments_coffee_id ON experiments(coffee_id);
CREATE INDEX idx_experiments_brew_date ON experiments(brew_date);
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
- `filter[coffee_id]`: Filter by coffee
- `filter[score_gte]`: Minimum score
- `filter[score_lte]`: Maximum score
- `filter[has_tds]`: `true` to only show experiments with TDS data
- `date_from`, `date_to`: Date range filter

**Response:**
```json
{
  "data": [
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
      "ratio": "1:15",
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
  "water_weight": 225.0,
  "grind_size": "8 clicks",
  "water_temperature": 90.0,
  "filter_paper_id": "uuid",
  "bloom_water": 45.0,
  "bloom_time": 75,
  "pour_1": "90g, circular motion",
  "pour_2": "90g, circular motion",
  "overall_notes": "Bright acidity, lemon notes",
  "overall_score": 7
}
```

**Response:** `201 Created` with experiment object including computed fields

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

Creates a new experiment with same parameters but:
- New ID and timestamps
- No coffee_id (must be selected)
- No notes or score
- `brew_date` set to now

**Response:** `201 Created` with new experiment template

---

## User Defaults

For defaults API endpoints and database schema, see [Reference Data](reference-data.md#user-defaults-api).

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
│ Water Weight     [225   ] g             │
│ Ratio            [1:15  ]               │
│ Grind Size       [8 clicks         ]    │
│ Temperature      [90    ] °C            │
│ Filter           [Select filter... ▼]   │
```

### Field Sections

**Pre-Brew Variables:**
- Coffee Weight (g)
- Water Weight (g)
- Ratio (calculated or entered)
- Grind Size (free text)
- Water Temperature (°C)
- Filter Paper (dropdown, see [Reference Data](reference-data.md))

**Brew Variables:**
- Bloom Water (g)
- Bloom Time (seconds)
- Pour 1 (description)
- Pour 2 (description)
- Pour 3 (description)
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
- Acidity Intensity (1-10)
- Sweetness Intensity (1-10)
- Bitterness Intensity (1-10)
- Body Weight (1-10)
- Flavor Notes (text)
- Aftertaste Duration (1-10)
- Aftertaste Intensity (1-10)
- Aftertaste Notes (text)

### Defaults System

**Setting Defaults:**

Brew defaults are now managed under the Reference Data & Settings page (see [reference-data.md](reference-data.md) for UI wireframe).

Navigate to: Settings (nav) → Reference Data & Settings → Brew Defaults section

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
- Creates new experiment with same parameters
- Coffee, notes, and score are NOT copied
- User must select coffee and add notes
- Useful for A/B testing with one variable changed

### Real-Time Calculations

**Ratio Calculation:**
- If coffee weight and water weight entered, display calculated ratio
- If ratio entered manually, it's stored as-is
- Tooltip: "Calculated: 1:15.0" when derived

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

## Design Decisions

### Minimal Required Fields

Only `coffee_id` and `overall_notes` are required because:
- Reduces friction for quick logging
- Users may not have measuring equipment initially
- Overall notes capture the essential learnings even without quantitative data

### Brew Date Auto-Population

`brew_date` defaults to current timestamp at entry. Users can edit it for backdated entries. Combined with coffee's `roast_date`, this enables calculating days off roast.

### Pour Descriptions as Strings

Pour fields are strings rather than structured objects because:
- Techniques vary widely (pulse pours, continuous, Rao spin, etc.)
- Users describe pours naturally: "90g, circular motion"
- Future: Could parse these for analysis, but start simple

### Ratio as String

Ratio stored as string (e.g., "1:15") rather than calculated from weights because:
- Common way users think about recipes
- Can be entered without scale measurements
- Calculation can supplement: if weights provided, display calculated ratio alongside

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

### Ratio as Hybrid Field

Ratio can be entered or calculated:
- Users think in ratios ("I use 1:15")
- But may not have precise measurements
- Showing both covers different use cases

### Descriptive Pour Fields

Pours stored as text descriptions because:
- Techniques vary widely
- "90g, circular motion" is natural
- Structured data would limit flexibility
- Future: Could parse for analysis

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
