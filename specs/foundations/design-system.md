# Design System

## Context

This design system establishes the visual language and component patterns for the Coffee Experiment Tracker. It prioritizes a warm, crafted aesthetic inspired by coffee culture while maintaining excellent usability for data entry during brewing sessions.

## Technology Stack

| Purpose | Technology | Rationale |
|---------|------------|-----------|
| Styling | Tailwind CSS | Utility-first, excellent dark mode support, consistent spacing |
| Components | shadcn/ui (Radix-based) | Accessible primitives, customizable, TypeScript-native |
| Forms | React Hook Form | Performant validation, minimal re-renders, good DX |
| Charts | Recharts | React-native, composable, good for correlation data |
| Icons | Lucide React | Consistent style, tree-shakeable, comprehensive |
| Fonts | Inter, DM Sans, JetBrains Mono | Modern, readable, distinct roles |

---

## 1. Colors

Warm earth tones inspired by coffee—amber and stone hues create a crafted, inviting feel while providing excellent contrast for data-heavy interfaces.

### Primary Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | `amber-900` | `amber-500` | Primary actions, active states |
| `primary-foreground` | `white` | `amber-950` | Text on primary |
| `primary-hover` | `amber-800` | `amber-400` | Primary button hover |

### Neutral Colors (Stone Scale)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `background` | `stone-50` | `stone-950` | Page background |
| `foreground` | `stone-900` | `stone-50` | Primary text |
| `muted` | `stone-100` | `stone-800` | Subtle backgrounds |
| `muted-foreground` | `stone-500` | `stone-400` | Secondary text |
| `border` | `stone-200` | `stone-800` | Borders, dividers |
| `input` | `stone-200` | `stone-700` | Input borders |
| `ring` | `amber-600` | `amber-500` | Focus rings |

### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `success` | `green-600` | `green-500` | Positive outcomes, confirmations |
| `success-muted` | `green-50` | `green-950` | Success backgrounds |
| `warning` | `amber-600` | `amber-500` | Warnings, cautions |
| `warning-muted` | `amber-50` | `amber-950` | Warning backgrounds |
| `error` | `red-600` | `red-500` | Errors, destructive actions |
| `error-muted` | `red-50` | `red-950` | Error backgrounds |
| `info` | `blue-600` | `blue-500` | Informational messages |
| `info-muted` | `blue-50` | `blue-950` | Info backgrounds |

### Data Visualization Colors

**Correlation Heatmap Gradient:**

| Correlation | Light Mode | Dark Mode |
|-------------|------------|-----------|
| Strong positive (0.7+) | `green-600` | `green-500` |
| Moderate positive (0.4-0.7) | `green-400` | `green-400` |
| Weak positive (0.1-0.4) | `green-200` | `green-700` |
| Neutral (-0.1 to 0.1) | `stone-200` | `stone-600` |
| Weak negative (-0.4 to -0.1) | `red-200` | `red-700` |
| Moderate negative (-0.7 to -0.4) | `red-400` | `red-400` |
| Strong negative (-0.7 or less) | `red-600` | `red-500` |

**Chart Colors (for multi-series):**

| Series | Light Mode | Dark Mode |
|--------|------------|-----------|
| Series 1 | `amber-600` | `amber-500` |
| Series 2 | `stone-600` | `stone-400` |
| Series 3 | `green-600` | `green-500` |
| Series 4 | `blue-600` | `blue-500` |

---

## 2. Typography

### Font Stack

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display | DM Sans | 600-700 | Page titles, section headers |
| Body | Inter | 400-500 | UI text, paragraphs, labels |
| Mono | JetBrains Mono | 400-500 | Numeric data, codes, inputs with units |

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

---

## 3. Spacing

**Base Unit:** Tailwind's 4px base unit. All spacing should use standard Tailwind values.

### Spacing Scale

| Class | Size | Common Usage |
|-------|------|--------------|
| `gap-1` | 4px | Tight inline groups |
| `gap-2` | 8px | Related items, icon + text |
| `gap-3` | 12px | Form field + label |
| `gap-4` | 16px | Card padding (mobile), between form sections |
| `gap-6` | 24px | Card padding (desktop), section spacing |
| `gap-8` | 32px | Page margins (desktop), major sections |

**Touch Target Minimum:** 44px × 44px for all interactive elements.

---

## 4. Breakpoints

Mobile-first responsive design using Tailwind's default breakpoints.

| Breakpoint | Min Width | Target |
|------------|-----------|--------|
| (base) | 0px | Phones (brewing scenario) |
| `sm` | 640px | Large phones, landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |

### Brewing Scenario Considerations

During brewing, the user likely has wet hands and is focused on the coffee. Mobile design should:

- Use large touch targets (44px+)
- Minimize scrolling for common actions
- Support one-handed use
- Have high contrast for kitchen lighting
- Keep critical inputs always visible

---

## 5. Accessibility

### WCAG 2.1 AA Requirements

- Normal text: 4.5:1 minimum contrast
- Large text (18px+ or 14px bold): 3:1 minimum contrast
- UI components: 3:1 minimum contrast

### Verified Contrasts

| Element | Light Mode Ratio | Dark Mode Ratio |
|---------|-----------------|-----------------|
| Body text | 12.6:1 (stone-900 on stone-50) | 15.1:1 (stone-50 on stone-950) |
| Muted text | 4.5:1 (stone-500 on stone-50) | 4.6:1 (stone-400 on stone-950) |
| Primary button | 8.6:1 (white on amber-900) | 7.1:1 (amber-950 on amber-500) |
| Error text | 5.3:1 (red-600 on white) | 4.5:1 (red-500 on stone-950) |

### Keyboard Navigation

| Component | Keys | Action |
|-----------|------|--------|
| Button | `Enter`, `Space` | Activate |
| Collapsible | `Enter`, `Space` | Toggle open/close |
| Slider | `←` `→` `↑` `↓` | Adjust value |
| Table | `↑` `↓` | Navigate rows |
| Tag selector | `Tab`, `Space` | Navigate and toggle |
| Modal | `Escape` | Close |
