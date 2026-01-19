# Experiment Review Feature

## Context

Experiment review is how users browse, filter, and analyze their brewing history. It supports:
- Finding specific experiments
- Comparing multiple experiments
- Understanding patterns over time
- Detailed examination of individual brews

## Requirements

### User Stories

1. **Browse History**: As a user, I can see all my experiments chronologically
2. **Filter & Search**: As a user, I can find experiments by coffee, date, score, etc.
3. **View Details**: As a user, I can see complete details of any experiment
4. **Compare Experiments**: As a user, I can compare 2-4 experiments side-by-side
5. **Edit Experiment**: As a user, I can correct or add details after entry
6. **Delete Experiment**: As a user, I can remove erroneous experiments

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

## Open Questions

1. **Inline Editing**: Edit fields directly in detail view without modal?
2. **Comparison Persistence**: Save comparison sets for revisiting?
3. **Notes Search**: Full-text search within experiment notes?
4. **Export**: Export experiments to CSV/JSON?
