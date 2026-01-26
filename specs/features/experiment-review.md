# Experiment Review

## Overview

Experiment Review is how users browse, filter, and analyze their brewing history. It provides three modes based on selection:

| Mode | Selection | Purpose |
|------|-----------|---------|
| **List** | — | Browse, filter, sort experiments |
| **Compare** | 2-4 experiments | Side-by-side parameter/outcome table |
| **Analyze** | 5+ experiments | Correlation matrix, heatmap, scatter plots |

**Key capabilities:**
- Finding specific experiments
- Comparing multiple experiments side-by-side
- Analyzing correlations across curated experiment sets
- Detailed examination of individual brews

---

## User Interface

### Experiment List View

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Experiments                              [New Experiment]│
├─────────────────────────────────────────────────────────┤
│ [Search...        ] [Filters ▼]  [Compare Mode: Off ○] │
├─────────────────────────────────────────────────────────┤
│ ☐ │ Date     │ Coffee           │ Score │ Notes       │
│───┼──────────┼──────────────────┼───────┼─────────────│
│ ☐ │ Jan 19   │ Kiamaina         │ 7     │ Bright...   │
│ ☐ │ Jan 19   │ El Calagual      │ 8     │ Deep ch...  │
│ ☐ │ Jan 18   │ Kiamaina         │ 6     │ Too acid... │
│   │ ...      │ ...              │ ...   │ ...         │
├─────────────────────────────────────────────────────────┤
│ Showing 1-20 of 47              [< 1 2 3 >]            │
└─────────────────────────────────────────────────────────┘
```

**Columns:**
- Checkbox (for comparison)
- Date (brew date)
- Coffee (name + roaster)
- Days Off Roast
- Score
- Notes (truncated)
- Tags (icons/badges)

**Row Actions (on hover/menu):**
- View details
- Edit
- Copy as template
- Delete

### Filtering

**Filter Panel:**
```
┌─────────────────────────────┐
│ Filters                     │
├─────────────────────────────┤
│ Coffee                      │
│ [Select coffee...      ▼]   │
│                             │
│ Date Range                  │
│ [Start] to [End]            │
│                             │
│ Score                       │
│ [Min] to [Max]              │
│                             │
│ Issue Tags                  │
│ [☐ too_acidic]              │
│ [☐ under_extracted]         │
│ [☐ lacks_body]              │
│ ...                         │
│                             │
│ Has Fields                  │
│ [☐ TDS recorded]            │
│ [☐ Sensory scores]          │
│                             │
│ [Clear All]  [Apply]        │
└─────────────────────────────┘
```

**Quick Filters:**
- "This week"
- "This month"
- "With issues" (has any issue tag)
- "High scores" (≥8)

### Sorting

Sort options:
- Date (default, descending)
- Score
- Coffee name
- Days off roast

Click column header to sort, click again to reverse.

### Experiment Detail View

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ ← Back                                    [Edit] [Delete]│
├─────────────────────────────────────────────────────────┤
│ Kiamaina · Cata Coffee                                  │
│ January 19, 2026 · 61 days off roast                    │
├─────────────────────────────────────────────────────────┤
│ Overall: 7/10                                           │
│ "Bright lemon acidity, pleasant but could use more     │
│ sweetness development. Adding catalyst improved body."  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────┬─────────────────┐                   │
│ │ PRE-BREW        │ BREW            │                   │
│ ├─────────────────┼─────────────────┤                   │
│ │ Dose: 15g       │ Bloom: 45g/75s  │                   │
│ │ Water: 225g     │ Pour 1: 90g     │                   │
│ │ Ratio: 1:15     │ Pour 2: 90g     │                   │
│ │ Grind: 8 clicks │ Total: 2:33     │                   │
│ │ Temp: 90°C      │                 │                   │
│ │ Filter: Hario   │                 │                   │
│ └─────────────────┴─────────────────┘                   │
│                                                         │
│ ┌─────────────────┬─────────────────┐                   │
│ │ POST-BREW       │ OUTCOMES        │                   │
│ ├─────────────────┼─────────────────┤                   │
│ │ Temp: Hot       │ TDS: 1.65%      │                   │
│ │ Minerals: +Cat  │ EY: 24.75%      │                   │
│ └─────────────────┴─────────────────┘                   │
│                                                         │
│ ─── SENSORY ───                                         │
│ Aroma: 7/10 - Deep cherry                               │
│ Acidity: 7/10  Sweetness: 5/10  Bitterness: 5/10       │
│ Body: 7/10                                              │
│ Flavors: Slightly sour cherry, very slight hay-like    │
│ Aftertaste: 7/10 duration, 6/10 intensity              │
│                                                         │
│ ─── ISSUES ───                                          │
│ [too_acidic] [lacks_sweetness]                          │
│                                                         │
│ Improvement Ideas:                                      │
│ Try lower temperature, longer bloom                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [◀ Prev Experiment]              [Next Experiment ▶]   │
└─────────────────────────────────────────────────────────┘
```

