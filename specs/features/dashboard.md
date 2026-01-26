# Dashboard

## Overview

The Dashboard is the home landing page, providing at-a-glance performance data and quick access to recent activity. It serves as the central hub for understanding brewing trends and accessing common actions.

**Key capabilities:**
- View recent brewing activity
- See coffee performance at a glance
- Quick access to new experiment logging
- Surface insights from recent data

**Dependencies:** coffee-library, brew-tracking

---

## User Interface

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Dashboard                                        [+ New Experiment] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ RECENT ACTIVITY                                                 │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ Today                                                           │ │
│ │   • Kiamaina · 7/10 · "Bright, nice acidity"           10:30 AM │ │
│ │   • El Calagual · 8/10 · "Best brew yet"                8:15 AM │ │
│ │                                                                 │ │
│ │ Yesterday                                                       │ │
│ │   • Kiamaina · 6/10 · "Too acidic, try lower temp"      9:00 AM │ │
│ │                                                       [View All] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ COFFEE PERFORMANCE                                              │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │                                                                 │ │
│ │ ┌───────────────────┐  ┌───────────────────┐                    │ │
│ │ │ Kiamaina          │  │ El Calagual       │                    │ │
│ │ │ Cata Coffee       │  │ Long Miles        │                    │ │
│ │ │                   │  │                   │                    │ │
│ │ │ Avg: 7.2  ▲ 0.4   │  │ Avg: 7.8  ─ 0.0   │                    │ │
│ │ │ Best: 8           │  │ Best: 9           │                    │ │
│ │ │ 12 brews          │  │ 8 brews           │                    │ │
│ │ │                   │  │                   │                    │ │
│ │ │ [▂▄▆▅▇█▅▆]        │  │ [▅▆▇▇█▇▆▇]        │                    │ │
│ │ │ Last 30 days      │  │ Last 30 days      │                    │ │
│ │ └───────────────────┘  └───────────────────┘                    │ │
│ │                                                                 │ │
│ │ ┌───────────────────┐  ┌───────────────────┐                    │ │
│ │ │ Finca La Estrella │  │ + Add Coffee      │                    │ │
│ │ │ Sweet Maria's     │  │                   │                    │ │
│ │ │                   │  │ Start tracking    │                    │ │
│ │ │ Avg: 6.5  ▼ 0.3   │  │ a new coffee      │                    │ │
│ │ │ Best: 7           │  │                   │                    │ │
│ │ │ 5 brews           │  │                   │                    │ │
│ │ │                   │  │                   │                    │ │
│ │ │ [▄▅▄▃▄]           │  │                   │                    │ │
│ │ │ Last 30 days      │  │                   │                    │ │
│ │ └───────────────────┘  └───────────────────┘                    │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Recent Activity Section

Shows experiments grouped by relative date (Today, Yesterday, This Week, Earlier).

**Activity Item:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ● Kiamaina · 7/10 · "Bright, nice acidity"             10:30 AM │
└─────────────────────────────────────────────────────────────────┘
```

**Item components:**
- Score indicator (color-coded dot)
- Coffee name
- Score
- Notes excerpt (truncated)
- Time

**Interactions:**
- Click item → Navigate to experiment detail
- "View All" → Navigate to experiments list

**Empty state:**
```
┌─────────────────────────────────────────────────────────────────┐
│ RECENT ACTIVITY                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│           No experiments yet                                    │
│                                                                 │
│           Start by logging your first brew                      │
│                                                                 │
│                    [+ New Experiment]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Coffee Performance Cards

Rich detail cards showing performance metrics for each active coffee.

**Card Layout:**
```
┌─────────────────────────────────────┐
│ Kiamaina                            │
│ Cata Coffee                         │
│                                     │
│ Avg: 7.2  ▲ 0.4                     │
│ Best: 8                             │
│ 12 brews                            │
│                                     │
│ [▂▄▆▅▇█▅▆]                          │
│ Last 30 days                        │
└─────────────────────────────────────┘
```

**Card components:**
- **Header:** Coffee name, roaster
- **Average score:** Current average with trend indicator (▲ improving, ▼ declining, ─ stable)
- **Best score:** Highest score achieved
- **Brew count:** Total experiments with this coffee
- **Sparkline:** Score trend over last 30 days
- **Period label:** "Last 30 days"

**Trend calculation:**
- Compare average of last 7 days vs previous 7 days
- ▲ (teal): +0.3 or more improvement
- ▼ (red): -0.3 or more decline
- ─ (gray): Within ±0.3

**Card grid:**
- 2 columns on mobile
- 3-4 columns on tablet/desktop
- Maximum 8 cards displayed (most recently brewed)
- Final slot is "Add Coffee" card if fewer than 8 active coffees

**Interactions:**
- Click card → Navigate to coffee detail (filtered experiment list)
- Click "Add Coffee" → Navigate to coffee library with add modal

