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
│  RECENT EXPERIMENTS                              ←  [●○○○○]  →      │
│  ┌─────────────────┐  ┌─────────────────┐                           │
│  │ Kiamaina        │  │ El Calagual     │                           │
│  │ 7/10            │  │ 8/10            │                           │
│  │ "Bright, nice   │  │ "Best brew yet" │                           │
│  │ acidity"        │  │                 │                           │
│  │ Today, 10:30 AM │  │ Today, 8:15 AM  │                           │
│  └─────────────────┘  └─────────────────┘                           │
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

### Recent Experiments Carousel

Horizontal carousel displaying recent experiments without page scrolling.

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
┌─────────────────────┐
│ Kiamaina            │
│ 7/10                │
│ "Bright, nice       │
│ acidity"            │
│ Today, 10:30 AM     │
└─────────────────────┘
```

**Card content:**
- Coffee name
- Overall score (X/10 format)
- Notes excerpt (truncated with ellipsis if needed)
- Relative date + time (e.g., "Today, 10:30 AM", "Yesterday, 3:15 PM")

**Interaction:** Display only. No click action on cards.

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

Returns recent experiments for the home page display.

**Query parameters:**
- `limit`: Number of experiments to return (default: 10, max: 20)

**Response:**
```json
{
  "data": {
    "recent_experiments": [
      {
        "id": "uuid",
        "brew_date": "2026-01-19T10:30:00Z",
        "coffee_name": "Kiamaina",
        "overall_score": 7,
        "notes": "Bright, nice acidity...",
        "relative_date": "today"
      }
    ]
  }
}
```

**Field definitions:**

| Field | Description |
|-------|-------------|
| `id` | Unique experiment identifier |
| `brew_date` | ISO 8601 timestamp of when the experiment was recorded |
| `coffee_name` | Name of the coffee used |
| `overall_score` | 1-10 rating (may be null if not scored) |
| `notes` | Excerpt from overall_notes (truncated if needed) |
| `relative_date` | One of: `today`, `yesterday`, `this_week`, `earlier` |

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

### No Click Interaction on Cards

Experiment cards are display-only because:
- Experiments page provides full list and detail access
- Keeps home page focused on logging, not browsing
- Reduces decision points on the landing page
- Clear separation of concerns between pages
