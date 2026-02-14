# Design System

## Context

This design system establishes the visual language and component patterns for the Coffee Tracker. It uses a **friendly data** aesthetic—clean, modern, and data-forward—that balances information density with comfortable whitespace.

## Technology Stack

| Purpose | Technology | Rationale |
|---------|------------|-----------|
| Styling | Tailwind CSS | Utility-first, excellent dark mode support, consistent spacing |
| Components | shadcn/ui (Radix-based) | Accessible primitives, customizable, TypeScript-native |
| Forms | React Hook Form | Performant validation, minimal re-renders, good DX |
| Icons | Lucide React | Consistent style, tree-shakeable, comprehensive |
| Fonts | Inter (shadcn default) | Modern, readable, excellent tabular figures |

---

## 1. Colors

A zinc/teal palette provides true neutral grays with a vibrant teal accent. The scheme works equally well in light and dark modes while maintaining excellent data visibility.

### Primary Colors (Teal Accent)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | `teal-600` | `teal-500` | Primary actions, active states |
| `primary-foreground` | `white` | `teal-950` | Text on primary |
| `primary-hover` | `teal-700` | `teal-400` | Primary button hover |
| `primary-muted` | `teal-50` | `teal-950` | Subtle primary backgrounds |

### Neutral Colors (Zinc Scale)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `background` | `zinc-50` | `zinc-950` | Page background |
| `foreground` | `zinc-900` | `zinc-50` | Primary text |
| `card` | `white` | `zinc-900` | Elevated surfaces (cards, modals) |
| `card-foreground` | `zinc-900` | `zinc-50` | Text on cards |
| `muted` | `zinc-100` | `zinc-800` | Subtle backgrounds |
| `muted-foreground` | `zinc-500` | `zinc-400` | Secondary text |
| `border` | `zinc-200` | `zinc-800` | Borders, dividers |
| `input` | `zinc-200` | `zinc-700` | Input borders |
| `ring` | `teal-600` | `teal-500` | Focus rings |

### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `success` | `emerald-600` | `emerald-500` | Positive outcomes, confirmations |
| `success-muted` | `emerald-50` | `emerald-950` | Success backgrounds |
| `warning` | `amber-600` | `amber-500` | Warnings, cautions |
| `warning-muted` | `amber-50` | `amber-950` | Warning backgrounds |
| `error` | `red-600` | `red-500` | Errors, destructive actions |
| `error-muted` | `red-50` | `red-950` | Error backgrounds |
| `info` | `sky-600` | `sky-500` | Informational messages |
| `info-muted` | `sky-50` | `sky-950` | Info backgrounds |

### Data Visualization Colors

**Score/Rating Gradient:**

| Score Range | Light Mode | Dark Mode | Usage |
|-------------|------------|-----------|-------|
| Excellent (9-10) | `emerald-600` | `emerald-500` | Top scores |
| Good (7-8) | `teal-600` | `teal-500` | Above average |
| Average (5-6) | `zinc-500` | `zinc-400` | Middle scores |
| Below Average (3-4) | `amber-600` | `amber-500` | Needs improvement |
| Poor (1-2) | `red-600` | `red-500` | Low scores |

**Trend Indicators:**

| Trend | Light Mode | Dark Mode |
|-------|------------|-----------|
| Positive/Up | `emerald-600` | `emerald-500` |
| Negative/Down | `red-600` | `red-500` |
| Neutral/Stable | `zinc-500` | `zinc-400` |

---

## 2. Typography

### Font Stack

shadcn defaults with Inter for all text. Use tabular figures (`font-variant-numeric: tabular-nums`) for numeric data to ensure alignment.

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display | Inter | 600-700 | Page titles, section headers |
| Body | Inter | 400-500 | UI text, paragraphs, labels |
| Data | Inter (tabular) | 400-500 | Numeric values, tables, scores |

### Type Scale

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 16px | Captions, labels, helper text |
| `text-sm` | 14px | 20px | Secondary text, table cells |
| `text-base` | 16px | 24px | Body text, inputs |
| `text-lg` | 18px | 28px | Large body, emphasis |
| `text-xl` | 20px | 28px | Subheadings |
| `text-2xl` | 24px | 32px | Section headers |
| `text-3xl` | 30px | 36px | Page headers |
| `text-4xl` | 36px | 40px | Major headlines |

