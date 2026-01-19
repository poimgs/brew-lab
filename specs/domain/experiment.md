# Experiment Entity

## Context

An Experiment represents a single pour-over brewing session. It captures the full context: which coffee was used, all brewing parameters, and the resulting taste outcomes. This is the central entity of the application.

The design prioritizes low-friction entry—only coffee and overall notes are required. All other fields are optional, allowing users to start simple and add detail as their tracking sophistication grows.

## Requirements

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| coffee_id | UUID | Yes | Reference to Coffee entity |
| brew_date | timestamp | Auto | When the experiment was recorded (defaults to now) |
| overall_notes | text | Yes | Free-form notes about the brew |
| overall_score | integer | No | 1-10 rating |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

### Pre-Brew Variables

These are set before brewing begins.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| coffee_weight | decimal | grams | Dose of coffee grounds |
| water_weight | decimal | grams | Total water used |
| ratio | string | — | Shorthand like "1:15" (can be calculated or entered) |
| grind_size | string | — | Grinder-specific (e.g., "8 clicks", "3.5 on Ode") |
| water_temperature | decimal | °C | Water temperature at pour |
| filter_type | string | — | Filter paper brand/type |

### Brew Variables

Parameters during the brewing process.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| bloom_water | decimal | grams | Water used for bloom |
| bloom_time | integer | seconds | Bloom duration |
| pour_1 | string | — | First pour description (amount, technique) |
| pour_2 | string | — | Second pour description |
| pour_3 | string | — | Third pour description |
| total_brew_time | integer | seconds | Total time from first pour to drawdown complete |
| drawdown_time | integer | seconds | Time for final drawdown |
| technique_notes | text | — | Additional technique details |

### Post-Brew Variables

Modifications made after brewing, before tasting.

| Field | Type | Description |
|-------|------|-------------|
| serving_temperature | enum | Hot, Warm, Cold |
| water_bypass | string | Water added post-brew (e.g., "5 drops") |
| mineral_additions | string | Mineral modifiers added (e.g., "2 drops Catalyst") |

### Quantitative Outcomes

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| final_weight | decimal | grams | Weight of brewed coffee |
| tds | decimal | % | Total Dissolved Solids reading |
| extraction_yield | decimal | % | Calculated or measured extraction |

### Sensory Outcomes

All intensity fields are 1-10 scale.

| Field | Type | Description |
|-------|------|-------------|
| aroma_intensity | integer | Strength of aroma |
| aroma_notes | text | Aroma descriptors |
| acidity_intensity | integer | Perceived acidity level |
| sweetness_intensity | integer | Perceived sweetness level |
| bitterness_intensity | integer | Perceived bitterness level |
| body_weight | integer | Body/mouthfeel weight |
| flavor_notes | text | Taste descriptors |
| aftertaste_duration | integer | How long aftertaste persists |
| aftertaste_intensity | integer | Strength of aftertaste |
| aftertaste_notes | text | Aftertaste descriptors |

### Issue Tags

| Field | Type | Description |
|-------|------|-------------|
| issue_tags | array[string] | Selected issues with this brew (see issue-tags.md) |
| improvement_notes | text | Ideas for next attempt |

## Design Decisions

### Minimal Required Fields

Only `coffee_id` and `overall_notes` are required because:
- Reduces friction for quick logging
- Users may not have measuring equipment initially
- Overall notes capture the essential learnings even without quantitative data

### Brew Date Auto-Population

`brew_date` defaults to current timestamp at entry. Users can edit it for backdated entries. Combined with coffee's `roast_date`, this enables calculating days off roast.

### Pour Descriptions as Strings

Pour fields are strings rather than structured objects because:
- Techniques vary widely (pulse pours, continuous, Rao spin, etc.)
- Users describe pours naturally: "90g, circular motion"
- Future: Could parse these for analysis, but start simple

### Ratio as String

Ratio stored as string (e.g., "1:15") rather than calculated from weights because:
- Common way users think about recipes
- Can be entered without scale measurements
- Calculation can supplement: if weights provided, display calculated ratio alongside

### Sensory Scales

1-10 scale chosen for consistency and granularity:
- Sufficient resolution to track changes
- Intuitive for users
- Matches common cupping conventions

### No Experiment Grouping

Experiments are not explicitly grouped into "sessions." The CSV shows multiple experiments done together (same experiment number), but for the app:
- Filtering by date range achieves similar grouping
- Comparison feature handles side-by-side analysis
- Simplifies data model

## Open Questions

1. **Equipment Tracking**: Should brewer device (V60, Kalita, etc.) be a field? Currently implicit.
2. **Photo Attachments**: Capture images of the brew/cup?
3. **Timestamps During Brew**: Would step-by-step timer integration be valuable?
