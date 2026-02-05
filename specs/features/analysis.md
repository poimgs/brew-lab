# Analysis

## Overview

The Analysis feature provides filter-based correlation analysis across experiments. Unlike the selection-based approach formerly in Experiments, Analysis uses filters to define which experiments to include, enabling cross-coffee analysis and a more exploratory workflow.

**Route:** `/analysis`

**Key capabilities:**
- Filter-based experiment selection (coffee, date range, score range)
- Cross-coffee analysis (analyze patterns across multiple coffees)
- Correlation matrix with heatmap visualization
- Drill-down scatter plots for specific correlations
- Automatic insights generation

---

## User Interface

### Analysis Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Analysis                                                     [📊]   │
│ Discover correlations between brewing variables and outcomes        │
├─────────────────────────────────────────────────────────────────────┤
│ ℹ️ How Analysis Works                                               │
│ Analysis calculates correlations between your brewing parameters    │
│ and outcomes. Use the filters below to select experiments.          │
│ Minimum: 5 experiments | Recommended: 10+ for reliable results      │
├─────────────────────────────────────────────────────────────────────┤
│ 🔍 Filter Experiments                                      [Hide]   │
│                                                                     │
│ Coffees                                           [Select All]      │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ [☑] Kiamaina (Cata) ─────────────────────────────────── 12 exp ││
│ │ [☑] El Calagual (Onyx) ──────────────────────────────── 8 exp  ││
│ │ [☐] Ethiopia Natural (Sweet Bloom) ─────────────────── 5 exp   ││
│ │ ...                                                             ││
│ └─────────────────────────────────────────────────────────────────┘│
│ 2 coffees selected                                                  │
│                                                                     │
│ Date Range                                                          │
│ [Start date     ] to [End date       ]                             │
│                                                                     │
│ Score Range                                                         │
│ [Min (1)        ] to [Max (10)       ]                             │
│                                                                     │
│ [Clear All]                                        [Run Analysis]   │
└─────────────────────────────────────────────────────────────────────┘
```

### Filter Controls

**Coffee Selection:**
- Multi-select checkboxes for all user's coffees
- Shows experiment count per coffee
- "Select All" / "Deselect All" toggle
- Empty selection = analyze all experiments

**Date Range:**
- Optional start and end date pickers
- Inclusive range

**Score Range:**
- Min/max overall score (1-10)
- Helps filter to quality experiments

### Correlation Matrix View

After clicking "Run Analysis", displays the AnalyzeView component (shared with legacy flow):

```
┌─────────────────────────────────────────────────────────────────────┐
│ Analyze Experiments                                         [Close] │
│ Analyzing 20 experiments for correlations                           │
├─────────────────────────────────────────────────────────────────────┤
│ [Table] [Heatmap]                             Min samples: [5  ▼]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Input ↓ / Outcome →  │ Overall │ Acidity │ Sweet │ Body │ Aroma   │
│ ─────────────────────┼─────────┼─────────┼───────┼──────┼─────────│
│ Temperature          │  +0.42  │  +0.65  │ +0.21 │ +0.33│ +0.28   │
│ Grind                │  +0.15  │  +0.38  │ +0.12 │ +0.52│ +0.18   │
│ Dose                 │  +0.28  │  +0.08  │ +0.15 │ +0.61│ +0.35   │
│ Ratio                │  -0.22  │  -0.31  │ -0.18 │ -0.42│ -0.20   │
│ Bloom Time           │  +0.18  │  +0.12  │ +0.25 │ +0.15│ +0.22   │
│ Days Off Roast       │  -0.35  │  -0.28  │ -0.32 │ -0.20│ -0.45   │
│                                                                     │
│ Click any cell to drill down                                        │
├─────────────────────────────────────────────────────────────────────┤
│ 💡 Insights                                                         │
│ • Temperature strongly affects acidity (+0.65) in these experiments │
│ • Body is most influenced by dose (+0.61)                          │
├─────────────────────────────────────────────────────────────────────┤
│ ⚠️ Only 8 experiments have TDS data                                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Color Coding:**
- Strong positive (r ≥ 0.7): Dark green
- Moderate positive (0.4-0.7): Light green
- Weak positive (0.1-0.4): Pale green
- No correlation (-0.1 to 0.1): Gray
- Weak negative (-0.4 to -0.1): Pale red
- Moderate negative (-0.7 to -0.4): Light red
- Strong negative (r ≤ -0.7): Dark red

### Scatter Plot Drill-Down

Clicking a correlation cell shows detailed view:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Temperature → Acidity Intensity                              [× ]   │
├─────────────────────────────────────────────────────────────────────┤
│ [Correlation: +0.65]  [n = 20]  [moderate positive]                │
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
│ Higher Temperature is positively associated with Acidity in your   │
│ selected experiments.                                               │
│                                                                     │
│ Contributing Experiments                                            │
│ ─────────────────────────────                                      │
│ Jan 19 - Kiamaina: 92°C → Acidity 8                                │
│ Jan 18 - El Calagual: 88°C → Acidity 5                             │
│ Jan 17 - Kiamaina: 95°C → Acidity 9                                │
│ ...and 17 more                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Analyze Experiments (Filter-Based)
```
POST /api/v1/experiments/analyze
```