**Navigation:**
- Prev/Next within current filter context
- Keyboard shortcuts (←/→)

### Comparison View

**Activation:**
1. Toggle "Compare Mode" in list view
2. Select 2-4 experiments via checkboxes
3. Click "Compare Selected"

**Comparison Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Compare Experiments                                        [× Close]│
├─────────────────────────────────────────────────────────────────────┤
│                  │ Exp 1       │ Exp 2       │ Exp 3       │ Δ     │
│──────────────────┼─────────────┼─────────────┼─────────────┼───────│
│ Date             │ Jan 19      │ Jan 19      │ Jan 18      │       │
│ Coffee           │ Kiamaina    │ Kiamaina    │ Kiamaina    │       │
│ Score            │ 7           │ 8           │ 6           │ ↑     │
├──────────────────┼─────────────┼─────────────┼─────────────┼───────│
│ PARAMETERS       │             │             │             │       │
│ Dose             │ 15g         │ 15g         │ 15g         │ =     │
│ Temperature      │ 90°C        │ 88°C        │ 92°C        │ var   │
│ Grind            │ 8 clicks    │ 8 clicks    │ 7 clicks    │ var   │
│ Filter           │ Hario       │ TH-1        │ Hario       │ var   │
├──────────────────┼─────────────┼─────────────┼─────────────┼───────│
│ OUTCOMES         │             │             │             │       │
│ Acidity          │ 7           │ 5           │ 8           │ ↓     │
│ Sweetness        │ 5           │ 7           │ 4           │ ↑     │
│ Body             │ 7           │ 6           │ 7           │ =     │
│ Overall          │ 7           │ 8           │ 6           │ ↑     │
└─────────────────────────────────────────────────────────────────────┘
```

**Delta Column:**
- Shows trend direction
- `=` same across all
- `↑`/`↓` increasing/decreasing
- `var` varies without clear trend

**Comparison Features:**
- Highlight differences
- Show only differing rows option
- Export comparison as image/text

### Analyze Mode

Analyze mode enables correlation analysis across a curated selection of experiments. Unlike automatic analysis of all data, this approach lets users control which experiments contribute to pattern discovery.

**Why Curated Selection:**
- User data isn't always clean—outliers and bad brews skew results
- Users understand context (e.g., "these 10 experiments were all dialing in the same coffee")
- Selected experiments share meaningful characteristics
- More reliable correlations from intentional groupings

**Activation:**
1. Filter experiments to a relevant set (e.g., same coffee, date range, similar scores)
2. Use "Select All Filtered" or manually select 5+ experiments via checkboxes
3. Click "Analyze Selected" button (appears when 5+ selected)

**Selection Requirements:**
- Minimum: 5 experiments (statistical minimum)
- Recommended: 10+ for reliable correlations
- Maximum: No limit

**Analyze Mode Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Analyze Experiments (12 selected)                          [× Close]│
├─────────────────────────────────────────────────────────────────────┤
│ [Table] [Heatmap]                             Min samples: [5  ▼]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Input Variables → Outcome Variables                                 │
│                                                                     │
│              │ Overall │ Acidity │ Sweet │ Bitter │ Body │ Aroma  │
│ ─────────────┼─────────┼─────────┼───────┼────────┼──────┼────────│
│ Temperature  │  +0.42  │  +0.65  │ +0.21 │ -0.15  │ +0.33│ +0.28  │
│ Grind (fine) │  +0.15  │  +0.38  │ +0.12 │ +0.45  │ +0.52│ +0.18  │
│ Dose         │  +0.28  │  +0.08  │ +0.15 │ +0.22  │ +0.61│ +0.35  │
│ Ratio        │  -0.22  │  -0.31  │ -0.18 │ -0.25  │ -0.42│ -0.20  │
│ Bloom Time   │  +0.18  │  +0.12  │ +0.25 │ -0.08  │ +0.15│ +0.22  │
│ Days Off     │  -0.35  │  -0.28  │ -0.32 │ +0.15  │ -0.20│ -0.45  │
│                                                                     │
│ Cell color indicates strength: 🟢 positive  🔴 negative  ⚪ none    │
│ Click any cell to drill down                                        │
├─────────────────────────────────────────────────────────────────────┤
│ 💡 Insights                                                         │
│ • Temperature strongly affects acidity (+0.65) in these experiments │
│ • Body is most influenced by dose (+0.61)                          │
├─────────────────────────────────────────────────────────────────────┤
│ ⚠️ Only 8 experiments have TDS data - showing N/A for TDS cells     │
└─────────────────────────────────────────────────────────────────────┘
```

