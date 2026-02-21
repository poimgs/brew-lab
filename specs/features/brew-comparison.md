# Brew Comparison

## Overview

The Brew Comparison feature provides a dedicated page for comparing up to 4 brews side-by-side in a diff table. Brews can be from the same coffee or different coffees. It helps users identify what changed between brews and which parameters produced the best outcomes.

**Route:** `/brews/compare?brews=id1,id2,id3,id4`

**Constraints:**
- Minimum 2 brews, maximum 4 brews
- No new API endpoints needed — fetches individual brews via existing `GET /api/v1/brews/:id`

**Dependencies:** authentication, coffees, brew-tracking

---

## Entry Points

### Coffee Detail Brew History Table

- Checkbox column on the left of each brew row in the brew history table (see [coffees.md](coffees.md))
- When 2-4 brews are checked, a "Compare" button appears (floating bar above the table)
- Clicking "Compare" navigates to `/brews/compare?brews=id1,id2,...&from=coffee&coffee_id=:id`
- Checkboxes are unobtrusive — they don't interfere with row click opening the brew detail modal
- Max 4 selection enforced: checkbox disabled on the 5th brew with tooltip "Maximum 4 brews can be compared"

### Global Brews Page

- Checkbox column on the left of each brew row (see [brews.md](brews.md))
- "Compare" button appears when 2-4 brews are selected
- Clicking "Compare" navigates to `/brews/compare?brews=id1,id2,...&from=brews`

---

## User Interface

### Page Layout (Desktop)

**Same-coffee comparison:**
```
+-------------------------------------------------------------+
| <- Back to {origin}                                          |
|                                                              |
| Kiamaina - Cata Coffee              Comparing 3 brews       |
|                                                              |
| +----------+-----------+-----------+-----------+             |
| |          | Jan 19    | Jan 15    | Jan 12    |             |
| +----------+-----------+-----------+-----------+             |
| | SETUP                                        |             |
| ...                                                          |
+-------------------------------------------------------------+
```

**Cross-coffee comparison:**
```
+-------------------------------------------------------------+
| <- Back to {origin}                                          |
|                                                              |
| Brew Comparison                      Comparing 3 brews      |
|                                                              |
| +----------+-----------+-----------+-----------+             |
| |          | Kiamaina  | El Calag. | Kiamaina  |             |
| |          | Jan 19    | Jan 15    | Jan 12    |             |
| +----------+-----------+-----------+-----------+             |
| | SETUP                                        |             |
| ...                                                          |
+-------------------------------------------------------------+
```

### Page Title

- **Same-coffee** (all brews share the same `coffee_id`): Show coffee name + roaster (e.g., "Kiamaina - Cata Coffee")
- **Cross-coffee** (brews from different coffees): Show "Brew Comparison"

### Column Headers

- First column: field names (fixed width)
- Subsequent columns (2-4): one per brew
- **Same-coffee:** Column header shows brew date (formatted "Jan 19") with days off roast in smaller text below
- **Cross-coffee:** Column header shows coffee name on a first line, then brew date below it, with days off roast in smaller text below that

### Column Reordering

Brew columns can be reordered via drag-and-drop to facilitate side-by-side comparison of specific brews:

- **Desktop:** HTML5 drag & drop on column headers. Grab handle icon appears on hover. Dragging a column header repositions that brew column.
- **Mobile:** Touch drag on column headers. Long-press activates drag mode, then slide to reposition.
- **Visual feedback:** During drag, the dragged column gets a subtle lift/shadow effect. Drop targets are indicated by a vertical insertion line between columns.
- **Scope:** Reordering is visual only — it affects the `brews` array order in component state. No persistence to backend or URL.
- **First column (field names) is not draggable** — only brew columns participate in reordering.

### Table Sections

**Setup:**
| Row | Field | Format |
|-----|-------|--------|
| Days Off Roast | `days_off_roast` | Integer |
| Coffee Weight | `coffee_weight` | Xg |
| Ratio | `ratio` | 1:X |
| Water Weight | computed `coffee_weight * ratio` | Xg |
| Grind Size | `grind_size` | Decimal |
| Temperature | `water_temperature` | XC |
| Filter Paper | `filter_paper.name` (`filter_paper.brand`) | Text |

**Brewing:**
| Row | Field | Format |
|-----|-------|--------|
| Pours | count of `pours` array | Integer |
| Total Time | `total_brew_time` | mm:ss |
| Technique | `technique_notes` | Expandable text (truncated to 1 line, click to expand) |

