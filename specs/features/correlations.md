# Correlations Feature

## Context

Correlation analysis helps users discover relationships between brewing variables (inputs) and taste outcomes. By visualizing these patterns across their experiment history, users can identify which variables most affect their results.

## Requirements

### User Stories

1. **View Correlations**: As a user, I can see how variables correlate with outcomes
2. **Filter Analysis**: As a user, I can analyze correlations for specific coffees or conditions
3. **Visual Patterns**: As a user, I can see heatmaps of variable relationships
4. **Drill Down**: As a user, I can see experiments contributing to a correlation
5. **Understand Caveats**: As a user, I can see when data is insufficient for conclusions

### Correlation Calculations

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

### Correlation Matrix View

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Correlations                                                        │
├─────────────────────────────────────────────────────────────────────┤
│ Analyze: [All Experiments ▼]  Min samples: [10 ▼]                  │
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
│ Click any cell to see contributing experiments                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Color Coding:**
- Strong positive: Dark green
- Moderate positive: Light green
- No correlation: Gray/white
- Moderate negative: Light red
- Strong negative: Dark red

### Heatmap Visualization

**Alternative View:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Correlation Heatmap                              [Table] [Heatmap]  │
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

### Single Variable Analysis

**Drill-Down View (clicking a cell):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Temperature → Acidity Intensity                            [Close] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Correlation: +0.65 (Moderate Positive)                             │
│ Based on: 34 experiments                                            │
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
│ intensity in your experiments.                                      │
│                                                                     │
│ Contributing Experiments:                         [Show All 34]     │
│ • Jan 19 - Kiamaina: 92°C → Acidity 8                              │
│ • Jan 18 - El Calagual: 88°C → Acidity 5                           │
│ • Jan 17 - Kiamaina: 95°C → Acidity 9                              │
│ ...                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Filtering

**Filter Options:**
```
┌─────────────────────────────────┐
│ Filter Correlation Analysis     │
├─────────────────────────────────┤
│ Coffee                          │
│ [All Coffees              ▼]    │
│                                 │
│ Date Range                      │
│ [Last 3 months            ▼]    │
│                                 │
│ Process                         │
│ [All Processes            ▼]    │
│                                 │
│ Minimum Samples                 │
│ [10                       ▼]    │
│ (Hide correlations with fewer)  │
│                                 │
│ [Apply Filters]                 │
└─────────────────────────────────┘
```

**Filter Benefits:**
- See correlations for specific coffee
- Compare patterns across different coffees
- Analyze recent experiments vs all-time
- Hide unreliable correlations (few samples)

### Input Variables Tracked

| Variable | Type | Notes |
|----------|------|-------|
| coffee_weight | numeric | Dose |
| water_weight | numeric | Total water |
| water_temperature | numeric | In °C |
| grind_size | ordinal* | Requires normalization |
| bloom_time | numeric | In seconds |
| total_brew_time | numeric | In seconds |
| days_off_roast | numeric | Calculated |
| filter_type | categorical | One-hot encoded |
| mineral_additions | categorical | Presence/absence |

*Grind size is text; analysis requires user mapping or inference.

### Outcome Variables Tracked

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

### Data Requirements

**Minimum Samples:**
- Default: 10 experiments required
- Adjustable: 5-50 range
- Correlations below threshold shown with warning

**Missing Data Handling:**
- Experiments missing a variable excluded from that correlation
- Show "N=X" for each cell
- Handle sparse data gracefully

### Insights & Warnings

**Automatic Insights:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ 💡 Insights                                                         │
├─────────────────────────────────────────────────────────────────────┤
│ • Temperature strongly affects acidity (+0.65). Your highest-rated  │
│   brews tend to use 89-91°C.                                       │
│                                                                     │
│ • Days off roast negatively correlates with aroma (-0.45). Fresher │
│   coffee produces more aromatic cups.                              │
│                                                                     │
│ • Body is most influenced by dose (+0.61). Higher doses produce    │
│   heavier-bodied cups in your experiments.                         │
└─────────────────────────────────────────────────────────────────────┘
```

**Warnings:**
```
⚠️ Grind size data not normalized - correlation may be unreliable
⚠️ Only 8 experiments with TDS data - need more for reliable correlation
⚠️ Correlation ≠ causation. Other variables may be involved.
```

## Design Decisions

### Pearson Correlation

Pearson chosen because:
- Well-understood
- Works for linear relationships
- Sufficient for this use case
- Easy to interpret (-1 to +1)

### Matrix as Primary View

Correlation matrix over single charts:
- Shows all relationships at once
- Easy to spot strongest correlations
- Familiar format for data analysis
- Drill-down available for detail

### Minimum Sample Threshold

Configurable minimum (default 10) because:
- Small samples produce unreliable correlations
- Users should know when data is thin
- Prevents false confidence
- Can be lowered for exploratory analysis

### No Automatic Rule Creation

Correlations don't automatically create rules:
- Correlation ≠ causation
- User interprets and decides
- Prevents bad rules from spurious correlations
- Rules require human judgment

### Grind Size Complexity

Grind size is problematic for correlation:
- Text field ("8 clicks", "3.5")
- Different grinders, different scales
- Options: ignore, manual mapping, or pattern extraction
- Initially: show warning, let user interpret

### Filter by Coffee

Per-coffee analysis important because:
- Different coffees respond differently
- Origin and roast affect variable relationships
- Aggregate analysis may hide coffee-specific patterns

## Open Questions

1. **Grind Normalization**: How to handle varied grind descriptions for analysis?
2. **Categorical Variables**: Include filter type, process in correlations?
3. **Statistical Significance**: Show p-values alongside correlations?
4. **Export**: Export correlation data for external analysis?
5. **Trend Over Time**: Show how correlations change as user gains experience?