**Heatmap Visualization:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Table] [Heatmap]                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │                  OUTCOME VARIABLES                        │    │
│    │     Overall  Acidity  Sweetness  Bitter  Body  Aroma     │    │
│ I  │ Temp    ██      ███       █       ░       ██     █        │    │
│ N  │ Grind   █       ██        █       ██      ███    █        │    │
│ P  │ Dose    ██      ░         █       █       ███    ██       │    │
│ U  │ Ratio   ▓▓      ▓▓        ▓       ▓▓      ▓▓▓    ▓        │    │
│ T  │ Bloom   █       █         ██      ░       █      █        │    │
│    │ DOR     ▓▓      ▓▓        ▓▓      █       ▓      ▓▓▓      │    │
│    └──────────────────────────────────────────────────────────┘    │
│                                                                     │
│    Legend: ███ Strong +   ██ Moderate +   █ Weak +                 │
│            ▓▓▓ Strong -   ▓▓ Moderate -   ▓ Weak -   ░ None        │
└─────────────────────────────────────────────────────────────────────┘
```

**Color Coding:**
- Strong positive (r ≥ 0.7): Dark green
- Moderate positive (0.4-0.7): Light green
- Weak positive (0.1-0.4): Pale green
- No correlation (-0.1 to 0.1): Gray/white
- Weak negative (-0.4 to -0.1): Pale red
- Moderate negative (-0.7 to -0.4): Light red
- Strong negative (r ≤ -0.7): Dark red

**Single Variable Drill-Down (clicking a cell):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Temperature → Acidity Intensity                            [Close] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Correlation: +0.65 (Moderate Positive)                             │
│ Based on: 12 selected experiments                                   │
│                                                                     │
│ Scatter Plot:                                                       │
│                                                                     │
│    Acidity                                                          │
│    10 │                              •  •                           │
│     8 │                    •    •  •                                │
│     6 │           •  •  •     •                                     │
│     4 │     •  •                                                    │
│     2 │  •                                                          │
│       └──────────────────────────────────                           │
│         85   87   89   91   93   95  Temperature (°C)              │
│                                                                     │
│ Interpretation:                                                     │
│ Higher water temperature is associated with higher acidity          │
│ intensity in your selected experiments.                             │
│                                                                     │
│ Contributing Experiments:                                           │
│ • Jan 19 - Kiamaina: 92°C → Acidity 8                              │
│ • Jan 18 - El Calagual: 88°C → Acidity 5                           │
│ • Jan 17 - Kiamaina: 95°C → Acidity 9                              │
│ ...                                                      [View All] │
└─────────────────────────────────────────────────────────────────────┘
```

#### Correlation Calculations

**Statistical Method:**
- Pearson correlation coefficient for numeric variables
- Point-biserial correlation for categorical vs numeric

**Formula:**
```
r = Σ((xi - x̄)(yi - ȳ)) / √(Σ(xi - x̄)² × Σ(yi - ȳ)²)
```

**Interpretation:**
| r value | Interpretation |
|---------|----------------|
| 0.7 to 1.0 | Strong positive |
| 0.4 to 0.7 | Moderate positive |
| 0.1 to 0.4 | Weak positive |
| -0.1 to 0.1 | No correlation |
| -0.4 to -0.1 | Weak negative |
| -0.7 to -0.4 | Moderate negative |
| -1.0 to -0.7 | Strong negative |

#### Variables Tracked

**Input Variables:**
| Variable | Type | Notes |
|----------|------|-------|
| coffee_weight | numeric | Dose |
| water_weight | numeric | Total water |
| water_temperature | numeric | In °C |
| grind_size | ordinal* | Requires normalization |
| bloom_time | numeric | In seconds |
| total_brew_time | numeric | In seconds |
| days_off_roast | numeric | Calculated |
| filter_paper | categorical | One-hot encoded |
| mineral_additions | categorical | Presence/absence |

