# Brew Comparison

## Overview

The Brew Comparison feature provides a dedicated page for comparing up to 4 brews of the **same coffee** side-by-side in a diff table. It helps users identify what changed between brews and which parameters produced the best outcomes.

**Route:** `/coffees/:id/compare?brews=id1,id2,id3,id4`

**Constraints:**
- All compared brews must belong to the same coffee
- Minimum 2 brews, maximum 4 brews
- No new API endpoints needed — fetches individual brews via existing `GET /api/v1/brews/:id`

**Dependencies:** authentication, coffees, brew-tracking

---

## Entry Points

### Coffee Detail Brew History Table

- Checkbox column on the left of each brew row in the brew history table (see [coffees.md](coffees.md))
- When 2-4 brews are checked, a "Compare" button appears (floating bar above the table)
- Clicking "Compare" navigates to `/coffees/:id/compare?brews=id1,id2,...`
- Checkboxes are unobtrusive — they don't interfere with row click opening the brew detail modal
- Max 4 selection enforced: checkbox disabled on the 5th brew with tooltip "Maximum 4 brews can be compared"

### Global Brews Page

- Checkbox column on the left of each brew row (see [brews.md](brews.md))
- "Compare" button appears when 2-4 brews are selected
- **Same-coffee validation:** If selected brews span multiple coffees, the Compare button shows a disabled state with message "Select brews from the same coffee to compare"
- When all selected brews share the same `coffee_id`, clicking "Compare" navigates to `/coffees/:id/compare?brews=id1,id2,...` using the common coffee ID

---

## User Interface

### Page Layout (Desktop)

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
| +----------+-----------+-----------+-----------+             |
| | Days Off | 61        | 57        | 54        |             |
| | Coffee   | 15g       | 15g       | 15g       |             |
| | Ratio    | 1:15      | 1:15      | 1:16      |  <- diff   |
| | Water    | 225g      | 225g      | 240g      |  <- diff   |
| | Grind    | 3.5       | 3.5       | 4.0       |  <- diff   |
| | Temp     | 96C       | 96C       | 94C       |  <- diff   |
| | Filter   | Abaca     | Abaca     | Abaca     |             |
| +----------+-----------+-----------+-----------+             |
| | BREWING                                       |             |
| +----------+-----------+-----------+-----------+             |
| | Pours    | 3         | 2         | 3         |             |
| | Time     | 2:45      | 2:30      | 2:50      |             |
| | Technique| [expand]  | [expand]  | [expand]  |             |
| +----------+-----------+-----------+-----------+             |
| | OUTCOMES                                      |             |
| +----------+-----------+-----------+-----------+             |
| | Coffee   | 200ml     | 195ml     | 210ml     |             |
| | TDS      | 1.38      | 1.42*     | 1.30      |  <- best   |
| | EY       | 18.4%     | 18.5%*    | 17.1%     |  <- best   |
| | Score    | 7/10      | 8/10*     | 6/10      |  <- best   |
| | Aroma    | 7         | 8         | 6         |             |
| | Body     | 7         | 7         | 5         |             |
| | Sweetness| 8         | 8         | 6         |             |
| | Bright.  | 7         | 7         | 7         |             |
| | Complex. | 6         | 7         | 5         |             |
| | Aftertst | 7         | 7         | 6         |             |
| +----------+-----------+-----------+-----------+             |
| | NOTES                                         |             |
| +----------+-----------+-----------+-----------+             |
| | Overall  | [expand]  | [expand]  | [expand]  |             |
| | Improve  | [expand]  | [expand]  | [expand]  |             |
| +----------+-----------+-----------+-----------+             |
+-------------------------------------------------------------+
```

### Column Headers

- First column: field names (fixed width)
- Subsequent columns (2-4): one per brew, labeled with brew date (formatted "Jan 19")
- Column headers also show the brew date's days off roast in smaller text below

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
- Validate that all brews belong to the coffee identified by `:id` in the route
- Coffee name and roaster come from the brew response (`coffee_name`, `coffee_roaster`)

### Navigation

- **Back link:** Returns to the originating page
  - If navigated from coffee detail: back to `/coffees/:id`
  - If navigated from global brews page: back to `/brews`
  - Default (direct URL): back to `/coffees/:id`
- Back link text: "Back to {Coffee Name}" or "Back to Brews" based on origin

---

## Empty & Error States

**Fewer than 2 brew IDs in query:**
- Redirect back to the coffee detail page with info toast: "Select at least 2 brews to compare"

**Invalid brew IDs (not found):**
- If any brew ID returns 404, show error toast: "One or more brews could not be found"
- Redirect back to the originating page

**Brews from different coffees:**
- If any fetched brew has a different `coffee_id` than the route `:id`, show error toast: "All brews must belong to the same coffee"
- Redirect back to the originating page

**Loading state:**
- Show skeleton table matching the expected layout while fetching brews

---

## Design Decisions

### Same-Coffee Constraint

Comparison is limited to brews of the same coffee because:
- Comparing brews across different coffees conflates too many variables
- The diff highlighting is meaningful only when the coffee is constant
- Cross-coffee comparison would require a fundamentally different UI (no shared baseline)

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
