# Dashboard

## Overview

The Dashboard is the primary analytical hub, replacing the former Brews list page and Analysis page. It provides goal-focused insights at two levels:

1. **Landing view** (`/dashboard`): Cross-coffee goal progress overview, correlation matrix, and key insights
2. **Per-coffee drill-down** (`/dashboard?coffee={id}`): Goal trends, correlations, insights, sessions, and brew history for a single coffee

The Dashboard answers two questions:
- **Landing**: "How am I progressing across all my coffees?"
- **Drill-down**: "What should I change next for this coffee?"

**Route:** `/dashboard` (landing) and `/dashboard?coffee={id}` (per-coffee drill-down)

**Dependencies:** coffees, brew-tracking, sessions

**Replaces:** the former Brews list page and Analysis page (both removed)

---

## Landing Page

### Layout

```
+-------------------------------------------------------------------+
| Dashboard                                                          |
+-------------------------------------------------------------------+
|                                                                    |
| --- Goal Progress --- (centerpiece)                               |
|                                                                    |
| +-----------------------------------------------------------+     |
| | Kiamaina - Cata Coffee                          [View ->] |     |
| | 8 brews - Last brewed: Jan 20                              |     |
| |                                                            |     |
| | TDS       ========.. 1.35 / 1.38 target                   |     |
| | Extract   =======... 19.8% / 20.5% target                 |     |
| | Sweetness ========== 8/8 target  check                     |     |
| | Overall   ========.. 8/9 target                            |     |
| +-----------------------------------------------------------+     |
|                                                                    |
| +-----------------------------------------------------------+     |
| | El Calagual - Onyx                              [View ->] |     |
| | 5 brews - Last brewed: Jan 18                              |     |
| |                                                            |     |
| | TDS       ======.... 1.30 / 1.40 target                   |     |
| | Body      ========.. 7/8 target                            |     |
| | Overall   ======.... 6/9 target                            |     |
| +-----------------------------------------------------------+     |
|                                                                    |
| =================================================================  |
|                                                                    |
| --- Correlations ---                                               |
|                                                                    |
| Cross-coffee correlation matrix (all brews)                        |
| [Correlation matrix — same as current Analysis page]              |
|                                                                    |
| =================================================================  |
|                                                                    |
| --- Insights ---                                                   |
|                                                                    |
| - Temperature strongly affects brightness (+0.65)                 |
| - Body is most influenced by dose (+0.61)                         |
| - Kiamaina: sweetness goal reached — try increasing complexity    |
|                                                                    |
+-------------------------------------------------------------------+
```

### Goal Progress Section (Centerpiece)

The primary section. Shows each active coffee (with goals set) and progress toward targets.

**Per-coffee card shows:**
- Coffee name and roaster
- Brew count and last brewed date
- Progress bars for each goal that has been set
- Current value = latest brew's value for that metric
- Target value = from coffee goals
- Checkmark when target is met or exceeded
- [View ->] link navigates to per-coffee drill-down

**Ordering:** Coffees sorted by last brewed date (most recent first).

**Coffees without goals:** Shown at the bottom with a prompt: "Set goals to track progress"

**Coffees without brews:** Not shown on dashboard (nothing to report)

### Correlation Matrix Section

Displays the existing `AnalyzeView` component with all brews across all coffees. Uses the filter-based analyze endpoint with no filters (= all brews).

- Same heatmap/table visualization as current Analysis page
- Click cell → scatter plot drill-down (same as current)
- Minimum 5 brews required

### Insights Section

Auto-generated insights combining:
- **Correlation insights**: Strong correlations from the matrix (reused from analyze response)
- **Goal insights**: Which coffees are close to or have reached goals
- **Actionable suggestions**: Based on correlations + goal gaps (e.g., "Kiamaina sweetness is 2 points below target; temperature has a strong positive correlation with sweetness — try increasing temperature")

### Filters

Filters control which brews feed into the Goal Progress cards and Correlation matrix.

**Component:** `DashboardFilters`

**Filter options:**
- **Coffee selection**: Multi-select checkboxes in a scrollable grid. Select All / Deselect All toggle. Each coffee shows brew count badge. Defaults to all (empty = all).
- **Date range**: From/To date inputs. Filters brews by `brew_date`.
- **Score range**: Min/Max number inputs (1-10). Filters brews by `overall_score`.

**Actions:**
- **Clear All**: Resets all filters to defaults and clears correlation results
- **Apply Filters**: Re-fetches correlations with current filter values; client-side filters goal progress cards by selected coffee IDs

**Desktop layout:** Collapsible Card between the heading and Goal Progress section. Filter icon button in the heading toggles visibility. Active filter count shown as badge.

**Mobile layout (`md:hidden`):** Filter icon button in heading opens a `<Sheet side="right">` containing `<DashboardFilters embedded>`. Active filter count badge on the button.

