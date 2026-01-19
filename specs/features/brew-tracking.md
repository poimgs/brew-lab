# Brew Tracking Feature

## Context

Brew tracking is the core feature—logging coffee experiments with their parameters and outcomes. The design prioritizes:
- Minimal required fields (coffee + notes only)
- Progressive disclosure of optional fields
- Quick entry during/after brewing
- User-configurable defaults

## Requirements

### User Stories

1. **Quick Log**: As a user, I can log a basic brew in under 30 seconds
2. **Detailed Log**: As a user, I can add detailed parameters when I want precision
3. **Use Defaults**: As a user, I can set defaults for my common setup to reduce entry
4. **Edit Later**: As a user, I can add details after the initial entry
5. **Copy Previous**: As a user, I can start from a previous experiment's settings
6. **Tag Issues**: As a user, I can tag problems with my brew for recommendations

### Entry Flow

**Step 1: Select Coffee (Required)**
```
┌─────────────────────────────────────────┐
│ New Experiment                          │
├─────────────────────────────────────────┤
│ Select Coffee*                          │
│ [Search coffees...               ▼]     │
│                                         │
│ Recent:                                 │
│ • Kiamaina - Cata Coffee (61 days)      │
│ • El Calagual - Cata Coffee (52 days)   │
│ • Stellar S Venus - Curista             │
└─────────────────────────────────────────┘
```

**Step 2: Main Entry Form**
```
┌─────────────────────────────────────────┐
│ Kiamaina · Cata Coffee                  │
│ 61 days off roast                       │
├─────────────────────────────────────────┤
│                                         │
│ Overall Notes*                          │
│ [                                   ]   │
│ [                                   ]   │
│                                         │
│ Overall Score                           │
│ [  ] 1-10                               │
│                                         │
│ [+ Pre-Brew Variables]                  │
│ [+ Brew Variables]                      │
│ [+ Post-Brew Variables]                 │
│ [+ Quantitative Outcomes]               │
│ [+ Sensory Outcomes]                    │
│ [+ Issue Tags]                          │
│                                         │
│      [Cancel]  [Save Experiment]        │
└─────────────────────────────────────────┘
```

**Expanded Section Example (Pre-Brew):**
```
│ ─── Pre-Brew Variables ───        [−]   │
│                                         │
│ Coffee Weight    [15    ] g             │
│ Water Weight     [225   ] g             │
│ Ratio            [1:15  ]               │
│ Grind Size       [8 clicks         ]    │
│ Temperature      [90    ] °C            │
│ Filter           [Hario V60        ▼]   │
```

### Field Sections

**Pre-Brew Variables:**
- Coffee Weight (g)
- Water Weight (g)
- Ratio (calculated or entered)
- Grind Size (free text)
- Water Temperature (°C)
- Filter Type (autocomplete)

**Brew Variables:**
- Bloom Water (g)
- Bloom Time (seconds)
- Pour 1 (description)
- Pour 2 (description)
- Pour 3 (description)
- Total Brew Time (seconds)
- Drawdown Time (seconds)
- Technique Notes (text)

**Post-Brew Variables:**
- Serving Temperature (Hot/Warm/Cold)
- Water Bypass (description)
- Mineral Additions (description + profile selection)

**Quantitative Outcomes:**
- Final Weight (g)
- TDS (%)
- Extraction Yield (%)

**Sensory Outcomes:**
- Aroma Intensity (1-10) + Notes
- Acidity Intensity (1-10)
- Sweetness Intensity (1-10)
- Bitterness Intensity (1-10)
- Body Weight (1-10)
- Flavor Notes (text)
- Aftertaste Duration (1-10)
- Aftertaste Intensity (1-10)
- Aftertaste Notes (text)

**Issue Tags:**
- Multi-select from predefined tags
- Add custom tags inline
- See `issue-tags.md` for tag list

### Defaults System

**Setting Defaults:**
```
Settings → Brew Defaults

┌─────────────────────────────────────────┐
│ Default Values                          │
├─────────────────────────────────────────┤
│ These values pre-fill new experiments   │
│                                         │
│ Coffee Weight    [15    ] g   [Clear]   │
│ Ratio            [1:15  ]     [Clear]   │
│ Grind Size       [8 clicks ]  [Clear]   │
│ Temperature      [90    ] °C  [Clear]   │
│ Filter           [Hario V60]  [Clear]   │
│ Bloom Water      [45    ] g   [Clear]   │
│ Bloom Time       [75    ] sec [Clear]   │
│                                         │
│                     [Save Defaults]     │
└─────────────────────────────────────────┘
```

**Default Behavior:**
- Defaults pre-populate fields when expanding sections
- User can override any default per experiment
- Defaults are per-user
- Clear button removes individual defaults

### Copy from Previous

**Access Points:**
- Experiment list: "Copy" action on experiment row
- Experiment detail: "Use as Template" button

**Behavior:**
- Creates new experiment with same parameters
- Coffee, notes, score, tags are NOT copied
- User must select coffee and add notes
- Useful for A/B testing with one variable changed

### Real-Time Calculations

**Ratio Calculation:**
- If coffee weight and water weight entered, display calculated ratio
- If ratio entered manually, it's stored as-is
- Tooltip: "Calculated: 1:15.0" when derived

**Extraction Yield:**
- If TDS, coffee weight, and final weight entered:
- `EY = (final_weight × TDS) / coffee_weight`
- Display calculated value with "calculated" indicator

**Days Off Roast:**
- Calculated from coffee's roast date and experiment brew date
- Displayed but not stored (derived on read)

### Validation

**Required:**
- Coffee selection
- Overall notes (minimum 10 characters)

**Format Validation:**
- Weights: Positive decimals
- Temperature: 0-100°C
- Intensity scores: 1-10 integers
- Times: Positive integers (seconds)

**Warnings (not blocking):**
- Unusual values: "Temperature 50°C seems low for brewing"
- Missing common fields: "Consider adding brew time for better analysis"

## Design Decisions

### Collapsible Sections

Optional fields in collapsible sections because:
- Reduces visual overwhelm for quick entries
- Users expand what they care about
- Sections remember expansion state per session
- Progressive disclosure pattern

### Ratio as Hybrid Field

Ratio can be entered or calculated:
- Users think in ratios ("I use 1:15")
- But may not have precise measurements
- Showing both covers different use cases

### Descriptive Pour Fields

Pours stored as text descriptions because:
- Techniques vary widely
- "90g, circular motion" is natural
- Structured data would limit flexibility
- Future: Could parse for analysis

### No Timer Integration (Initial)

Built-in timer not included initially:
- Users have phone timers, scales with timers
- Adds significant UI complexity
- Can be added later as enhancement

### Issue Tags at Entry Time

Tags can be added during entry because:
- User knows issues while tasting
- Don't need to return later
- Enables immediate recommendations

## Open Questions

1. **Offline Support**: Cache form state if connection lost?
2. **Timer**: Add built-in brew timer with auto-fill?
3. **Voice Entry**: Dictate notes while brewing?
4. **Equipment Tracking**: Add brewer device field?
