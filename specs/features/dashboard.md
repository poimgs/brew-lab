# Dashboard

## Overview

The Dashboard is the primary analytical hub, replacing the former Experiments list page and Analysis page. It provides goal-focused insights at two levels:

1. **Landing view** (`/dashboard`): Cross-coffee goal progress overview, correlation matrix, and key insights
2. **Per-coffee drill-down** (`/dashboard?coffee={id}`): Goal trends, correlations, insights, sessions, and brew history for a single coffee

The Dashboard answers two questions:
- **Landing**: "How am I progressing across all my coffees?"
- **Drill-down**: "What should I change next for this coffee?"

**Route:** `/dashboard` (landing) and `/dashboard?coffee={id}` (per-coffee drill-down)

**Dependencies:** coffees, brew-tracking, sessions

**Replaces:** [experiment-review.md](experiment-review.md) (deprecated), [analysis.md](analysis.md) (deprecated)

---

## Landing Page

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ─── Goal Progress ─── (centerpiece)                                │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────┐      │
│ │ Kiamaina · Cata Coffee                          [View →] │      │
│ │ 8 experiments · Last brewed: Jan 20                       │      │
│ │                                                           │      │
│ │ TDS       ████████░░ 1.35 / 1.38 target                 │      │
│ │ Extract   ███████░░░ 19.8% / 20.5% target               │      │
│ │ Sweetness ██████████ 8/8 target  ✓                       │      │
│ │ Overall   ████████░░ 8/9 target                          │      │
│ └───────────────────────────────────────────────────────────┘      │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────┐      │
│ │ El Calagual · Onyx                              [View →] │      │
│ │ 5 experiments · Last brewed: Jan 18                       │      │
│ │                                                           │      │
│ │ TDS       ██████░░░░ 1.30 / 1.40 target                 │      │
│ │ Body      ████████░░ 7/8 target                          │      │
│ │ Overall   ██████░░░░ 6/9 target                          │      │
│ └───────────────────────────────────────────────────────────┘      │
│                                                                     │
│ ═══════════════════════════════════════════════════════════════════ │
│                                                                     │
│ ─── Correlations ───                                               │
│                                                                     │
│ Cross-coffee correlation matrix (all experiments)                   │
│ [Correlation matrix — same as current Analysis page]               │
│                                                                     │
│ ═══════════════════════════════════════════════════════════════════ │
│                                                                     │
│ ─── Insights ───                                                   │
│                                                                     │
│ • Temperature strongly affects brightness (+0.65)                  │
│ • Body is most influenced by dose (+0.61)                          │
│ • Kiamaina: sweetness goal reached ✓ — try increasing complexity   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Goal Progress Section (Centerpiece)

The primary section. Shows each active coffee (with goals set) and progress toward targets.

**Per-coffee card shows:**
- Coffee name and roaster
- Experiment count and last brewed date
- Progress bars for each goal that has been set
- Current value = latest experiment's value for that metric
- Target value = from coffee goals
- Checkmark when target is met or exceeded
- [View →] link navigates to per-coffee drill-down

**Ordering:** Coffees sorted by last brewed date (most recent first).

**Coffees without goals:** Shown at the bottom with a prompt: "Set goals to track progress"

**Coffees without experiments:** Not shown on dashboard (nothing to report)

### Correlation Matrix Section

Displays the existing `AnalyzeView` component with all experiments across all coffees. Uses the filter-based analyze endpoint with no filters (= all experiments).

- Same heatmap/table visualization as current Analysis page
- Click cell → scatter plot drill-down (same as current)
- Minimum 5 experiments required

### Insights Section

Auto-generated insights combining:
- **Correlation insights**: Strong correlations from the matrix (reused from analyze response)
- **Goal insights**: Which coffees are close to or have reached goals
- **Actionable suggestions**: Based on correlations + goal gaps (e.g., "Kiamaina sweetness is 2 points below target; temperature has a strong positive correlation with sweetness — try increasing temperature")

### Filters (Mobile Sidebar)

On mobile, filters are in a Sheet (slide-out drawer) triggered by a filter icon in the header.

**Filter options:**
- Coffee selection (multi-select, defaults to all)
- Date range
- Score range

On desktop, filters are minimal — the landing page shows all data by default. A filter icon in the header opens a collapsible filter panel.

---

## Per-Coffee Drill-Down