**Behavior:**
- Goal progress cards: filtered client-side by `selectedCoffeeIds` (when non-empty)
- Correlations: re-fetched server-side via `analyzeBrewsWithFilters()` on Apply click, passing `coffee_ids`, `date_from`, `date_to`, `score_min`, `score_max`
- Filter state is not persisted across page navigations

---

## Per-Coffee Drill-Down

### Activation

Navigate to `/dashboard?coffee={id}` via:
- [View ->] on a coffee's goal progress card
- Direct URL
- Clicking a coffee name anywhere in the dashboard

### Layout

```
+-------------------------------------------------------------------+
| <- Dashboard                                                        |
|                                                                    |
| Kiamaina - Cata Coffee                          [+ New Brew]       |
| 8 brews - Last brewed: Jan 20 - 57 days off roast                 |
|                                                                    |
| =================================================================  |
|                                                                    |
| --- Sensory Profile ---                                            |
|                                                                    |
|       (Radar chart: 9 sensory dimensions)                          |
|                                                                    |
|            Aroma                                                   |
|         /        \                                                 |
|   Aftertaste    Sweetness        === Reference Brew (filled)       |
|       |    \  /    |             --- Target Goals (dashed)          |
|  Balance -- + -- Body                                              |
|       |    / \     |                                               |
|  Complexity  Flavor                                                |
|         \        /                                                 |
|         Brightness                                                 |
|        Cleanliness                                                 |
|                                                                    |
| =================================================================  |
|                                                                    |
| --- Correlations ---                                               |
|                                                                    |
| Per-coffee correlation matrix (this coffee's brews only)           |
| [Correlation matrix filtered to this coffee]                      |
|                                                                    |
| =================================================================  |
|                                                                    |
| --- Insights ---                                                   |
|                                                                    |
| What to change:                                                    |
| - Extraction is 0.4% below target — try finer grind (correlation  |
|   +0.52 between grind and extraction for this coffee)             |
| - Overall score trending up but 1 point below target              |
|                                                                    |
| What worked:                                                       |
| - Sweetness goal reached after switching to 3.0 grind             |
| - TDS hit target on last brew                                     |
|                                                                    |
| =================================================================  |
|                                                                    |
| --- Sessions ---                              [+ New Session]      |
|                                                                    |
| +-------------------------------------------------------------+   |
| | Grind size sweep - 3 brews - Variable: grind size            |   |
| | Conclusion: 3.0 was noticeably sweeter than 4.0      [View] |   |
| +-------------------------------------------------------------+   |
|                                                                    |
| =================================================================  |
|                                                                    |
| --- Brew History ---                                               |
| +----+----------+------+-------+-------+-------+--------+         |
| | [] | Date     | DOR  | Score | Grind | Ratio | Temp   |         |
| +----+----------+------+-------+-------+-------+--------+         |
| | [] |*Jan 20   | 62   | 8/10  | 3.0   | 1:15  | 96C    |         |
| | [] |  Jan 18  | 60   | 7/10  | 3.5   | 1:15  | 94C    |         |
| | [] |  Jan 15  | 57   | 8/10  | 3.5   | 1:15  | 96C    |         |
| +----+----------+------+-------+-------+-------+--------+         |
|                                                                    |
| Click any row to view brew details                                |
| [] = checkbox to select brews for comparison (max 6)              |
|                                                                    |
| =================================================================  |
|                                                                    |
| --- Compare Brews ---                                              |
|                                                                    |
| [Variable toggles: Grind | Temp | Ratio | Score | ...]            |
|                                                                    |
| +--Grind Size--+  +--Temperature--+  +----Ratio-----+             |
| |  3.0  3.5    |  |  96   94      |  | 1:15  1:15   |             |
| |  |||  |||    |  |  |||  |||     |  |  |||   |||   |             |
| +--------------+  +---------------+  +---------------+             |
|                                                                    |
| "Select 2 or more brews from brew history to compare"             |
|                                                                    |
+-------------------------------------------------------------------+
```

### Sensory Profile Section

Replaces the former "Goal Trends" text-based display with a visual radar chart.

**Component:** `SensoryRadarChart`

**Props:** `referenceBrew: Brew | null`, `goals: CoffeeGoalSummary | null`

**9 sensory dimensions:** aroma, sweetness, body, flavor, brightness, cleanliness, complexity, balance, aftertaste

**Visualization:**
- Recharts `<RadarChart>` with `<PolarRadiusAxis>` domain `[0, 10]`
- Two `<Radar>` layers:
  - **"Reference"**: Filled area in primary color — values from the reference brew (or latest brew)
  - **"Target"**: Dashed stroke in secondary color — values from coffee goals
