# Layout & UX Improvement Plan

## Summary

After reviewing all pages at mobile (375px) and desktop (1280px) viewports, the following layout issues were identified and organized into phases.

---

## Phase 1: Mobile Navigation & Accessibility

**Files:** `Header.tsx`, `sheet.tsx`

### Issues
1. **Mobile sheet menu missing `SheetTitle` and `SheetDescription`** — Radix Dialog requires these for accessibility (console errors: `DialogContent requires a DialogTitle`, `Missing Description or aria-describedby`). Screen readers can't announce what the drawer is.
2. **Mobile header: user menu button shows no label** — On mobile the user email is hidden (`hidden sm:inline`) but the button still renders with just icons, offering no context about what it opens.

### Fixes
- Add `SheetHeader` with `SheetTitle` ("Navigation") and a visually-hidden `SheetDescription` to the mobile nav drawer.
- Add `aria-label="User menu"` to the user menu trigger button so it has a label on mobile.

---

## Phase 2: Coffee Detail Page — Mobile Responsiveness

**Files:** `CoffeeDetail.tsx`

### Issues
1. **Action buttons overflow on mobile** — The header has "New Experiment", "Edit", and "Archive" buttons in a horizontal flex row with no wrapping. On 375px screens, the buttons get crushed or overflow.
2. **Brew history table too wide for mobile** — 8 columns (star, date, DOR, score, grind, ratio, temp, actions) don't fit on a 375px screen. The "Mark as Reference" button text makes the Actions column especially wide.
3. **Stats grid `grid-cols-3` cramped on small screens** — The 3-column stats (Roasted, Days Off Roast, Experiments) work on desktop but labels truncate on narrow screens.

### Fixes
- **Action buttons**: Wrap in `flex flex-wrap gap-2` and use icon-only buttons on mobile (`sm:inline` for labels).
- **Brew history table**: Hide Grind, Ratio, Temp columns on mobile (`hidden sm:table-cell`). Shorten "Mark as Reference" to icon-only on mobile.
- **Stats grid**: Use `grid-cols-1 sm:grid-cols-3` so stats stack on mobile.

---

## Phase 3: Experiments Page — Mobile Polish

**Files:** `ExperimentsPage.tsx`

### Issues
1. **Toolbar layout on mobile** — The search bar, filters button, compare mode, and export button all compete for horizontal space. On 375px the toolbar wraps awkwardly.
2. **Quick filters row wraps with orphaned text** — "Looking for patterns? Try the Analysis page" sits inline with quick filter buttons and wraps oddly on mobile.

### Fixes
- **Toolbar**: Stack Compare Mode and Export buttons below the search row on mobile (they're already `flex-col` on base, `sm:flex-row`, but the second row of controls needs similar treatment).
- **Quick filters**: Put the "Looking for patterns?" text on its own line on mobile via `flex-col sm:flex-row`.

---

## Phase 4: Experiment Detail Page — Mobile Layout

**Files:** `ExperimentDetailPage.tsx`

### Issues
1. **Header action buttons overflow on mobile** — "Use as Template", "Continue Editing"/"Edit", "Delete" buttons in a row overflow. The `hidden sm:inline` pattern is already partially applied for text labels, but the button group still gets cramped.
2. **Intensity bars too narrow on mobile** — The `w-24` fixed width for intensity bars works on desktop but takes up too much relative space on mobile. The label + bar + value row can feel tight.

### Fixes
- **Action buttons**: Already using `hidden sm:inline` for labels. Reduce gap and use smaller button sizing on mobile.
- **Intensity bars**: Use `w-16 sm:w-24` for responsive bar width.

---

## Phase 5: Login Page — Branding & Polish

**Files:** `LoginPage.tsx`, `LoginForm.tsx`

### Issues
1. **No app branding on login page** — The login page shows just a bare card with no logo, app name, or context. Users see "Login" with no visual connection to "Coffee Tracker".

### Fixes
- Add app name "Coffee Tracker" above the login card as a heading.

---

## Phase 6: Coffee Card — Mobile Button Wrapping

**Files:** `CoffeeCard.tsx`

### Issues
1. **Action buttons wrapping** — On mobile, the three buttons (New Experiment, Edit, Archive) can wrap to multiple lines but the wrapping isn't graceful. The buttons could be more compact on mobile.

### Fixes
- Use icon-only buttons on mobile with `hidden sm:inline` for labels, matching the pattern used on ExperimentDetailPage.

---

## Phase 7: Global Layout Consistency

**Files:** `Layout.tsx`, various pages

### Issues
1. **No max-width constraint on very wide screens** — The `container mx-auto` class handles max-width via Tailwind's container defaults, but on ultra-wide monitors the content stretches. Already handled by Tailwind container defaults, so this is fine.
2. **Background color on main content area** — The `<main>` element has no background class. On dark mode, the transition works because of the `<html>` element, but adding `bg-background` to main ensures visual consistency.

### Fixes
- Add `bg-background` to `<main>` in `Layout.tsx` for explicit background.

---

## Implementation Order

| Phase | Priority | Files Changed | Estimated Impact |
|-------|----------|---------------|------------------|
| 1     | High     | 1             | Fixes a11y errors, improves screen reader experience |
| 2     | High     | 1             | Fixes most critical mobile overflow issues |
| 3     | Medium   | 1             | Improves experiments toolbar on mobile |
| 4     | Medium   | 1             | Polishes experiment detail on mobile |
| 5     | Low      | 2             | Visual polish for login page |
| 6     | Medium   | 1             | Consistent mobile card buttons |
| 7     | Low      | 1             | Minor layout consistency |