*Grind size is text; analysis requires user mapping or inference.

**Outcome Variables:**
| Variable | Type |
|----------|------|
| overall_score | numeric |
| acidity_intensity | numeric |
| sweetness_intensity | numeric |
| bitterness_intensity | numeric |
| body_weight | numeric |
| aroma_intensity | numeric |
| tds | numeric |
| extraction_yield | numeric |

#### Data Requirements & Warnings

**Minimum Samples:**
- Default: 5 experiments required per correlation
- Adjustable: 5-50 range via dropdown
- Correlations below threshold shown with warning or hidden

**Missing Data Handling:**
- Experiments missing a variable excluded from that correlation
- Show "N=X" for each cell to indicate sample size
- Handle sparse data gracefully with warnings

**Automatic Insights:**
Generated for strongest correlations in the selection:
- Identify the top 3 strongest positive/negative correlations
- Generate human-readable interpretations
- Note optimal ranges based on highest-scoring experiments

**Warnings:**
```
⚠️ Grind size data not normalized - correlation may be unreliable
⚠️ Only 4 experiments with TDS data - need more for reliable correlation
⚠️ Correlation ≠ causation. Other variables may be involved.
```

#### Workflow Example

1. **Filter**: User filters to "Kiamaina" coffee, last 3 months
2. **Review**: 15 experiments shown in list
3. **Curate**: User deselects 3 experiments that were obviously bad (wrong grind, equipment issues)
4. **Analyze**: Click "Analyze Selected" with 12 experiments
5. **Discover**: Correlation matrix shows Temperature→Acidity is +0.65
6. **Drill Down**: Click cell to see scatter plot and contributing experiments
7. **Act**: Note insight for future brews

### Delete Experiment

**Confirmation:**
```
┌─────────────────────────────────────────┐
│ Delete Experiment?                      │
├─────────────────────────────────────────┤
│ This will permanently delete the        │
│ experiment from January 19, 2026        │
│ (Kiamaina).                             │
│                                         │
│ This cannot be undone.                  │
│                                         │
│         [Cancel]  [Delete]              │
└─────────────────────────────────────────┘
```

---

## API Endpoints

This feature primarily uses the experiment endpoints defined in brew-tracking.md. Additional endpoints specific to review functionality:

### Compare Experiments
```
POST /api/v1/experiments/compare
```

**Request:**
```json
{
  "experiment_ids": ["uuid1", "uuid2", "uuid3", "uuid4"]
}
```

Maximum 4 experiments. Returns full experiment objects with computed delta values.

**Response:**
```json
{
  "data": {
    "experiments": [
      {
        "id": "uuid1",
        "brew_date": "2026-01-19T10:30:00Z",
        "coffee": {...},
        "coffee_weight": 15.0,
        "water_temperature": 92,
        "acidity_intensity": 7,
        "overall_score": 7
      },
      {...}
    ],
    "deltas": {
      "water_temperature": {"min": 88, "max": 95, "trend": "variable"},
      "acidity_intensity": {"min": 5, "max": 8, "trend": "decreasing"},
      "overall_score": {"min": 6, "max": 8, "trend": "increasing"}
    }
  }
}
```

**Delta Trends:**
- `increasing`: Values trend upward in chronological order
- `decreasing`: Values trend downward
- `stable`: Values are the same
- `variable`: No clear trend

### Export Experiments
```
GET /api/v1/experiments/export
```

**Query Parameters:**
- Same filters as list experiments
- `format`: `csv` or `json` (default: csv)

**Response:** File download with appropriate Content-Type header

### Analyze Experiments
```
POST /api/v1/experiments/analyze
```

Compute correlations for a user-selected set of experiments.

**Request:**
```json
{
  "experiment_ids": ["uuid1", "uuid2", "uuid3", "..."],
  "min_samples": 5
}
```

- `experiment_ids`: Array of experiment UUIDs (minimum 5)
- `min_samples`: Minimum experiments required per correlation cell (default: 5)