- Legend below chart identifying each layer

**Data derivation:**
- `referenceBrew`: brew matching `coffee.best_brew_id` from brews array, falling back to `brews[0]`
- `goalTargets`: extracted from `trends.metrics[key].target` mapped to CoffeeGoalSummary shape

**Fallback states:**
- No data at all → "No sensory data or goals set"
- Only goals, no brew → single target layer + "Brew a coffee to see how it compares"
- Only brew, no goals → single reference layer + "Set goals to see target overlay"

### Per-Coffee Correlations

Same `AnalyzeView` component, but filtered to brews for this coffee only. Uses the filter-based analyze endpoint with `coffee_ids: [id]`.

Requires minimum 5 brews for this coffee.

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

Same table format as coffee detail page. Clicking a row opens the brew detail modal (not a page navigation).

- **Checkbox column** at start of each row for selecting brews to compare (max 6)
  - Checkbox click uses `stopPropagation` to prevent opening the detail modal
  - Checkbox disabled when 6 are already selected and this one isn't checked
- Star icon for reference brew
- Row actions: "Mark as Reference" and click to open detail modal
- Shows all brews (paginated if many)

### Compare Brews Section

Appears after Brew History. Driven by the checkbox selections in the brew history table.

**Component:** `VariableComparisonChart`

**Props:** `brews: Brew[]` (2-6 selected brews)

**Layout:** Small-multiples approach — one mini `<BarChart>` per selected variable, arranged in `grid gap-4 md:grid-cols-2 lg:grid-cols-3`. Each mini Card is ~160px tall with its own Y-axis scale.

**Variable toggles:** Row of buttons grouped by category, allowing users to choose which variables to compare:
- **Brew params**: grind_size, water_temperature, ratio, bloom_time, total_brew_time, water_bypass_ml
- **Sensory**: all 9 intensity fields
- **Outcomes**: overall_score, tds, extraction_yield, coffee_ml
- **Defaults**: grind_size, water_temperature, ratio, overall_score

**Bar coloring:** Bars colored per brew using a 6-color palette. X-axis labels show short brew dates (e.g., "Jan 20").

**Fallback:** "Select 2 or more brews from brew history to compare" when fewer than 2 brews are checked

---

## Brew Detail Modal

Brew details are shown in a modal dialog instead of a dedicated page. The modal is triggered from:
- Brew history rows (coffee detail page or dashboard)
- Session brew lists
- Any brew link in the dashboard

### Layout

```
+-------------------------------------------------------------------+
| Brew Detail                                                  [x]   |
+-------------------------------------------------------------------+
| Kiamaina - Cata Coffee                                             |
| January 20, 2026 - 62 days off roast                               |
+-------------------------------------------------------------------+
| Overall: 8/10                                                      |
| "Best balance yet, clear sweetness development. Grind at 3.0      |
| was the key change."                                               |
+-------------------------------------------------------------------+
|                                                                    |
| +-----------------+-----------------+                              |
| | PRE-BREW        | BREW            |                              |
| +-----------------+-----------------+                              |
| | Dose: 15g       | Bloom: 40g/30s  |                              |
| | Water: 225g     | Pour 1: 90g     |                              |
| | Ratio: 1:15     | Pour 2: 90g     |                              |
| | Grind: 3.0      | Total: 2:45     |                              |
| | Temp: 96C       |                 |                              |
| | Filter: Abaca   |                 |                              |
| +-----------------+-----------------+                              |
|                                                                    |
| +-----------------+-----------------+                              |
| | POST-BREW       | OUTCOMES        |                              |
| +-----------------+-----------------+                              |
| | Bypass: 0ml     | Coffee: 180ml   |                              |
| | Minerals: None  | TDS: 1.38       |                              |
| |                 | EY: 20.1%       |                              |
| +-----------------+-----------------+                              |
|                                                                    |
| --- SENSORY ---                                                    |
| Aroma: 7 - Body: 7 - Flavor: 8 - Brightness: 7                   |
| Sweetness: 8 - Cleanliness: 7 - Complexity: 6                     |
| Balance: 8 - Aftertaste: 7                                         |
|                                                                    |
| Improvement Ideas:                                                  |
| Try pushing complexity — maybe longer bloom or higher temp          |
|                                                                    |
+-------------------------------------------------------------------+
| [Edit]  [Copy as Template]  [Mark as Reference]          [Delete]  |
+-------------------------------------------------------------------+
```

### Modal Behavior

- Opens as a Dialog component (not a sheet/drawer)
- Scrollable content area for long brews
- Actions at the bottom: Edit, Copy as Template, Mark as Reference, Delete
- "Edit" navigates to the brew form (wizard) with data pre-loaded
- "Copy as Template" creates a new brew with same parameters (via existing copy endpoint)
- "Mark as Reference" sets this as the coffee's reference brew
- "Delete" shows confirmation dialog, then deletes