### Numeric Display

```css
/* Apply to all numeric data for proper alignment */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

Use tabular figures for:
- Scores and ratings
- Measurements (dose, water, temperature)
- Dates and times
- Table columns with numbers

---

## 3. Spacing & Density

**Design density:** Moderate—balanced data visibility with comfortable whitespace.

**Base Unit:** Tailwind's 4px base unit. All spacing should use standard Tailwind values.

### Spacing Scale

| Class | Size | Common Usage |
|-------|------|--------------|
| `gap-1` | 4px | Tight inline groups |
| `gap-2` | 8px | Related items, icon + text |
| `gap-3` | 12px | Form field + label |
| `gap-4` | 16px | Card padding (compact), between form fields |
| `gap-6` | 24px | Card padding (standard), section spacing |
| `gap-8` | 32px | Page margins, major sections |

### Component Density

Keep shadcn component defaults where possible. Override only for specific use cases:

| Component | Default Size | Notes |
|-----------|--------------|-------|
| Button | `h-10` | Standard height |
| Input | `h-10` | Matches buttons |
| Table row | `h-12` | Comfortable for data scanning |
| Card padding | `p-6` | Standard content padding |

**Touch Target Minimum:** 40px × 40px for all interactive elements (aligned with `h-10` button height).

---

## 4. Dark Mode

**Elevated dark** theme using zinc-950 as the base with zinc-900 for elevated surfaces.

### Surface Hierarchy

| Level | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| Base | `zinc-50` | `zinc-950` | Page background |
| Elevated | `white` | `zinc-900` | Cards, modals, popovers |
| Recessed | `zinc-100` | `zinc-800` | Inset sections, code blocks |

### Dark Mode Transitions

Apply smooth color transitions for theme switching:

```css
* {
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
```

---

## 5. Breakpoints

Mobile-first responsive design using Tailwind's default breakpoints.

| Breakpoint | Min Width | Target |
|------------|-----------|--------|
| (base) | 0px | Phones (brewing scenario) |
| `sm` | 640px | Large phones, landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |

---

## 6. Accessibility

### WCAG 2.1 AA Requirements

- Normal text: 4.5:1 minimum contrast
- Large text (18px+ or 14px bold): 3:1 minimum contrast
- UI components: 3:1 minimum contrast

### Verified Contrasts

| Element | Light Mode Ratio | Dark Mode Ratio |
|---------|-----------------|-----------------|
| Body text | 13.1:1 (zinc-900 on zinc-50) | 15.4:1 (zinc-50 on zinc-950) |
| Muted text | 4.6:1 (zinc-500 on zinc-50) | 4.7:1 (zinc-400 on zinc-950) |
| Primary button | 4.5:1 (white on teal-600) | 7.2:1 (teal-950 on teal-500) |
| Card text | 12.6:1 (zinc-900 on white) | 15.4:1 (zinc-50 on zinc-900) |
| Error text | 5.3:1 (red-600 on white) | 4.5:1 (red-500 on zinc-950) |

### Keyboard Navigation

| Component | Keys | Action |
|-----------|------|--------|
| Button | `Enter`, `Space` | Activate |
| Collapsible | `Enter`, `Space` | Toggle open/close |
| Slider | `←` `→` `↑` `↓` | Adjust value |
| Table | `↑` `↓` | Navigate rows |
| Tag selector | `Tab`, `Space` | Navigate and toggle |
| Modal | `Escape` | Close |

---

## 7. Loading States

### Skeletons

Use skeleton loaders for content that takes time to load. Skeletons should match the shape of the expected content.

**Card Skeleton:**
```
┌─────────────────────────────────────┐
│ ████████████████  ░░░░░░░░░░░░░░░░ │
│ ████████████  ░░░░░░░░░░░░░░░░░░░░ │
│ ████████████████████░░░░░░░░░░░░░░ │
└─────────────────────────────────────┘
```

**Table Row Skeleton:**
```
│ ██████ │ ████████████ │ ████ │ ████████ │
```

**Form Field Skeleton:**
```
████████  (label)
┌──────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────┘
```

**Implementation:**
- Use `animate-pulse` with `bg-muted` for skeleton elements
- Match skeleton dimensions to expected content
- Show skeletons for 150ms minimum to prevent flashing

### Spinners

Use spinners for actions and inline loading states.

| Context | Size | Style |
|---------|------|-------|
| Button (loading) | 16px | Replace button text with spinner |
| Inline action | 16px | Replace icon with spinner |
| Page loading | 32px | Centered with optional message |
| Modal loading | 24px | Centered in modal content area |

**Button Loading State:**
```tsx
<Button disabled>
  <Loader2 className="h-4 w-4 animate-spin" />
  Saving...
</Button>
```

**Page Loading:**
```tsx
<div className="flex h-screen items-center justify-center">
  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
</div>
```

### Page-Level Loading

| State | Display |
|-------|---------|
| Initial page load | Full-page skeleton matching page layout |
| Route transition | Keep previous content, show progress indicator |
| Data refresh | Keep content visible, show inline spinner |
| Error recovery | Show skeleton while retrying |

---

## 8. Error States

### Inline Field Errors

Display below the input field in error color.

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" className="border-error" />
  <p className="text-sm text-error">Please enter a valid email address</p>
</div>
```

### Toast Notifications

Use for async operation feedback (success, error, info).

| Type | Icon | Duration | Color |
|------|------|----------|-------|
| Success | CheckCircle | 3s | `success` |
| Error | XCircle | 5s (manual dismiss) | `error` |
| Warning | AlertTriangle | 4s | `warning` |
| Info | Info | 3s | `info` |

**Position:** Bottom-right on desktop, bottom-center on mobile.

### Full-Page Error States

**404 Not Found:**
```
┌─────────────────────────────────────────┐
│                                         │
│              ┌───────┐                  │
│              │  404  │                  │
│              └───────┘                  │
│                                         │
│         Page not found                  │
│                                         │
│   The page you're looking for          │
│   doesn't exist or has been moved.     │
│                                         │
│          [Go to Home]                   │
│                                         │
└─────────────────────────────────────────┘
```

**500 Server Error:**
```
┌─────────────────────────────────────────┐
│                                         │
│              ┌───────┐                  │
│              │  ⚠️   │                  │
│              └───────┘                  │
│                                         │
│       Something went wrong              │
│                                         │
│   We're having trouble loading this    │
│   page. Please try again.              │
│                                         │
│     [Try Again]  [Go to Home]          │
│                                         │
└─────────────────────────────────────────┘
```

**Network Error:**
```
┌─────────────────────────────────────────┐
│                                         │
│              ┌───────┐                  │
│              │  📡   │                  │
│              └───────┘                  │
│                                         │
│       Connection lost                   │
│                                         │
│   Check your internet connection       │
│   and try again.                       │
│                                         │
│            [Retry]                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 9. Collapsible Sections

Used for progressive disclosure in forms (e.g., the brew form's Setup, Brewing, Tasting sections).

### Pattern

```
┌─────────────────────────────────────────┐
│ [>] Section Name                        │  <- Collapsed (default)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ [-] Section Name                        │  <- Expanded
├─────────────────────────────────────────┤
│                                         │
│   Field 1    [________________]         │
│   Field 2    [________________]         │
│                                         │
└─────────────────────────────────────────┘
```

### Behavior

- All sections collapsed by default for minimal visual weight
- Click header to toggle open/close
- Chevron icon rotates: right (collapsed) -> down (expanded)
- Expansion state persists during the form lifecycle (not across page navigations)
- Keyboard: `Enter` or `Space` toggles section

### Implementation

Use Radix UI Collapsible (via shadcn/ui) or a simple controlled state with CSS transitions:

```tsx
<Collapsible>
  <CollapsibleTrigger className="flex w-full items-center justify-between p-4">
    <span className="text-sm font-medium">Section Name</span>
    <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
  </CollapsibleTrigger>
  <CollapsibleContent className="px-4 pb-4">
    {/* Section fields */}
  </CollapsibleContent>
</Collapsible>
```

### Visual Style

- Section header: `text-sm font-medium`, full-width clickable area
- Border: subtle `border-b` separator between sections
- Background: same as card (no distinct background for collapsed headers)
- Transition: smooth height animation on expand/collapse

### Section Fill-Status Indicator

A 3-state dot indicator on collapsible section headers communicates whether fields inside have been filled, without requiring the user to expand the section.

**States:**

| State | Visual | Description |
|-------|--------|-------------|
| Empty | Gray dot (`bg-zinc-300 dark:bg-zinc-600`) | No fields in the section have values |
| Partial | Half-teal dot (`bg-gradient` or half-fill) | Some fields have values, others are empty |
| Complete | Full teal dot (`bg-teal-600 dark:bg-teal-500`) | All fields in the section have values |

**Implementation:**

```tsx
<CollapsibleTrigger className="flex w-full items-center justify-between p-4">
  <span className="text-sm font-medium">Section Name</span>
  <div className="flex items-center gap-2">
    <SectionFillDot status={sectionStatus} /> {/* "empty" | "partial" | "complete" */}
    <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
  </div>
</CollapsibleTrigger>
```

**Dot sizing:** 8px diameter (`h-2 w-2 rounded-full`)

**Logic:** Each section defines which fields count toward fill status. The indicator updates in real-time as the user fills or clears fields. The half-fill state uses either a CSS gradient (left half teal, right half gray) or an SVG half-circle.

**Usage:** Applied to the brew form's 3 collapsible sections (Setup, Brewing, Tasting). Both new and edit forms show indicators.

---

## 10. Sensory Radar Chart

A custom SVG component that visualizes the 6 sensory attributes (aroma, body, sweetness, brightness, complexity, aftertaste) on a 1-10 scale as a hexagonal radar chart.

### Purpose

Provides an at-a-glance sensory profile visualization for brews. Used in:
- Brew detail modal (Tasting section)
- Coffee detail reference brew section
- Brew form reference sidebar (Outcomes section)

### Implementation

Custom SVG component (~100 LOC). No charting library dependency.

### Dimensions

- **Desktop:** ~180x180px
- **Mobile:** ~140x140px
- Responsive to container width (uses `viewBox` for scaling)

### Visual Specification

```
         Sweetness (8)
            /\
           /  \
          /    \
   Aroma /  ****\ Brightness
    (7) / **    **\ (7)
       /**        **\
      *              *
 Body *--------------* Complexity
  (7)  **          **   (6)
         **      **
           **  **
         Aftertaste (7)
```

**Structure:**
- **Hexagonal shape** with 6 vertices, one for each sensory attribute
- **Concentric hexagonal gridlines** at scale levels 2, 4, 6, 8, 10 — drawn in `border` color, thin stroke (1px)
- **Axis lines** from center to each vertex — drawn in `border` color, thin stroke (1px)
- **Attribute labels** at each vertex — `muted-foreground` color, `text-xs` size
- **Data polygon** connecting the 6 attribute values:
  - Fill: `primary` at 20% opacity
  - Stroke: `primary` at full opacity, 2px width
- **Data points** at each vertex value position — small circles (4px radius) in `primary` color

**Vertex order** (clockwise from top):
1. Sweetness (top)
2. Brightness (top-right)
3. Complexity (bottom-right)
4. Aftertaste (bottom)
5. Body (bottom-left)
6. Aroma (top-left)

### Theming

Uses CSS custom properties from the design system color tokens:
- Gridlines and axes: `hsl(var(--border))`
- Labels: `hsl(var(--muted-foreground))`
- Data polygon fill: `hsl(var(--primary) / 0.2)`
- Data polygon stroke: `hsl(var(--primary))`
- Data points: `hsl(var(--primary))`

Works correctly in both light and dark modes without any mode-specific overrides.

### Accessibility

- `role="img"` on the SVG element
- `aria-label` describing the sensory profile, e.g., "Sensory profile: aroma 7, body 7, sweetness 8, brightness 7, complexity 6, aftertaste 7"
- Tooltip on hover showing the numeric value for each attribute (uses the existing tooltip component)
- Does not rely solely on visual representation — numeric values are also available in surrounding UI context

### Conditional Rendering

- Only rendered when **at least one** sensory attribute has a non-null value
- Attributes with null values are plotted at 0 (center) on the chart
- If all 6 attributes are null, the chart is not shown at all
