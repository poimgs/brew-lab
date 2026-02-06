# Experiment Review

> **DEPRECATED**: This spec has been superseded by [dashboard.md](dashboard.md). The Experiments list page is removed. Experiment detail is now a modal component (see Dashboard spec). The Comparison view is retained within the Dashboard. Do not implement this spec — refer to dashboard.md instead.

## Overview

Experiment Review is how users browse, filter, and compare their brewing history. It provides two modes based on selection:

| Mode | Selection | Purpose |
|------|-----------|---------|
| **List** | — | Browse, filter, sort experiments |
| **Compare** | 2-4 experiments | Side-by-side parameter/outcome table |

**Key capabilities:**
- Finding specific experiments
- Comparing multiple experiments side-by-side
- Detailed examination of individual brews

> **Note:** For correlation analysis across experiments, see the separate [Analysis](/analysis) feature documented in [analysis.md](./analysis.md).

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

> **Note:** Analysis-related API endpoints (`/experiments/analyze` and `/experiments/analyze/detail`) are documented in [analysis.md](./analysis.md).

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

---

## Open Questions

1. **Inline Editing**: Edit fields directly in detail view without modal?
2. **Comparison Persistence**: Save comparison sets for revisiting?
3. **Notes Search**: Full-text search within experiment notes?
4. **Export**: Export experiments to CSV/JSON?
