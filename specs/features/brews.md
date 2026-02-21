# Brews

## Overview

The Brews page is a global, paginated brew history across all coffees. It provides filtering, sorting, and quick access to brew details — serving as the central place to review and compare past brews.

**Route:** `/brews`

**Dependencies:** authentication, coffees, brew-tracking

---

## User Interface

### Layout

```
+-------------------------------------------------------------+
| Brews                                                        |
+-------------------------------------------------------------+
| [Coffee ▾]  [From ___] [To ___]  [Min __] [Max __]  [Clear] |
+-------------------------------------------------------------+
| Date ↓    | Coffee              | Score | Ratio | Grind | Temp|
|-----------|---------------------|-------|-------|-------|-----|
| Jan 19    | Kiamaina (Cata)     | 7/10  | 1:15  | 8.2   | 96° |
| Jan 18    | El Calagual (Cata)  | 8/10  | 1:15  | 8.0   | 95° |
| Jan 17    | Kiamaina (Cata)     | 6/10  | 1:16  | 8.2   | 96° |
| ...       |                     |       |       |       |     |
+-------------------------------------------------------------+
|              [← Prev]  Page 1 of 3  [Next →]                |
+-------------------------------------------------------------+
```

### Filters

Displayed as a horizontal row above the table (stacked vertically on mobile).

| Filter | Type | Description |
|--------|------|-------------|
| Coffee | Dropdown | Select from user's coffees (fetched from `GET /api/v1/coffees?per_page=100`), shows "name — roaster" |
| Date From | Date input | Start of date range (YYYY-MM-DD) |
| Date To | Date input | End of date range (YYYY-MM-DD) |
| Score Min | Number input | Minimum overall score (1-10) |
| Score Max | Number input | Maximum overall score (1-10) |

- **Clear button**: Appears when any filter is active, resets all filters
- Changing any filter resets pagination to page 1

### Table Columns

| Column | Field | Sortable | Responsive |
|--------|-------|----------|------------|
| Date | `brew_date` (formatted "Jan 19") | Yes | Always visible |
| Coffee | `coffee_name (coffee_roaster)` | No | Always visible (truncated with ellipsis). Inline star icon (filled amber, `h-3 w-3`) shown before coffee name when the brew is the starred reference (`brew.id === brew.coffee_reference_brew_id`). |
| Score | `overall_score/10` (color-coded) | Yes | Always visible |
| Ratio | `ratio` (formatted "1:X") | No | Always visible |
| Grind | `grind_size` | No | Hidden below `sm` breakpoint |
| Temp | `water_temperature°C` | No | Hidden below `md` breakpoint |

Null values display as "—".

**Score color coding** — per design-system.md score gradient:
- 9-10: Emerald
- 7-8: Teal
- 5-6: Zinc
- 3-4: Amber
- 1-2: Red

### Sorting

- Click column header to sort (Date, Score)
- First click = descending, second click = ascending
- Clicking a different column resets to descending
- Active sort column shows arrow indicator (up/down)
- **Default:** `-brew_date` (newest first)

### Row Behavior

- Click row → opens brew detail modal (see [brew-tracking.md](brew-tracking.md)). The modal receives `referenceBrewId` from `brew.coffee_reference_brew_id`, enabling the "Star as Reference" action to show correct state.
- Modal includes actions: Edit, Star, Brew Again, Delete
- After modal mutation (delete, star), the page refreshes

### Comparison Selection

- Checkbox column on the left of each brew row
- Checkboxes don't interfere with row click (clicking the checkbox toggles selection; clicking elsewhere on the row opens the brew detail modal)
- When 2-4 brews are checked, a "Compare" floating bar appears above the table with text "{N} brews selected" and a "Compare" button
- Clicking "Compare" navigates to `/brews/compare?brews=id1,id2,...&from=brews` (see [brew-comparison.md](brew-comparison.md))
- Brews from different coffees can be compared — no same-coffee restriction
- Max 4 selection enforced — checkbox disabled on the 5th brew with tooltip "Maximum 4 brews can be compared"
- Selection state resets on page navigation or when filters change
- On mobile card layout: checkbox appears as a small circle in the top-left corner of each card

**Compare bar space reservation:** The compare bar's space is always reserved (invisible placeholder when no brews are selected) to prevent the table from shifting vertically when the first brew is selected. When brews are selected, the bar becomes visible in the reserved space.

### Pagination

- Offset-based: `page` + `per_page` (default 20, max 100)
- Previous/Next buttons (disabled at boundaries)
- Page indicator: "Page X of Y"
- Hidden when only 1 page of results

### Mobile Layout

Below `sm` breakpoint, the table switches to a **card list**:

```
+------------------------------------------+
| ★ Kiamaina (Cata)                  7/10  |
| Jan 19 · 1:15 · 8.2                     |
+------------------------------------------+
| El Calagual (Cata)                 8/10  |
| Jan 18 · 1:15 · 8.0                     |
+------------------------------------------+
```

- Star icon (filled amber) shown before coffee name on first line when brew is the starred reference
- Coffee name + roaster on first line (truncated), score right-aligned
- Date + ratio + grind on second line (smaller text)
- Larger touch targets (`h-11` buttons)
- Filters stack vertically (full width)

### Empty States

**No brews at all:**
- Message indicating no brews have been logged yet

**No matches for current filters:**
- Message indicating no brews match the active filters
- Clear filters action available

### Error State

- Error message with a **Retry** button on load failure

---

## API

### List Brews

`GET /api/v1/brews`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `per_page` | int | 20 | Items per page (max 100) |
| `sort` | string | `-brew_date` | Sort field, prefix `-` for descending |
| `coffee_id` | uuid | — | Filter by coffee |
| `date_from` | date | — | Filter brews on or after this date |
| `date_to` | date | — | Filter brews on or before this date |
| `score_gte` | int | — | Minimum overall score |
| `score_lte` | int | — | Maximum overall score |

**Sortable fields:** `brew_date`, `overall_score`, `created_at`

**Response:** Paginated list per [api-conventions.md](../foundations/api-conventions.md)

```json
{
  "items": [
    {
      "id": "uuid",
      "coffee_id": "uuid",
      "coffee_name": "Kiamaina",
      "coffee_roaster": "Cata",
      "coffee_reference_brew_id": "uuid-or-null",
      "brew_date": "2025-01-19",
      "overall_score": 7,
      "ratio": 15.0,
      "grind_size": 8.2,
      "water_temperature": 96,
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

See [brew-tracking.md](brew-tracking.md) for the full brew response format (includes pours, sensory data, filter paper, computed fields).

---

## Design Decisions

### Global View

The brews page exists separately from per-coffee brew lists because:
- Users want to compare brews across different coffees
- Filtering by date or score spans all coffees
- The home page "View all brews" link needs a destination

### Offset Pagination

Offset-based (not cursor-based) because:
- Total count is useful for "Page X of Y" display
- Dataset size per user is manageable
- Simpler to implement filters + sorting with offset

### Modal-Based Actions

Row click opens the detail modal rather than navigating to a detail page:
- Keeps the user in context of the brew list
- Quick back-and-forth between list and detail
- Actions (edit, star, delete, brew again) are accessible from the modal
