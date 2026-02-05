# Home

## Overview

The Home page is the landing page, providing quick access to the primary action: logging new experiments. It surfaces recent activity at a glance without overwhelming the user with analytics.

**Key capabilities:**
- Quick access to new experiment logging
- View recent experiments

**Dependencies:** brew-tracking

---

## User Interface

### Home Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Coffee Tracker                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ┌─────────────────────┐                          │
│                    │                     │                          │
│                    │  + New Experiment   │                          │
│                    │                     │                          │
│                    └─────────────────────┘                          │
│                                                                     │
│  RECENTLY BREWED COFFEES                         ←  [●○○○○]  →      │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐   │
│  │ Kiamaina                    │  │ El Calagual                 │   │
│  │ Cata Coffee                 │  │ Square Mile                 │   │
│  │                             │  │                             │   │
│  │ Best Brew (Jan 15)    8/10  │  │ Best Brew (Jan 14)    9/10  │   │
│  │ 1:15 · 96°C · Abaca         │  │ 1:16 · 94°C · Cafec         │   │
│  │ Bloom 30s → 3 pours         │  │ Bloom 45s → 4 pours         │   │
│  │                             │  │                             │   │
│  │ "Try finer grind..."        │  │ "Perfect as is"             │   │
│  │                [+ New Brew] │  │                [+ New Brew] │   │
│  └─────────────────────────────┘  └─────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Header

Simple header with app name, navigation bar, and user menu.

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☕ Coffee Tracker     [Home] [Experiments] [Library]      [User ▼]  │
└─────────────────────────────────────────────────────────────────────┘
```

**Active state:** Current page highlighted with teal underline/background.

**User menu dropdown:**
- Preferences (navigates to `/preferences`)
- Logout

### New Experiment Button

Large, prominent call-to-action centered on the page.

**Specifications:**
- Visually prominent (filled teal background, large size)
- Always visible, positioned at top center of main content
- Click action: Navigates to `/experiments/new`

### Recently Brewed Coffees Carousel

Horizontal carousel displaying recently brewed coffees without page scrolling.

**Navigation controls:**
- Swipe gestures (mobile/touch)
- Left/right arrow buttons
- Dot indicators (maximum 5 dots)

**Responsive card count:**
- Mobile (< 640px): 1 card visible
- Tablet (640px - 1024px): 2 cards visible
- Desktop (> 1024px): 3 cards visible

**Card layout:**
```
┌─────────────────────────────────────┐
│ Kiamaina                            │
│ Cata Coffee                         │
│                                     │
│ Best Brew (Jan 15)           8/10   │
│ 1:15 · 96°C · Abaca · Catalyst      │
│ Bloom 30s → 3 pours (circular)      │
│                                     │
│ "Try finer grind to boost..."       │
│                                     │
│                    [+ New Brew]     │
└─────────────────────────────────────┘
```

**Card content:**
- Coffee name
- Roaster
- Best brew date + overall score
- Params: ratio, temperature, filter, mineral additions
- Pour info: bloom time, pour count, pour style(s)
- Improvement notes snippet (from coffee goals)
- "New Brew" button

**Behavior:**
- Sorted by last brewed (most recent first)
- Click card → Coffee detail view (`/coffees/:id`)
- Click "New Brew" → New experiment with coffee pre-selected (`/experiments/new?coffee_id=:id`)

### Empty State

When no experiments exist, display only the New Experiment button with no additional text.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Coffee Tracker                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ┌─────────────────────┐                          │
│                    │                     │                          │
│                    │  + New Experiment   │                          │
│                    │                     │                          │
│                    └─────────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Get Home Data

```
GET /api/v1/dashboard
```

Returns recently brewed coffees with best experiment data for the home page display.

**Query parameters:**
- `limit`: Number of coffees to return (default: 10, max: 20)

**Response:**
```json
{
  "recent_coffees": [
    {
      "id": "uuid",
      "name": "Kiamaina",
      "roaster": "Cata Coffee",
      "last_brewed_at": "2026-01-15T10:30:00Z",
      "best_experiment": {
        "id": "uuid",
        "brew_date": "2026-01-15T10:30:00Z",
        "overall_score": 8,
        "ratio": 15.0,
        "water_temperature": 96.0,
        "filter_paper_name": "Abaca",
        "mineral_profile_name": "Catalyst",
        "bloom_time": 30,
        "pour_count": 3,
        "pour_styles": ["circular", "circular", "center"]
      },
      "improvement_note": "Try finer grind to boost sweetness..."
    }
  ]
}
```

**Field definitions:**

| Field | Description |
|-------|-------------|
| `id` | Unique coffee identifier |
| `name` | Coffee name |
| `roaster` | Roaster/company name |
| `last_brewed_at` | ISO 8601 timestamp of most recent experiment |
| `best_experiment` | Best experiment for this coffee (or latest if none marked) |
| `best_experiment.id` | Unique experiment identifier |
| `best_experiment.brew_date` | ISO 8601 timestamp of when the experiment was recorded |
| `best_experiment.overall_score` | 1-10 rating (may be null if not scored) |
| `best_experiment.ratio` | Coffee to water ratio |
| `best_experiment.water_temperature` | Brewing temperature in °C |
| `best_experiment.filter_paper_name` | Name of filter paper used |
| `best_experiment.mineral_profile_name` | Name of mineral profile used |
| `best_experiment.bloom_time` | Bloom duration in seconds |
| `best_experiment.pour_count` | Number of pours |
| `best_experiment.pour_styles` | Array of pour styles used |
| `improvement_note` | Notes from coffee goals (truncated if needed) |

---

## Navigation

The home page serves as the landing page. Navigation structure:

**Main Navigation:**
| Item | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing page (this feature) |
| Experiments | `/experiments` | Brew list and review |
| Library | `/library` | Coffees, filter papers, mineral profiles |

**User Menu:**
| Item | Route | Description |
|------|-------|-------------|
| Preferences | `/preferences` | User preferences (brew defaults) |
| Logout | — | Log out of the application |

---

## Design Decisions

### Minimal Home Page

Landing on a minimal home page instead of a feature-rich dashboard because:
- Primary user action is logging experiments
- Reduces cognitive load on arrival
- Single clear call-to-action improves usability
- Analytics features can live in dedicated pages if needed later

### Carousel Format

Horizontal carousel instead of scrolling list because:
- No page scroll keeps New Experiment button visible
- Quick scanning of recent activity
- Natural swipe interaction on mobile
- Dot indicators show position at a glance

### Coffee-Centric Cards

Showing coffees instead of experiments because:
- Users think in terms of "which coffee to brew" not "which experiment to view"
- Best brew params provide actionable reference for next brew
- "New Brew" action enables quick experiment creation
- Improvement notes guide the next brewing attempt
- Click-through to coffee detail enables deeper exploration