**Response:**
```json
{
  "data": {
    "correlations": {
      "water_temperature": {
        "overall_score": {"r": 0.42, "n": 12, "p": 0.004},
        "acidity_intensity": {"r": 0.65, "n": 10, "p": 0.001},
        "sweetness_intensity": {"r": 0.21, "n": 10, "p": 0.15},
        "bitterness_intensity": {"r": -0.15, "n": 10, "p": 0.35},
        "body_weight": {"r": 0.33, "n": 9, "p": 0.05}
      },
      "coffee_weight": {
        "overall_score": {"r": 0.28, "n": 12, "p": 0.05},
        "body_weight": {"r": 0.61, "n": 11, "p": 0.001}
      },
      "days_off_roast": {
        "overall_score": {"r": -0.35, "n": 12, "p": 0.02},
        "aroma_intensity": {"r": -0.45, "n": 10, "p": 0.003}
      }
    },
    "inputs": ["water_temperature", "coffee_weight", "water_weight", "bloom_time", "total_brew_time", "days_off_roast"],
    "outcomes": ["overall_score", "acidity_intensity", "sweetness_intensity", "bitterness_intensity", "body_weight", "aroma_intensity"],
    "experiment_count": 12,
    "insights": [
      {
        "type": "strong_correlation",
        "input": "water_temperature",
        "outcome": "acidity_intensity",
        "r": 0.65,
        "message": "Temperature strongly affects acidity (+0.65) in these experiments."
      }
    ],
    "warnings": [
      {
        "type": "insufficient_data",
        "field": "tds",
        "n": 4,
        "message": "Only 4 experiments have TDS data"
      }
    ]
  }
}
```

**Correlation Object:**
- `r`: Pearson correlation coefficient (-1 to 1)
- `n`: Sample size (experiments with both values present)
- `p`: p-value for statistical significance

### Get Correlation Detail
```
POST /api/v1/experiments/analyze/detail
```

Drill down into a specific input→outcome correlation.

**Request:**
```json
{
  "experiment_ids": ["uuid1", "uuid2", "..."],
  "input_variable": "water_temperature",
  "outcome_variable": "acidity_intensity"
}
```

**Response:**
```json
{
  "data": {
    "input_variable": "water_temperature",
    "outcome_variable": "acidity_intensity",
    "correlation": {
      "r": 0.65,
      "n": 10,
      "p": 0.001,
      "interpretation": "moderate_positive"
    },
    "scatter_data": [
      {"x": 85, "y": 4, "experiment_id": "uuid1"},
      {"x": 88, "y": 5, "experiment_id": "uuid2"},
      {"x": 92, "y": 8, "experiment_id": "uuid3"}
    ],
    "insight": "Higher water temperature is associated with higher acidity intensity in your selected experiments.",
    "experiments": [
      {
        "id": "uuid1",
        "brew_date": "2026-01-19T10:30:00Z",
        "coffee_name": "Kiamaina",
        "input_value": 92,
        "outcome_value": 8
      }
    ]
  }
}
```

---

## Design Decisions

### List over Cards

Table/list view instead of cards because:
- Efficient for scanning many experiments
- Easy sorting and filtering
- Consistent with data-heavy nature
- Better information density

### Checkbox Selection for Compare

Checkboxes vs. dedicated comparison screen because:
- Natural multi-select pattern
- Works with filtering
- Clear selection state
- No separate "pick experiments" flow

### Side-by-Side Comparison

Columnar comparison because:
- Easy visual scanning
- Clear what differs
- Standard comparison pattern
- Scales to 4 items reasonably

### Delta Column in Comparison

Trend indicators because:
- Quickly shows what improved
- Helps identify effective changes
- More useful than raw numbers alone

### Keyboard Navigation

Prev/Next with arrows because:
- Common pattern for reviewing sequences
- Faster than returning to list
- Maintains context of current filters

### Curated Selection for Correlations

User-selected experiments instead of automatic analysis of all data because:
- User data quality varies—outliers and failed experiments skew automatic analysis
- Users understand context (same coffee dial-in, equipment change, etc.)
- Selected experiments share meaningful characteristics
- Prevents spurious correlations from unrelated experiments
- More actionable insights from intentional groupings

### 5+ Experiment Minimum for Analyze

Minimum threshold because:
- Statistical reliability requires sufficient sample size
- 2-4 experiments use Compare mode (side-by-side table)
- 5+ experiments warrant correlation matrix
- Clear mode distinction based on selection count

---

## Open Questions

1. **Inline Editing**: Edit fields directly in detail view without modal?
2. **Comparison Persistence**: Save comparison sets for revisiting?
3. **Notes Search**: Full-text search within experiment notes?
4. **Export**: Export experiments to CSV/JSON?
