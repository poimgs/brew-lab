# Home

## Overview

The Home page is the brew-first landing page. It surfaces recent brewing activity and provides a quick-start path to log a new brew — optimizing for the primary daily action.

**Route:** `/`

**Dependencies:** authentication, brew-tracking

---

## User Interface

### Layout

```
+-------------------------------------------------------------+
| Home                                       [Log a Brew]      |
+-------------------------------------------------------------+
|                                                              |
| Recent Brews                          View all brews →       |
| +----------------------------------------------------------+|
| | Jan 19 - Kiamaina (Cata) - Score: 7 - 1:15  [Edit][Again]||
| | Jan 18 - El Calagual (Cata) - Score: 8 - 1:15 [Edit][Again]||
| | Jan 17 - Kiamaina (Cata) - Score: 6 - 1:16  [Edit][Again]||
| | Jan 15 - Venus (Curista) - Score: 8 - 1:15  [Edit][Again]||
| | Jan 14 - Kiamaina (Cata) - Score: 7 - 1:15  [Edit][Again]||
| +----------------------------------------------------------+|
|                                                              |
+-------------------------------------------------------------+
```

### Recent Brews Widget

Shows the last 5 brews across all coffees, fetched from `GET /api/v1/brews/recent?limit=5`.

**Row content:**
- Date (formatted short, e.g., "Jan 19")
- Star icon (filled amber, `h-3 w-3`) shown inline before coffee name when the brew is the starred reference for its coffee (`brew.id === brew.coffee_reference_brew_id`)
- Coffee name (roaster)
- Overall score — color-coded per design-system.md score gradient (emerald 9-10, teal 7-8, zinc 5-6, amber 3-4, red 1-2)
- One key recipe param: ratio (displayed as "1:X")

**Row actions:**
- **[Edit]** — navigates to `/brews/:id/edit`
- **[Brew Again]** — navigates to `/brews/new?from=:id`
- Action buttons stop click propagation (row click still opens detail modal)

**Row behavior:**
- Click row → opens brew detail modal (see [brew-tracking.md](brew-tracking.md)). The modal receives `referenceBrewId` from `brew.coffee_reference_brew_id`, enabling the "Star as Reference" action to show correct state.

**Navigation:**
- "View all brews" link above the widget navigates to `/brews` (global brew history page)

### "Log a Brew" Button

- Prominent primary button in the page header
- Navigates to `/brews/new` (brew form with coffee selector as first field)

### Empty State

Shown when the user has no brews (e.g., new user):

```
+-------------------------------------------------------+
| Home                                                   |
+-------------------------------------------------------+
|                                                        |
|              Add your first coffee                     |
|              to get started                            |
|                                                        |
|              [Go to Coffees]                           |
|                                                        |
+-------------------------------------------------------+
```

- Message: "Add your first coffee to get started"
- Link button navigates to `/coffees`

---

## Data Source

- **Endpoint:** `GET /api/v1/brews/recent?limit=5`
- **Response:** See [brew-tracking.md](brew-tracking.md) for response format
- **Sorting:** `brew_date DESC` (most recent first, not configurable)

---

## Design Decisions

### Brew-First Landing

Home is the landing page (not coffees) because:
- Logging a brew is the primary daily action
- Recent brews provide immediate context for the next brew
- One-tap access to "Log a Brew" reduces friction

### Minimal Home Page

The home page is intentionally simple:
- Recent brews + one action button
- No dashboard, charts, or analytics (future feature)
- Keeps the primary flow fast and focused
