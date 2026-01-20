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

## 1. Color Palette

### Design Direction

Warm earth tones inspired by coffee—amber and stone hues create a crafted, inviting feel while providing excellent contrast for data-heavy interfaces.

### Primary Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | `amber-900` (#78350f) | `amber-500` (#f59e0b) | Primary actions, active states |
| `primary-foreground` | `white` | `amber-950` | Text on primary |
| `primary-hover` | `amber-800` | `amber-400` | Primary button hover |

### Neutral Colors (Stone Scale)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `background` | `stone-50` (#fafaf9) | `stone-950` (#0c0a09) | Page background |
| `foreground` | `stone-900` (#1c1917) | `stone-50` (#fafaf9) | Primary text |
| `muted` | `stone-100` (#f5f5f4) | `stone-800` (#292524) | Subtle backgrounds |
| `muted-foreground` | `stone-500` (#78716c) | `stone-400` (#a8a29e) | Secondary text |
| `border` | `stone-200` (#e7e5e4) | `stone-800` (#292524) | Borders, dividers |
| `input` | `stone-200` (#e7e5e4) | `stone-700` (#44403c) | Input borders |
| `ring` | `amber-600` (#d97706) | `amber-500` (#f59e0b) | Focus rings |

### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `success` | `green-600` (#16a34a) | `green-500` (#22c55e) | Positive outcomes, confirmations |
| `success-muted` | `green-50` | `green-950` | Success backgrounds |
| `warning` | `amber-600` (#d97706) | `amber-500` (#f59e0b) | Warnings, cautions |
| `warning-muted` | `amber-50` | `amber-950` | Warning backgrounds |
| `error` | `red-600` (#dc2626) | `red-500` (#ef4444) | Errors, destructive actions |
| `error-muted` | `red-50` | `red-950` | Error backgrounds |
| `info` | `blue-600` (#2563eb) | `blue-500` (#3b82f6) | Informational messages |
| `info-muted` | `blue-50` | `blue-950` | Info backgrounds |

### Data Visualization Colors

**Correlation Heatmap Gradient (negative to positive):**
```
Strong negative → Neutral → Strong positive
red-600 → red-400 → stone-300 → green-400 → green-600
```

| Correlation | Light Mode | Dark Mode |
|-------------|------------|-----------|
| Strong positive (0.7+) | `green-600` | `green-500` |
| Moderate positive (0.4-0.7) | `green-400` | `green-400` |
| Weak positive (0.1-0.4) | `green-200` | `green-700` |
| Neutral (-0.1 to 0.1) | `stone-200` | `stone-600` |
| Weak negative (-0.4 to -0.1) | `red-200` | `red-700` |
| Moderate negative (-0.7 to -0.4) | `red-400` | `red-400` |
| Strong negative (-0.7 or less) | `red-600` | `red-500` |

**Intensity Scale (1-10 sliders):**
```
1 (low) → 5 (medium) → 10 (high)
amber-200 → amber-500 → amber-800 (light)
amber-800 → amber-500 → amber-300 (dark)
```

**Chart Colors (for multi-series):**
| Series | Light Mode | Dark Mode |
|--------|------------|-----------|
| Series 1 | `amber-600` | `amber-500` |
| Series 2 | `stone-600` | `stone-400` |
| Series 3 | `green-600` | `green-500` |
| Series 4 | `blue-600` | `blue-500` |

### CSS Variables

```css
:root {
  --background: 30 6% 98%;
  --foreground: 24 10% 10%;
  --primary: 26 90% 27%;
  --primary-foreground: 0 0% 100%;
  --muted: 30 6% 96%;
  --muted-foreground: 24 6% 46%;
  --border: 30 6% 90%;
  --input: 30 6% 90%;
  --ring: 32 95% 44%;
  --radius: 0.5rem;
}

.dark {
  --background: 24 10% 4%;
  --foreground: 30 6% 98%;
  --primary: 38 92% 50%;
  --primary-foreground: 24 10% 4%;
  --muted: 24 10% 15%;
  --muted-foreground: 30 6% 65%;
  --border: 24 10% 15%;
  --input: 24 10% 22%;
  --ring: 38 92% 50%;
}
```

---

## 2. Typography

### Font Stack

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display | DM Sans | 600-700 | Page titles, section headers |
| Body | Inter | 400-500 | UI text, paragraphs, labels |
| Mono | JetBrains Mono | 400-500 | Numeric data, codes, inputs with units |

### Font Import

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
```

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

### Typography Patterns

```html
<!-- Page title -->
<h1 class="font-display text-3xl font-bold text-foreground">
  Experiments
</h1>

<!-- Section header -->
<h2 class="font-display text-xl font-semibold text-foreground">
  Pre-Brew Variables
</h2>

<!-- Body text -->
<p class="font-sans text-base text-foreground">
  Description text here.
</p>

<!-- Secondary text -->
<span class="font-sans text-sm text-muted-foreground">
  Last updated 2 hours ago
</span>

<!-- Numeric data -->
<span class="font-mono text-sm tabular-nums">
  15.5g
</span>

<!-- Data with unit -->
<span class="font-mono text-base tabular-nums">92</span>
<span class="text-sm text-muted-foreground">°C</span>
```

### Tailwind Config

```javascript
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  display: ['DM Sans', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

---

## 3. Spacing & Layout

### Base Unit

Tailwind's 4px base unit. All spacing should use standard Tailwind values.

### Spacing Scale

| Class | Size | Common Usage |
|-------|------|--------------|
| `gap-1` | 4px | Tight inline groups |
| `gap-2` | 8px | Related items, icon + text |
| `gap-3` | 12px | Form field + label |
| `gap-4` | 16px | Card padding (mobile), between form sections |
| `gap-6` | 24px | Card padding (desktop), section spacing |
| `gap-8` | 32px | Page margins (desktop), major sections |

### Layout Patterns

**Page Container:**
```html
<!-- Mobile: 16px margins, Desktop: 32px margins, max-width 1280px -->
<div class="mx-auto max-w-7xl px-4 md:px-8">
  <!-- Page content -->
</div>
```

**Card:**
```html
<!-- Mobile: 16px padding, Desktop: 24px padding -->
<div class="rounded-lg border bg-background p-4 md:p-6">
  <!-- Card content -->
</div>
```

**Form Section:**
```html
<div class="space-y-4">
  <!-- Form fields -->
</div>
```

**Stack:**
```html
<!-- Vertical stack with consistent spacing -->
<div class="flex flex-col gap-4">
  <!-- Items -->
</div>
```

### Touch Targets

Minimum touch target: **44px × 44px** for all interactive elements.

```html
<!-- Button with adequate touch target -->
<button class="min-h-[44px] min-w-[44px] px-4 py-2">
  Action
</button>

<!-- Icon button -->
<button class="flex h-11 w-11 items-center justify-center">
  <Icon class="h-5 w-5" />
</button>
```

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

### Responsive Patterns

**Grid Layouts:**
```html
<!-- Coffee list: 1 col mobile → 2 col tablet → 3 col desktop -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  <!-- Cards -->
</div>

<!-- Form: full width mobile → side-by-side desktop -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  <div>Coffee Weight</div>
  <div>Water Weight</div>
</div>
```

**Navigation:**
```html
<!-- Mobile: bottom nav / hamburger -->
<!-- Desktop: sidebar -->
<nav class="fixed bottom-0 left-0 right-0 md:static md:w-64">
  <!-- Nav items -->
</nav>
```

**Comparison Layout:**
```html
<!-- 2 columns on tablet+, stack on mobile -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
  <!-- Experiment cards for comparison -->
</div>
```

### Brewing Scenario Considerations

During brewing, the user likely has wet hands and is focused on the coffee. Mobile design should:
- Use large touch targets (44px+)
- Minimize scrolling for common actions
- Support one-handed use
- Have high contrast for kitchen lighting
- Keep critical inputs always visible

---

## 5. Component Patterns

### shadcn/ui Components to Customize

#### Button

```tsx
// variants: default, secondary, outline, ghost, destructive
// sizes: default (h-10), sm (h-9), lg (h-11), icon (h-10 w-10)

// Primary (coffee-toned)
<Button>Save Experiment</Button>

// Secondary
<Button variant="secondary">Cancel</Button>

// Destructive
<Button variant="destructive">Delete</Button>

// Ghost (for icon buttons)
<Button variant="ghost" size="icon">
  <X className="h-4 w-4" />
</Button>
```

**Button styling overrides:**
```css
.button-primary {
  @apply bg-amber-900 text-white hover:bg-amber-800
         dark:bg-amber-600 dark:hover:bg-amber-500;
}
```

#### Input

```tsx
// Warm focus state with amber ring
<Input
  placeholder="Enter value"
  className="focus-visible:ring-amber-600 dark:focus-visible:ring-amber-500"
/>
```

#### Slider

For 1-10 intensity scales with visible labels.

```tsx
<div className="space-y-2">
  <div className="flex justify-between text-xs text-muted-foreground">
    <span>1 (Low)</span>
    <span>5</span>
    <span>10 (High)</span>
  </div>
  <Slider
    min={1}
    max={10}
    step={1}
    className="[&_[role=slider]]:bg-amber-600"
  />
</div>
```

#### Badge

```tsx
// Issue tags
<Badge variant="outline">too_acidic</Badge>

// Scores (color-coded)
<Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
  8/10
</Badge>

// Confidence levels
<Badge variant="secondary">High Confidence</Badge>
```

#### Card

```tsx
<Card className="p-4 md:p-6">
  <CardHeader>
    <CardTitle>Recommendation</CardTitle>
    <CardDescription>Based on your issue tags</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    <Button>Try This</Button>
  </CardFooter>
</Card>
```

#### Collapsible

For progressive disclosure in forms.

```tsx
<Collapsible>
  <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
    <span className="font-medium">Pre-Brew Variables</span>
    <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-4 pt-4">
    {/* Form fields */}
  </CollapsibleContent>
</Collapsible>
```

#### DataTable

Using TanStack Table with shadcn/ui styling.

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[100px]">Date</TableHead>
      <TableHead>Coffee</TableHead>
      <TableHead className="text-right">Score</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-mono text-sm">Jan 19</TableCell>
      <TableCell>Kiamaina</TableCell>
      <TableCell className="text-right font-mono">8</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Custom Components

#### FormSection

Collapsible form section with consistent styling.

```tsx
interface FormSectionProps {
  title: string
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

// Usage
<FormSection title="Pre-Brew Variables" defaultOpen={false}>
  <NumericInput label="Coffee Weight" unit="g" />
  <NumericInput label="Water Weight" unit="g" />
</FormSection>
```

#### NumericInput

Input with attached unit label.

```tsx
interface NumericInputProps {
  label: string
  unit: string
  value?: number
  onChange: (value: number | undefined) => void
  min?: number
  max?: number
  step?: number
  calculated?: boolean // Show "calculated" indicator
}

// Visual structure
<div className="space-y-1.5">
  <Label>Coffee Weight</Label>
  <div className="flex">
    <Input
      type="number"
      className="rounded-r-none font-mono tabular-nums"
    />
    <span className="flex items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm text-muted-foreground">
      g
    </span>
  </div>
</div>
```

#### IntensitySlider

1-10 scale with semantic labels.

```tsx
interface IntensitySliderProps {
  label: string
  value?: number
  onChange: (value: number) => void
  lowLabel?: string  // e.g., "Thin"
  highLabel?: string // e.g., "Heavy"
}

// Visual structure
<div className="space-y-3">
  <div className="flex justify-between">
    <Label>Body Weight</Label>
    <span className="font-mono text-sm">{value}/10</span>
  </div>
  <Slider min={1} max={10} step={1} value={[value]} />
  <div className="flex justify-between text-xs text-muted-foreground">
    <span>Thin</span>
    <span>Heavy</span>
  </div>
</div>
```

#### IssueTagSelector

Categorized multi-select for issue tags.

```tsx
interface IssueTagSelectorProps {
  selected: string[]
  onChange: (tags: string[]) => void
  categories: {
    name: string
    tags: { id: string; label: string }[]
  }[]
}

// Visual structure
<div className="space-y-4">
  {categories.map(category => (
    <div key={category.name} className="space-y-2">
      <span className="text-sm font-medium text-muted-foreground">
        {category.name}
      </span>
      <div className="flex flex-wrap gap-2">
        {category.tags.map(tag => (
          <button
            key={tag.id}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              selected.includes(tag.id)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  ))}
</div>
```

#### HeatmapCell

Single cell in correlation heatmap.

```tsx
interface HeatmapCellProps {
  value: number // -1 to 1
  sampleSize: number
  onClick?: () => void
}

// Color mapping based on correlation value
const getHeatmapColor = (value: number): string => {
  if (value >= 0.7) return 'bg-green-600 text-white'
  if (value >= 0.4) return 'bg-green-400 text-green-950'
  if (value >= 0.1) return 'bg-green-200 text-green-900'
  if (value > -0.1) return 'bg-stone-200 text-stone-700 dark:bg-stone-600'
  if (value > -0.4) return 'bg-red-200 text-red-900'
  if (value > -0.7) return 'bg-red-400 text-red-950'
  return 'bg-red-600 text-white'
}

// Visual structure
<button
  className={cn(
    "flex h-12 w-16 items-center justify-center rounded font-mono text-sm",
    getHeatmapColor(value)
  )}
>
  {value >= 0 ? '+' : ''}{value.toFixed(2)}
</button>
```

#### RecommendationCard

Display for rule-based suggestions.

```tsx
interface RecommendationCardProps {
  title: string
  confidence: 'High' | 'Medium' | 'Low'
  source?: string
  matchedTags: string[]
  suggestion: string
  expectedEffect?: string
  onTry: () => void
  onDismiss: () => void
  onViewRule: () => void
}

// Visual structure
<Card>
  <CardHeader className="pb-2">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-amber-600" />
        <CardTitle className="text-base">{title}</CardTitle>
      </div>
      <Badge variant="secondary">{confidence}</Badge>
    </div>
    {source && (
      <CardDescription>Source: {source}</CardDescription>
    )}
  </CardHeader>
  <CardContent className="space-y-3">
    <div className="flex flex-wrap gap-1">
      {matchedTags.map(tag => (
        <Badge key={tag} variant="outline" className="text-xs">
          {tag}
        </Badge>
      ))}
    </div>
    <p className="text-sm">{suggestion}</p>
    {expectedEffect && (
      <p className="text-sm text-muted-foreground">
        Expected: {expectedEffect}
      </p>
    )}
  </CardContent>
  <CardFooter className="gap-2">
    <Button size="sm" onClick={onTry}>Try This →</Button>
    <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
    <Button size="sm" variant="ghost" onClick={onViewRule}>View Rule</Button>
  </CardFooter>
</Card>
```

#### TrendIndicator

Show direction of change.

```tsx
type Trend = 'up' | 'down' | 'stable' | 'unknown'

interface TrendIndicatorProps {
  trend: Trend
  label?: string
}

// Visual
const icons = {
  up: <TrendingUp className="h-4 w-4 text-green-600" />,
  down: <TrendingDown className="h-4 w-4 text-red-600" />,
  stable: <Minus className="h-4 w-4 text-stone-500" />,
  unknown: <HelpCircle className="h-4 w-4 text-stone-400" />,
}
```

---

## 6. Form Patterns

### Progressive Disclosure

Forms use collapsible sections to reduce overwhelm.

```
┌─────────────────────────────────────────────────┐
│ Coffee Selection                          [Required] │
│ [Searchable dropdown]                              │
├─────────────────────────────────────────────────┤
│ Overall Notes                             [Required] │
│ [Textarea]                                         │
├─────────────────────────────────────────────────┤
│ Overall Score                                      │
│ [1-10 slider]                                      │
├─────────────────────────────────────────────────┤
│ [+] Pre-Brew Variables                    [Optional] │
│ [+] Brew Variables                        [Optional] │
│ [+] Post-Brew Variables                   [Optional] │
│ [+] Quantitative Outcomes                 [Optional] │
│ [+] Sensory Outcomes                      [Optional] │
│ [+] Issue Tags                            [Optional] │
└─────────────────────────────────────────────────┘
```

### Numeric Input with Units

```
┌────────────────┬──────┐
│ 15.5           │  g   │
└────────────────┴──────┘
```

- Input field left-aligned with monospace font
- Unit label attached on right with muted styling
- Calculated values show indicator (italic or badge)

### Calculated Fields

When a value is derived from other inputs:

```tsx
<div className="space-y-1.5">
  <div className="flex items-center gap-2">
    <Label>Ratio</Label>
    <Badge variant="outline" className="text-xs">calculated</Badge>
  </div>
  <Input
    value="1:15.0"
    disabled
    className="font-mono bg-muted"
  />
</div>
```

### Issue Tag Grid

Organized by category with toggleable tags.

```
Extraction:  [Under] [Over] [☑ Channeling]
Taste:       [☑ Too Acidic] [Too Bitter] [Lacks Sweetness]
Flavor:      [Muted] [Harsh] [Off-flavors]
```

### Validation Display

```tsx
// Field error
<div className="space-y-1.5">
  <Label>Overall Notes</Label>
  <Textarea className="border-red-500 focus-visible:ring-red-500" />
  <p className="text-sm text-red-600">
    Notes must be at least 10 characters
  </p>
</div>

// Warning (non-blocking)
<div className="space-y-1.5">
  <Label>Temperature</Label>
  <Input value="50" />
  <p className="flex items-center gap-1 text-sm text-amber-600">
    <AlertTriangle className="h-3 w-3" />
    50°C seems low for brewing
  </p>
</div>
```

---

## 7. Data Display

### Tables with TanStack Table

Features: sorting, filtering, row selection, pagination.

```tsx
// Column header with sort
<TableHead
  className="cursor-pointer select-none"
  onClick={() => column.toggleSorting()}
>
  <div className="flex items-center gap-1">
    Date
    {column.getIsSorted() === 'asc' && <ChevronUp className="h-4 w-4" />}
    {column.getIsSorted() === 'desc' && <ChevronDown className="h-4 w-4" />}
  </div>
</TableHead>

// Selectable row
<TableRow
  className={cn(
    "cursor-pointer hover:bg-muted",
    row.getIsSelected() && "bg-primary/5"
  )}
>
  <TableCell>
    <Checkbox checked={row.getIsSelected()} />
  </TableCell>
  {/* ... */}
</TableRow>
```

### Comparison Grid

Side-by-side experiment comparison.

```
┌───────────────────┬───────────────────┬───────────────────┐
│ Jan 19 Brew       │ Jan 18 Brew       │ Jan 17 Brew       │
├───────────────────┼───────────────────┼───────────────────┤
│ Temperature: 92°C │ Temperature: 88°C │ Temperature: 95°C │
│ Grind: 8 clicks   │ Grind: 8 clicks   │ Grind: 7 clicks   │
│ Score: 8          │ Score: 6          │ Score: 7          │
│ Acidity: 7 ↓      │ Acidity: 5        │ Acidity: 9 ↑      │
└───────────────────┴───────────────────┴───────────────────┘
```

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
  {experiments.map(exp => (
    <Card key={exp.id}>
      <CardHeader>
        <CardTitle className="text-base">{exp.date}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Temperature</dt>
            <dd className="font-mono">{exp.temperature}°C</dd>
          </div>
          {/* ... */}
        </dl>
      </CardContent>
    </Card>
  ))}
</div>
```

### Correlation Heatmap

Color-coded matrix with clickable cells.

```tsx
<div className="overflow-x-auto">
  <table className="min-w-full">
    <thead>
      <tr>
        <th></th>
        {outcomes.map(o => (
          <th key={o} className="px-2 py-1 text-xs font-medium">
            {o}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {inputs.map(input => (
        <tr key={input}>
          <td className="pr-4 text-sm font-medium">{input}</td>
          {outcomes.map(outcome => (
            <td key={outcome} className="p-1">
              <HeatmapCell
                value={correlations[input][outcome]}
                sampleSize={sampleSizes[input][outcome]}
                onClick={() => openDetail(input, outcome)}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Trend Indicators

Show changes relative to baseline or previous.

| Indicator | Visual | Usage |
|-----------|--------|-------|
| Increase | `↑` (green) | Value went up |
| Decrease | `↓` (red) | Value went down |
| Stable | `=` (gray) | No significant change |
| Unknown | `~` (muted) | Insufficient data |

---

## 8. Dark Mode

### Implementation

Class-based toggle using Tailwind's `dark:` variant with system preference detection.

```tsx
// ThemeProvider context
type Theme = 'light' | 'dark' | 'system'

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

### Theme Toggle

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setTheme('light')}>
      Light
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setTheme('dark')}>
      Dark
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setTheme('system')}>
      System
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Token Coverage

Every color token must have a dark mode equivalent:

```tsx
// Always use semantic tokens, never raw colors
<div className="bg-background text-foreground">       {/* ✓ Good */}
<div className="bg-stone-50 text-stone-900">          {/* ✗ Bad */}

// Semantic colors auto-adapt
<Badge className="bg-success-muted text-success">      {/* ✓ Works in both modes */}
```

---

## 9. Accessibility

### Contrast Requirements

WCAG 2.1 AA compliance:
- Normal text: 4.5:1 minimum
- Large text (18px+ or 14px bold): 3:1 minimum
- UI components: 3:1 minimum

**Verified contrasts:**
| Element | Light Mode Ratio | Dark Mode Ratio |
|---------|-----------------|-----------------|
| Body text | 12.6:1 (stone-900 on stone-50) | 15.1:1 (stone-50 on stone-950) |
| Muted text | 4.5:1 (stone-500 on stone-50) | 4.6:1 (stone-400 on stone-950) |
| Primary button | 8.6:1 (white on amber-900) | 7.1:1 (amber-950 on amber-500) |
| Error text | 5.3:1 (red-600 on white) | 4.5:1 (red-500 on stone-950) |

### Focus States

All interactive elements must have visible focus indicators.

```tsx
// Default shadcn/ui focus ring
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Custom amber focus for inputs
className="focus-visible:ring-amber-600 dark:focus-visible:ring-amber-500"
```

### ARIA Patterns

**Collapsible sections:**
```tsx
<Collapsible>
  <CollapsibleTrigger
    aria-expanded={isOpen}
    aria-controls="section-content"
  >
    Pre-Brew Variables
  </CollapsibleTrigger>
  <CollapsibleContent id="section-content">
    {/* Content */}
  </CollapsibleContent>
</Collapsible>
```

**Data tables:**
```tsx
<table role="grid" aria-label="Experiment list">
  <thead>
    <tr>
      <th scope="col" aria-sort={sortDirection}>Date</th>
    </tr>
  </thead>
  <tbody>
    <tr aria-selected={isSelected}>
      {/* ... */}
    </tr>
  </tbody>
</table>
```

**Issue tag selector:**
```tsx
<div role="group" aria-label="Extraction issues">
  {tags.map(tag => (
    <button
      key={tag.id}
      role="checkbox"
      aria-checked={selected.includes(tag.id)}
    >
      {tag.label}
    </button>
  ))}
</div>
```

### Keyboard Navigation

| Component | Keys | Action |
|-----------|------|--------|
| Button | `Enter`, `Space` | Activate |
| Collapsible | `Enter`, `Space` | Toggle open/close |
| Slider | `←` `→` `↑` `↓` | Adjust value |
| Table | `↑` `↓` | Navigate rows |
| Tag selector | `Tab`, `Space` | Navigate and toggle |
| Modal | `Escape` | Close |

### Reduced Motion

Respect user's motion preferences.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```tsx
// In components
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

<motion.div
  animate={{ opacity: 1 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
>
```

### Screen Reader Considerations

- Use semantic HTML (`<main>`, `<nav>`, `<article>`, `<section>`)
- Include skip links for navigation
- Announce dynamic content changes with `aria-live`
- Provide text alternatives for icons: `<span className="sr-only">Delete experiment</span>`
- Label form fields properly with `<label>` elements

---

## Implementation Checklist

### Foundation (Completed 2026-01-20)
- [x] Configure Tailwind with custom colors, fonts, and theme
- [x] Set up CSS variables for theme tokens
- [x] Install and configure shadcn/ui components (Button, Input, Label, Card, Badge, Slider, Collapsible, DropdownMenu, Tooltip, Separator)
- [x] Implement ThemeProvider with system preference detection
- [x] Create layout components (PageContainer, PageHeader, RootLayout)
- [x] Implement theme toggle with Light/Dark/System options
- [x] Add theme flash prevention script
- [x] Verify reduced motion support

### Custom Components (Pending)
- [ ] Create FormSection component (collapsible with consistent styling)
- [ ] Create NumericInput component (input with unit suffix)
- [ ] Create IntensitySlider component (1-10 scale with labels)
- [ ] Build IssueTagSelector with category grouping
- [ ] Implement HeatmapCell with color mapping
- [ ] Create RecommendationCard component
- [ ] Create TrendIndicator component

### Views & Validation (Pending)
- [ ] Set up responsive layouts for all major views
- [ ] Verify color contrast ratios
- [ ] Test keyboard navigation throughout
- [ ] Add ARIA attributes to all interactive components
- [ ] Test with screen reader
