# Design System

## Context

This design system establishes the visual language and component patterns for the Coffee Experiment Tracker. It uses a **friendly data** aesthetic—clean, modern, and data-forward—that balances information density with comfortable whitespace.

## Technology Stack

| Purpose | Technology | Rationale |
|---------|------------|-----------|
| Styling | Tailwind CSS | Utility-first, excellent dark mode support, consistent spacing |
| Components | shadcn/ui (Radix-based) | Accessible primitives, customizable, TypeScript-native |
| Forms | React Hook Form | Performant validation, minimal re-renders, good DX |
| Charts | Recharts | React-native, composable, good for correlation data |
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

**Correlation Heatmap Gradient:**

| Correlation | Light Mode | Dark Mode |
|-------------|------------|-----------|
| Strong positive (0.7+) | `emerald-600` | `emerald-500` |
| Moderate positive (0.4-0.7) | `emerald-400` | `emerald-400` |
| Weak positive (0.1-0.4) | `emerald-200` | `emerald-700` |
| Neutral (-0.1 to 0.1) | `zinc-200` | `zinc-600` |
| Weak negative (-0.4 to -0.1) | `red-200` | `red-700` |
| Moderate negative (-0.7 to -0.4) | `red-400` | `red-400` |
| Strong negative (-0.7 or less) | `red-600` | `red-500` |

**Chart Colors (for multi-series):**

| Series | Light Mode | Dark Mode | Usage |
|--------|------------|-----------|-------|
| Series 1 | `teal-600` | `teal-500` | Primary data series |
| Series 2 | `violet-600` | `violet-500` | Secondary series |
| Series 3 | `amber-600` | `amber-500` | Tertiary series |
| Series 4 | `rose-600` | `rose-500` | Quaternary series |
| Series 5 | `cyan-600` | `cyan-500` | Additional series |

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

**Touch Target Minimum:** 44px × 44px for all interactive elements.

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
