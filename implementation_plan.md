# Implementation Plan: Brew Comparison Improvements

Three changes: cross-coffee comparison with new route, compare bar layout fix, and drag-to-reorder columns.

## Status

| Step | Description | Status |
|------|-------------|--------|
| Step 1 | Route changes in App.tsx | Done |
| Step 2 | Rework BrewComparisonPage | Done |
| Step 3 | BrewsPage changes | Done |
| Step 4 | BrewHistoryTable navigation | Done |
| Step 5 | Drag-to-reorder columns | Done |
| Step 6 | Test updates | Done |
| Step 7 | Back link shows coffee name per spec | Done |

---

## Step 1 — Route Changes in App.tsx (Done)

**File:** `frontend/src/App.tsx`

1. Added new route: `/brews/compare` → `<BrewComparisonPage />`
2. Added `BrewComparisonRedirect` inline component for legacy `/coffees/:id/compare` route
   - Reads `:id` from params and `brews` from query string
   - Redirects to `/brews/compare?brews=...&from=coffee&coffee_id=:id`

---

## Step 2 — Rework BrewComparisonPage (Done)

**File:** `frontend/src/pages/BrewComparisonPage.tsx`

- Removed `useParams` — no `:id` in new route
- Back navigation uses `from` and `coffee_id` query params
- Removed same-coffee validation
- Added `isSameCoffee` computed flag for conditional title/headers
- Cross-coffee: shows "Brew Comparison" title + coffee names in column headers
- Same-coffee: shows coffee name + roaster as title (unchanged behavior)

---

## Step 3 — BrewsPage Changes (Done)

**File:** `frontend/src/pages/BrewsPage.tsx`

- Removed `allSameCoffee`, `commonCoffeeId`, and same-coffee restriction
- Compare button enabled for any 2+ selected brews regardless of coffee
- Removed "Select brews from the same coffee to compare" warning
- Compare bar always reserves space (invisible placeholder when empty) to prevent layout shift

---

## Step 4 — BrewHistoryTable Navigation Update (Done)

**File:** `frontend/src/components/coffees/BrewHistoryTable.tsx`

- Updated `handleCompare` to navigate to `/brews/compare?brews=...&from=coffee&coffee_id=...`

---

## Step 5 — Drag-to-Reorder Implementation (Done)

**File:** `frontend/src/pages/BrewComparisonPage.tsx`

Implemented:
- Drag state: `dragIndex`, `dragOverIndex`, `touchStartRef`, `headerRefs`
- `reorderBrews()` helper that splices the `brews` array in state
- **Desktop:** HTML5 drag & drop on `<th>` elements (`draggable`, `onDragStart`, `onDragOver`, `onDragLeave`, `onDrop`, `onDragEnd`)
- **Mobile:** Touch handlers (`onTouchStart` with 200ms long-press timer, `onTouchMove` hit-testing via `getBoundingClientRect`, `onTouchEnd` reorder)
- **Visual feedback:** `opacity-50` on dragged column, `border-l-2 border-primary` on drop target, `cursor-grab` on headers
- **Drag affordance:** `GripVertical` icon from lucide-react, visible on mobile always, on desktop on table hover via `group/table` + `group-hover/table:opacity-100`
- Each `<th>` has `data-testid="brew-column-{index}"` for test targeting

---

## Step 6 — Test Updates (Done)

All test files updated:

- **BrewComparisonPage.test.tsx**: Updated routes, removed same-coffee validation test, added cross-coffee comparison tests (title, column headers, back navigation), added drag-to-reorder tests (6 tests: reorder via drag & drop, no-op same-column drop, draggable attribute, opacity during drag, drop indicator, diff highlighting preserved after reorder)
- **BrewsPage.test.tsx**: Removed same-coffee restriction tests, updated navigation assertions, updated compare bar tests for always-reserved space
- **BrewHistoryTable.test.tsx**: Updated navigation assertion to new route format

---

## Step 7 — Back Link Shows Coffee Name Per Spec (Done)

**File:** `frontend/src/pages/BrewComparisonPage.tsx`

The spec requires the back link to show "Back to {Coffee Name}" (e.g., "Back to Kiamaina") when navigating from a coffee detail page, not just "Back to Coffee". Fixed by computing the `backLabel` dynamically after brews are loaded, using `brews[0].coffee_name` when `from=coffee`.

**Test:** Updated `BrewComparisonPage.test.tsx` — the back navigation test now asserts "Back to Kiamaina" instead of "Back to Coffee".

---

## Implementation Order

1. ~~**Step 1** (App.tsx routes) + **Step 2** (BrewComparisonPage rework)~~ Done
2. ~~**Step 3** (BrewsPage)~~ Done
3. ~~**Step 4** (BrewHistoryTable)~~ Done
4. ~~**Step 5** (drag-to-reorder)~~ Done
5. ~~**Step 6** (tests)~~ Done
6. ~~**Step 7** (back link coffee name)~~ Done