### Previous/Next Navigation

When opened from a list context (brew history, session brews), the modal includes Prev/Next buttons to navigate through the list without closing:

```
| [< Previous]                                    [Next >] |
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
- `include_trend`: `true` to include latest brew values for goal metrics

**Enriched Response (when both params are true):**
```json
{
  "items": [
    {
      "id": "uuid",
      "roaster": "Cata Coffee",
      "name": "Kiamaina",
      "brew_count": 8,
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
- `latest_values` contains the values from the most recent brew (by brew_date)
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
- `POST /api/v1/brews/analyze` — correlation matrix (with filters)
- `POST /api/v1/brews/analyze/detail` — scatter plot drill-down
- `GET /api/v1/coffees/:id/brews` — brew history for a coffee
- `GET /api/v1/sessions?coffee_id={id}` — sessions for a coffee
- `POST /api/v1/brews/compare` — comparison view

---

## Reused Components

The dashboard reuses existing frontend components:

| Component | Current Location | Usage in Dashboard |
|-----------|-----------------|-------------------|
| `AnalyzeView` | `components/brew/AnalyzeView.tsx` | Correlation matrix (landing + drill-down) |
| `CompareView` | `components/brew/CompareView.tsx` | Available from session detail or brew history selection |
| Analysis engine | `api/brews.ts` | `analyzeBrewsWithFilters()` function |

New components needed:
- `GoalProgressCard` — per-coffee goal progress with bars
- `SensoryRadarChart` — radar chart comparing reference brew sensory values vs target goals
- `VariableComparisonChart` — small-multiples bar charts for comparing selected brews
- `InsightsPanel` — generated insights from correlations + goals
- `BrewDetailModal` — brew detail in a dialog
- `DashboardFilters` — filter controls (collapsible Card on desktop, Sheet on mobile)

---

## Mobile Layout

### Landing Page (Mobile)

- Goal progress cards stack vertically (full width)
- Correlation matrix scrolls horizontally
- Insights section below correlations
- Filter icon in header opens Sheet with filter controls

### Drill-Down (Mobile)

- Sections stack vertically
- Sensory radar chart scales down responsively (remains a chart, not text)
- Correlation matrix scrolls horizontally
- Brew history table scrolls horizontally (checkbox column remains)
- Compare Brews mini-charts stack in single column
- Sessions shown as stacked cards

---

## Design Decisions

### Goal-Focused Landing

The landing page centers on goal progress because:
- Goals represent what users care about most — "am I getting closer to my target brew?"
- Progress bars provide immediate, at-a-glance understanding
- More actionable than a raw brew list or correlation matrix alone
- Correlation matrix is secondary context that explains the "how"

### Query Parameter Drill-Down

Per-coffee view uses `?coffee={id}` instead of a nested route because:
- Stays within the Dashboard context (back button returns to landing)
- Shareable URLs for specific coffee views
- Browser back/forward navigation works naturally
- Avoids route nesting complexity

### Modal for Brew Detail

Brew detail as a modal instead of a dedicated page because:
- Maintains context — user stays on the coffee's page/dashboard
- Faster navigation — no full page load to view a brew
- Previous/Next navigation within the list context
- Users rarely need to deep-link to an individual brew
- Edit action navigates away (to wizard) which is appropriate for a heavier interaction

### Combined Dashboard vs. Separate Pages

Single Dashboard page replacing Brews + Analysis because:
- Reduces navigation choices — one destination for all analytical needs
- Goal progress + correlations + insights are complementary views of the same data
- Brew browsing is secondary — users care about coffees, not raw brew lists
- Simpler mental model: "Coffees for input, Dashboard for analysis"

### Insights Generation

Insights combine correlation data with goal gaps because:
- Raw correlation numbers are hard to interpret for most users
- Connecting correlations to goals makes them actionable
- "Temperature correlates with sweetness +0.6" is less useful than "Sweetness is 2 points below target — try increasing temperature"
- Insights are the bridge between data and action

---

## Open Questions

1. ~~**Trend Visualization**~~ — **Resolved**: Radar chart chosen. `SensoryRadarChart` shows reference brew vs target goals across 9 sensory dimensions. More informative than text-based arrows and enables quick visual comparison.
2. **Insight Quality**: How to handle low-confidence insights (few brews, weak correlations)?
3. **Dashboard Caching**: Cache correlation results since they're expensive to compute?
4. ~~**Comparison from Dashboard**~~ — **Resolved**: Yes. Checkboxes on brew history rows allow selecting 2-6 brews. `VariableComparisonChart` shows small-multiples bar charts for togglable variables.
5. **Goal Alerts**: Notify when a goal is reached or regressed?