### Activation

Navigate to `/dashboard?coffee={id}` via:
- [View →] on a coffee's goal progress card
- Direct URL
- Clicking a coffee name anywhere in the dashboard

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Dashboard                                                         │
│                                                                     │
│ Kiamaina · Cata Coffee                          [+ New Experiment]  │
│ 8 experiments · Last brewed: Jan 20 · 57 days off roast            │
│                                                                     │
│ ═══════════════════════════════════════════════════════════════════ │
│                                                                     │
│ ─── Goal Trends ───                                                │
│                                                                     │
│ TDS        1.30 → 1.32 → 1.35 → 1.38        target: 1.38  ✓      │
│ Extraction 18.5 → 19.2 → 19.8 → 20.1        target: 20.5         │
│ Sweetness  5 → 6 → 7 → 8                     target: 8     ✓      │
│ Overall    5 → 6 → 7 → 8                     target: 9            │
│                                                                     │
│ ═══════════════════════════════════════════════════════════════════ │
│                                                                     │
│ ─── Correlations ───                                               │
│                                                                     │
│ Per-coffee correlation matrix (this coffee's experiments only)      │
│ [Correlation matrix filtered to this coffee]                       │
│                                                                     │
│ ═══════════════════════════════════════════════════════════════════ │
│                                                                     │
│ ─── Insights ───                                                   │
│                                                                     │
│ What to change:                                                    │
│ • Extraction is 0.4% below target — try finer grind (correlation   │
│   +0.52 between grind and extraction for this coffee)              │
│ • Overall score trending up but 1 point below target               │
│                                                                     │
│ What worked:                                                       │
│ • Sweetness goal reached ✓ after switching to 3.0 grind           │
│ • TDS hit target on last brew                                      │
│                                                                     │
│ ═══════════════════════════════════════════════════════════════════ │
│                                                                     │
│ ─── Sessions ───                              [+ New Session]      │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ Grind size sweep · 3 experiments · Variable: grind size     │    │
│ │ Conclusion: 3.0 was noticeably sweeter than 4.0      [View] │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│ ═══════════════════════════════════════════════════════════════════ │
│                                                                     │
│ ─── Brew History ───                                               │
│ ┌──────────┬──────┬───────┬───────┬───────┬────────┐              │
│ │ Date     │ DOR  │ Score │ Grind │ Ratio │ Temp   │              │
│ ├──────────┼──────┼───────┼───────┼───────┼────────┤              │
│ │⭐Jan 20  │ 62   │ 8/10  │ 3.0   │ 1:15  │ 96°C   │              │
│ │  Jan 18  │ 60   │ 7/10  │ 3.5   │ 1:15  │ 94°C   │              │
│ │  Jan 15  │ 57   │ 8/10  │ 3.5   │ 1:15  │ 96°C   │              │
│ └──────────┴──────┴───────┴───────┴───────┴────────┘              │
│                                                                     │
│ Click any row to view experiment details                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Goal Trends Section

Shows the progression of each goal metric across experiments (chronological order):
- Each row: metric name, series of values from experiments, target value
- Checkmark if latest value meets or exceeds target
- Arrow indicators showing trend direction
- Only shows metrics where goals have been set

### Per-Coffee Correlations

Same `AnalyzeView` component, but filtered to experiments for this coffee only. Uses the filter-based analyze endpoint with `coffee_ids: [id]`.

Requires minimum 5 experiments for this coffee.

### Insights Section

Two subsections:

**What to change:**
- Goal gaps: metrics below target with suggestions based on correlations
- Combines goal delta + correlation data to produce actionable recommendations
- Example: "Extraction is 0.4% below target — correlation with grind size is +0.52, try finer grind"

**What worked:**
- Goals that have been reached
- Positive trends (improving metrics)
- Successful variable changes from sessions

### Sessions Section

Shows sessions for this coffee (compact list). Same data as the Sessions section on coffee detail page. Links to session detail modal.

### Brew History Section

Same table format as coffee detail page. Clicking a row opens the experiment detail modal (not a page navigation).

- Star icon for reference brew
- Row actions: "Mark as Reference" and click to open detail modal
- Shows all experiments (paginated if many)

---

## Experiment Detail Modal

Experiment details are shown in a modal dialog instead of a dedicated page. The modal is triggered from:
- Brew history rows (coffee detail page or dashboard)
- Session experiment lists
- Any experiment link in the dashboard

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Experiment Detail                                            [×]    │
├─────────────────────────────────────────────────────────────────────┤
│ Kiamaina · Cata Coffee                                             │
│ January 20, 2026 · 62 days off roast                               │
├─────────────────────────────────────────────────────────────────────┤
│ Overall: 8/10                                                      │
│ "Best balance yet, clear sweetness development. Grind at 3.0       │
│ was the key change."                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────┬─────────────────┐                              │
│ │ PRE-BREW        │ BREW            │                              │
│ ├─────────────────┼─────────────────┤                              │
│ │ Dose: 15g       │ Bloom: 40g/30s  │                              │
│ │ Water: 225g     │ Pour 1: 90g     │                              │
│ │ Ratio: 1:15     │ Pour 2: 90g     │                              │
│ │ Grind: 3.0      │ Total: 2:45     │                              │
│ │ Temp: 96°C      │                 │                              │
│ │ Filter: Abaca   │                 │                              │
│ └─────────────────┴─────────────────┘                              │
│                                                                     │
│ ┌─────────────────┬─────────────────┐                              │
│ │ POST-BREW       │ OUTCOMES        │                              │
│ ├─────────────────┼─────────────────┤                              │
│ │ Bypass: 0ml     │ Coffee: 180ml   │                              │
│ │ Minerals: None  │ TDS: 1.38       │                              │
│ │                 │ EY: 20.1%       │                              │
│ └─────────────────┴─────────────────┘                              │
│                                                                     │
│ ─── SENSORY ───                                                    │
│ Aroma: 7 · Body: 7 · Flavor: 8 · Brightness: 7                   │
│ Sweetness: 8 · Cleanliness: 7 · Complexity: 6                     │
│ Balance: 8 · Aftertaste: 7                                         │
│                                                                     │
│ Improvement Ideas:                                                  │
│ Try pushing complexity — maybe longer bloom or higher temp          │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ [Edit]  [Copy as Template]  [Mark as Reference]          [Delete]  │
└─────────────────────────────────────────────────────────────────────┘
```

### Modal Behavior

- Opens as a Dialog component (not a sheet/drawer)
- Scrollable content area for long experiments
- Actions at the bottom: Edit, Copy as Template, Mark as Reference, Delete
- "Edit" navigates to the experiment form (wizard) with data pre-loaded
- "Copy as Template" creates a new experiment with same parameters (via existing copy endpoint)
- "Mark as Reference" sets this as the coffee's reference brew
- "Delete" shows confirmation dialog, then deletes

### Previous/Next Navigation

When opened from a list context (brew history, session experiments), the modal includes Prev/Next buttons to navigate through the list without closing:

```
│ [◀ Previous]                                    [Next ▶] │
```

---

## API Changes

### Enriched Coffee List

The existing `GET /api/v1/coffees` endpoint gains optional parameters for dashboard data:

```
GET /api/v1/coffees?include_goals=true&include_trend=true
```

**New Query Parameters:**
- `include_goals`: `true` to include each coffee's goals in the response
- `include_trend`: `true` to include latest experiment values for goal metrics

**Enriched Response (when both params are true):**
```json
{
  "items": [
    {
      "id": "uuid",
      "roaster": "Cata Coffee",
      "name": "Kiamaina",
      "experiment_count": 8,
      "last_brewed": "2026-01-20T10:30:00Z",
      "goals": {
        "tds": 1.38,
        "extraction_yield": 20.5,
        "sweetness_intensity": 8,
        "overall_score": 9
      },
      "latest_values": {
        "tds": 1.38,
        "extraction_yield": 20.1,
        "sweetness_intensity": 8,
        "overall_score": 8
      }
    }
  ]
}
```

- `goals` is `null` if no goals set for that coffee
- `latest_values` contains the values from the most recent experiment (by brew_date)
- Only goal-relevant fields are included in `latest_values`

### Goal Trends Endpoint

New endpoint for per-coffee goal progression:

```
GET /api/v1/coffees/:id/goal-trends
```

**Response:**
```json
{
  "coffee_id": "uuid",
  "metrics": {
    "tds": {
      "target": 1.38,
      "values": [
        {"brew_date": "2026-01-10", "value": 1.30},
        {"brew_date": "2026-01-15", "value": 1.35},
        {"brew_date": "2026-01-20", "value": 1.38}
      ],
      "target_met": true
    },
    "overall_score": {
      "target": 9,
      "values": [
        {"brew_date": "2026-01-10", "value": 6},
        {"brew_date": "2026-01-15", "value": 8},
        {"brew_date": "2026-01-20", "value": 8}
      ],
      "target_met": false
    }
  }
}
```

- Only includes metrics where the coffee has a goal set
- Values ordered chronologically (oldest first)
- `target_met` is true if the latest value meets or exceeds the target

### Existing Endpoints (Reused)

The dashboard reuses these existing endpoints without modification:
- `POST /api/v1/experiments/analyze` — correlation matrix (with filters)
- `POST /api/v1/experiments/analyze/detail` — scatter plot drill-down
- `GET /api/v1/coffees/:id/experiments` — brew history for a coffee
- `GET /api/v1/sessions?coffee_id={id}` — sessions for a coffee
- `POST /api/v1/experiments/compare` — comparison view

---

## Reused Components

The dashboard reuses existing frontend components:

| Component | Current Location | Usage in Dashboard |
|-----------|-----------------|-------------------|
| `AnalyzeView` | `components/experiment/AnalyzeView.tsx` | Correlation matrix (landing + drill-down) |
| `CompareView` | `components/experiment/CompareView.tsx` | Available from session detail or brew history selection |
| Analysis engine | `api/experiments.ts` | `analyzeExperimentsWithFilters()` function |

New components needed:
- `GoalProgressCard` — per-coffee goal progress with bars
- `GoalTrends` — per-coffee metric trend display
- `InsightsPanel` — generated insights from correlations + goals
- `ExperimentDetailModal` — experiment detail in a dialog
- `DashboardFilters` — filter controls (Sheet on mobile)

---

## Mobile Layout

### Landing Page (Mobile)

- Goal progress cards stack vertically (full width)
- Correlation matrix scrolls horizontally
- Insights section below correlations
- Filter icon in header opens Sheet with filter controls

### Drill-Down (Mobile)

- Sections stack vertically
- Goal trends shown as compact list (no chart)
- Correlation matrix scrolls horizontally
- Brew history table scrolls horizontally
- Sessions shown as stacked cards

---

## Design Decisions

### Goal-Focused Landing

The landing page centers on goal progress because:
- Goals represent what users care about most — "am I getting closer to my target brew?"
- Progress bars provide immediate, at-a-glance understanding
- More actionable than a raw experiment list or correlation matrix alone
- Correlation matrix is secondary context that explains the "how"

### Query Parameter Drill-Down

Per-coffee view uses `?coffee={id}` instead of a nested route because:
- Stays within the Dashboard context (back button returns to landing)
- Shareable URLs for specific coffee views
- Browser back/forward navigation works naturally
- Avoids route nesting complexity

### Modal for Experiment Detail

Experiment detail as a modal instead of a dedicated page because:
- Maintains context — user stays on the coffee's page/dashboard
- Faster navigation — no full page load to view an experiment
- Previous/Next navigation within the list context
- Users rarely need to deep-link to an individual experiment
- Edit action navigates away (to wizard) which is appropriate for a heavier interaction

### Combined Dashboard vs. Separate Pages

Single Dashboard page replacing Experiments + Analysis because:
- Reduces navigation choices — one destination for all analytical needs
- Goal progress + correlations + insights are complementary views of the same data
- Experiment browsing is secondary — users care about coffees, not raw experiment lists
- Simpler mental model: "Coffees for input, Dashboard for analysis"

### Insights Generation

Insights combine correlation data with goal gaps because:
- Raw correlation numbers are hard to interpret for most users
- Connecting correlations to goals makes them actionable
- "Temperature correlates with sweetness +0.6" is less useful than "Sweetness is 2 points below target — try increasing temperature"
- Insights are the bridge between data and action

---

## Open Questions

1. **Trend Visualization**: Line charts vs. sparklines vs. text-based trends for goal progression?
2. **Insight Quality**: How to handle low-confidence insights (few experiments, weak correlations)?
3. **Dashboard Caching**: Cache correlation results since they're expensive to compute?
4. **Comparison from Dashboard**: Allow selecting experiments for comparison directly from the drill-down brew history?
5. **Goal Alerts**: Notify when a goal is reached or regressed?