**Empty state (no coffees):**
```
┌─────────────────────────────────────────────────────────────────┐
│ COFFEE PERFORMANCE                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              No coffees in your library                         │
│                                                                 │
│              Add coffees to start tracking                      │
│                                                                 │
│                       [+ Add Coffee]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Responsive Behavior

**Mobile (< 640px):**
- Single column layout
- Recent activity shows 3-5 items
- Performance cards in 2-column grid
- Reduced card content (hide sparkline)

**Tablet (640px - 1024px):**
- Recent activity as full-width section
- Performance cards in 3-column grid

**Desktop (> 1024px):**
- Recent activity as full-width section
- Performance cards in 4-column grid
- Maximum information density

---

## API Endpoints

### Get Dashboard Data

```
GET /api/v1/dashboard
```

Returns aggregated data for dashboard display.

**Response:**
```json
{
  "data": {
    "recent_experiments": [
      {
        "id": "uuid",
        "brew_date": "2026-01-19T10:30:00Z",
        "coffee_name": "Kiamaina",
        "coffee_roaster": "Cata Coffee",
        "overall_score": 7,
        "notes": "Bright, nice acidity...",
        "relative_date": "today"
      }
    ],
    "coffee_performance": [
      {
        "coffee_id": "uuid",
        "coffee_name": "Kiamaina",
        "roaster": "Cata Coffee",
        "average_score": 7.2,
        "best_score": 8,
        "experiment_count": 12,
        "trend": "improving",
        "trend_delta": 0.4,
        "sparkline": [5, 6, 7, 6, 8, 9, 6, 7],
        "last_brewed": "2026-01-19T10:30:00Z"
      }
    ],
    "summary": {
      "total_experiments": 47,
      "total_coffees": 6,
      "experiments_this_week": 5,
      "average_score_this_week": 7.4
    }
  }
}
```

**Query parameters:**
- `recent_limit`: Number of recent experiments to return (default: 10, max: 20)
- `coffee_limit`: Number of coffee performance cards to return (default: 8, max: 12)

**Field definitions:**

| Field | Description |
|-------|-------------|
| `relative_date` | One of: `today`, `yesterday`, `this_week`, `earlier` |
| `trend` | One of: `improving`, `declining`, `stable` |
| `trend_delta` | Numeric change in average (positive or negative) |
| `sparkline` | Array of scores for last 30 days (one per brew, chronological) |

### Performance Calculation

**Average score:**
- Mean of all `overall_score` values for the coffee
- Rounded to 1 decimal place

**Trend calculation:**
```
recent_avg = average(scores from last 7 days)
previous_avg = average(scores from 8-14 days ago)
trend_delta = recent_avg - previous_avg

if trend_delta >= 0.3: trend = "improving"
if trend_delta <= -0.3: trend = "declining"
else: trend = "stable"
```

**Sparkline data:**
- One data point per experiment
- Last 30 days of experiments
- Maximum 20 data points (sample if more)
- Chronological order (oldest first)

---

## Navigation

The dashboard serves as the home page. Navigation structure:

| Item | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Home landing page (this feature) |
| Experiments | `/experiments` | Brew list and review |
| Library | `/library` | Coffee + Reference Data (combined) |
| Settings | `/settings` | User preferences |

**Header navigation:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ☕ Coffee Tracker   [Dashboard] [Experiments] [Library] [⚙️]    │
└─────────────────────────────────────────────────────────────────┘
```

**Active state:** Current page highlighted with teal underline/background.

---

## Design Decisions

### Dashboard as Home

Landing on dashboard instead of experiment list because:
- Provides immediate value/insight on arrival
- Summarizes state without requiring navigation
- Common pattern for data-driven applications
- Quick orientation before diving into details

### Rich Performance Cards

Cards with sparklines instead of simple lists because:
- Visual trends are immediately scannable
- More engaging than tables of numbers
- Encourages exploration of individual coffees
- Shows improvement trajectory at a glance

### Recent Activity Grouping

Grouped by relative date instead of flat list because:
- Creates natural visual hierarchy
- "Today" vs "Yesterday" more scannable than absolute dates
- Reduces cognitive load when reviewing recent work
- Common pattern in activity feeds

### Limited Card Count

Maximum 8 cards instead of showing all coffees because:
- Keeps dashboard scannable
- Most users focus on active coffees
- Prevents overwhelming information density
- "Most recently brewed" prioritization is useful
- Full library available via Library navigation

### Trend Threshold

±0.3 threshold for trend indicators because:
- Smaller changes may be noise
- Provides meaningful signal
- Prevents constant "improving/declining" flickering
- 0.3 represents noticeable taste difference

---

## Open Questions

1. **Weekly summary:** Add a "this week" summary card with total brews, average score?
2. **Quick actions:** Should cards have quick action buttons (new brew, view all)?
3. **Customization:** Allow users to pin/reorder coffee cards?
4. **Notifications:** Surface "haven't brewed X in 2 weeks" prompts?