**Outcomes:**
| Row | Field | Format |
|-----|-------|--------|
| Coffee | `coffee_ml` | Xml |
| TDS | `tds` | X.XX% |
| Extraction Yield | computed | X.X% |
| Overall Score | `overall_score` | X/10 |
| Aroma | `aroma_intensity` | 1-10 |
| Body | `body_intensity` | 1-10 |
| Sweetness | `sweetness_intensity` | 1-10 |
| Brightness | `brightness_intensity` | 1-10 |
| Complexity | `complexity_intensity` | 1-10 |
| Aftertaste | `aftertaste_intensity` | 1-10 |

**Notes:**
| Row | Field | Format |
|-----|-------|--------|
| Overall Notes | `overall_notes` | Expandable text |
| Improvement Notes | `improvement_notes` | Expandable text |

### Diff Highlighting

- **Changed cells:** When values differ across brews in a row, all cells in that row get a subtle background tint (`muted` bg color)
- **Best outcome values:** The highest value for score, TDS, and extraction yield is bolded with `primary` accent color
- **No judgment on input params:** Setup and Brewing fields only get diff highlighting (background tint), not best/worst indicators — there is no universal "best" grind size or temperature
- **Null handling:** Null/missing values display as "—" and are excluded from best-value comparison

### Page Layout (Mobile)

Same table structure with horizontal scroll:
- First column (field names) is sticky/fixed on the left
- Brew columns scroll horizontally
- Touch-friendly scroll with momentum
- No special mobile card layout — the table format is maintained

### Data Fetching

- Parse `brews` query parameter to get brew IDs
- Fetch each brew individually via `GET /api/v1/brews/:id` (parallel requests)
- Coffee name and roaster come from the brew response (`coffee_name`, `coffee_roaster`)
- Determine if all brews share the same `coffee_id` to decide page title and column header format

### Navigation

- **Back link:** Returns to the originating page
  - If `from=coffee&coffee_id=X`: back to `/coffees/:coffee_id`
  - If `from=brews` or default: back to `/brews`
- Back link text: "Back to {Coffee Name}" or "Back to Brews" based on origin

---

## Empty & Error States

**Fewer than 2 brew IDs in query:**
- Redirect back to `/brews` with info toast: "Select at least 2 brews to compare"

**Invalid brew IDs (not found):**
- If any brew ID returns 404, show error toast: "One or more brews could not be found"
- Redirect back to the originating page

**Loading state:**
- Show skeleton table matching the expected layout while fetching brews

---

## Legacy Route

The old route `/coffees/:id/compare?brews=...` must redirect to the new route:
- Redirect to `/brews/compare?brews=...&from=coffee&coffee_id=:id`
- Preserve any additional query parameters (e.g., `from`)
- This ensures bookmarks and shared links continue to work

---

## Design Decisions

### Cross-Coffee Comparison

Earlier versions restricted comparison to brews of the same coffee. This restriction has been removed because:
- Users often dial in multiple coffees at similar parameters and want to compare outcomes
- The diff highlighting still works — rows where values differ are highlighted regardless of coffee
- Column headers show the coffee name when brews span multiple coffees, keeping it clear which brew belongs to which coffee
- The table format handles cross-coffee comparison naturally — no fundamentally different UI is needed

### Column Reordering

Drag-to-reorder was added because:
- When comparing 3-4 brews, users often want to place two specific brews side-by-side
- The URL-determined column order may not reflect the user's preferred comparison order
- HTML5 drag & drop provides a familiar interaction pattern
- Visual-only reordering (no persistence) keeps the implementation simple — the `brews` array in component state is reordered, and the table re-renders

### No New API Endpoints

The comparison page fetches individual brews via existing endpoints:
- Avoids adding a batch endpoint for a niche feature
- Individual brew responses already contain all needed fields
- Parallel fetching of 2-4 brews is fast enough
- Simplifies backend — no new handler or repository method

### Table Over Cards

A table (rows = fields, columns = brews) was chosen over side-by-side cards because:
- Easier to scan across brews for a specific field
- Diff highlighting works naturally on table rows
- Scales cleanly from 2 to 4 brews
- Familiar comparison UI pattern (like product comparison sites)

### Max 4 Brews

Limited to 4 brews because:
- More columns become unwieldy, especially on mobile
- 4 is enough for meaningful A/B/C/D comparison
- Table readability degrades beyond 4 columns

### No Radar Chart on Comparison Page

Sensory scores are shown as individual table rows in the Outcomes section rather than as radar charts because:
- Table rows enable direct numeric comparison with diff highlighting
- Radar charts would take significant vertical space for each brew
- The comparison page prioritizes precise numeric comparison over visual profiles
- Radar charts are available in individual brew detail modals for visual reference