Compute correlations using either experiment IDs or filters.

**Request (Option A - IDs):**
```json
{
  "experiment_ids": ["uuid1", "uuid2", "uuid3", "..."],
  "min_samples": 5
}
```

**Request (Option B - Filters):**
```json
{
  "filters": {
    "coffee_ids": ["uuid1", "uuid2"],
    "date_from": "2025-01-01",
    "date_to": "2025-12-31",
    "score_min": 5,
    "score_max": 10
  },
  "min_samples": 5
}
```

**Parameters:**
- `experiment_ids`: Array of experiment UUIDs (minimum 5) - legacy approach
- `filters`: Filter-based selection - new approach
  - `coffee_ids`: Array of coffee UUIDs (optional, empty = all coffees)
  - `date_from`: Start date ISO string (optional)
  - `date_to`: End date ISO string (optional)
  - `score_min`: Minimum overall score 1-10 (optional)
  - `score_max`: Maximum overall score 1-10 (optional)
- `min_samples`: Minimum experiments per correlation (default: 5, max: 50)

**Response:**
```json
{
  "correlations": {
    "water_temperature": {
      "overall_score": {"r": 0.42, "n": 12, "p": 0.004, "interpretation": "weak_positive"},
      "acidity_intensity": {"r": 0.65, "n": 10, "p": 0.001, "interpretation": "moderate_positive"}
    }
  },
  "inputs": ["water_temperature", "coffee_weight", "water_weight", "bloom_time", "total_brew_time", "days_off_roast"],
  "outcomes": ["overall_score", "acidity_intensity", "sweetness_intensity", "bitterness_intensity", "body_weight", "aroma_intensity"],
  "experiment_count": 20,
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
```

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
```

---

## Correlation Analysis

### Statistical Method

- **Pearson correlation coefficient** for numeric variables
- **Formula:** `r = Σ((xi - x̄)(yi - ȳ)) / √(Σ(xi - x̄)² × Σ(yi - ȳ)²)`

### Interpretation

| r value | Interpretation |
|---------|----------------|
| 0.7 to 1.0 | Strong positive |
| 0.4 to 0.7 | Moderate positive |
| 0.1 to 0.4 | Weak positive |
| -0.1 to 0.1 | No correlation |
| -0.4 to -0.1 | Weak negative |
| -0.7 to -0.4 | Moderate negative |
| -1.0 to -0.7 | Strong negative |

### Variables

**Input Variables:**
| Variable | Type | Notes |
|----------|------|-------|
| coffee_weight | numeric | Dose in grams |
| water_weight | numeric | Total water in grams |
| water_temperature | numeric | In °C |
| grind_size | numeric | Clicks/units |
| bloom_time | numeric | In seconds |
| total_brew_time | numeric | In seconds |
| days_off_roast | numeric | Calculated from coffee roast date |

**Outcome Variables:**
| Variable | Type |
|----------|------|
| overall_score | 1-10 |
| acidity_intensity | 1-10 |
| sweetness_intensity | 1-10 |
| bitterness_intensity | 1-10 |
| body_weight | 1-10 |
| aroma_intensity | 1-10 |
| tds | percentage |
| extraction_yield | percentage |

### Data Requirements

- **Minimum:** 5 experiments required for analysis
- **Recommended:** 10+ experiments for reliable correlations
- **Missing data:** Experiments missing a variable are excluded from that correlation
- **Sample size:** Each cell shows n (number of experiments with both values)

---

## Design Decisions

### Filter-Based vs. Selection-Based

Filter-based approach instead of checkbox selection because:
- **Cross-coffee analysis:** Enables analyzing patterns across multiple coffees
- **Exploratory workflow:** Users can quickly try different filter combinations
- **No manual exclusion step:** Simpler UX than selecting/deselecting individual experiments
- **Scales better:** Works well with large experiment sets

### Separate Page vs. Mode

Dedicated `/analysis` page instead of mode in Experiments because:
- **Clear purpose:** Analysis has distinct workflow from browsing/comparing
- **Simpler Experiments page:** Keeps list/compare focused and less cluttered
- **Navigation discoverability:** Analysis in main nav is easier to find
- **Filter persistence:** Analysis filters are independent of list filters

### Empty Filter = All Experiments

Leaving filters empty analyzes all experiments because:
- **Sensible default:** Users often want to see overall patterns
- **Progressive filtering:** Start broad, narrow down if needed
- **Cross-coffee by default:** Encourages exploring patterns across coffees

---

## Navigation

Analysis is accessible via:
1. **Main navigation:** "Analysis" link between Experiments and Coffees
2. **Experiments page:** "Looking for patterns? Try the Analysis page" link

---

## Files

| File | Purpose |
|------|---------|
| `frontend/src/pages/AnalysisPage.tsx` | Main analysis page with filter UI |
| `frontend/src/components/experiment/AnalyzeView.tsx` | Correlation matrix, heatmap, scatter plots (shared) |
| `frontend/src/api/experiments.ts` | `analyzeExperimentsWithFilters()` function |
| `backend/internal/domain/experiment/handler.go` | `Analyze()` handler with filter support |
| `backend/internal/domain/experiment/entity.go` | `AnalyzeFilters` type definition |
