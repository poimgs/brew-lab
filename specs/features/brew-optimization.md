# Brew Optimization

## Overview

Brew optimization is the workflow for improving a single experiment by comparing actual sensory scores against target goals. It provides:

- **Target Profile**: Set desired scores for sensory variables
- **Gap Visualization**: Radar chart overlaying current vs target
- **Guidance**: Consult effect mappings to understand what to change

This workflow is available both when logging a new brew and when revisiting past experiments.

**Key insight:** Users often know what they want their coffee to taste like (target), and this feature helps them understand what parameter changes might get them there.

---

## Target Profile

### Concept

A target profile represents the user's desired sensory outcome for an experiment. It consists of 5 core variables:

| Variable | Field Name | Description |
|----------|------------|-------------|
| Acidity | target_acidity | Desired acidity intensity (1-10) |
| Sweetness | target_sweetness | Desired sweetness intensity (1-10) |
| Bitterness | target_bitterness | Desired bitterness intensity (1-10) |
| Body | target_body | Desired body weight (1-10) |
| Aroma | target_aroma | Desired aroma intensity (1-10) |

### When to Set Targets

**During new brew entry:**
- Optional step after entering sensory scores
- "Want to improve this brew? Set target scores."

**When reviewing past brews:**
- Edit experiment to add/update targets
- "Planning a retry? Set your target profile."

### Target Fields on Experiment Entity

Add to the Experiment entity (see brew-tracking.md):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| target_acidity | integer | No | Target acidity (1-10) |
| target_sweetness | integer | No | Target sweetness (1-10) |
| target_bitterness | integer | No | Target bitterness (1-10) |
| target_body | integer | No | Target body (1-10) |
| target_aroma | integer | No | Target aroma (1-10) |

### Database Schema Addition

```sql
-- Add target columns to experiments table
ALTER TABLE experiments ADD COLUMN target_acidity INTEGER CHECK (target_acidity BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN target_sweetness INTEGER CHECK (target_sweetness BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN target_bitterness INTEGER CHECK (target_bitterness BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN target_body INTEGER CHECK (target_body BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN target_aroma INTEGER CHECK (target_aroma BETWEEN 1 AND 10);
```

---

## User Stories

1. **Set Target During Entry**: As a user, I can set target scores when logging a brew
2. **Set Target Later**: As a user, I can add targets when reviewing a past brew
3. **See Gaps**: As a user, I can see how my current scores compare to targets
4. **Understand Changes**: As a user, I can consult effect mappings to see what to change
5. **Plan Next Attempt**: As a user, I can understand what parameter adjustments to try

---

## User Interface

### Target Score Input

Located in the experiment form, after sensory scores section:

```
┌─────────────────────────────────────────────────────────────┐
│ ─── Target Profile (Optional) ───                    [−]    │
│                                                             │
│ Set your ideal scores to see improvement gaps               │
│                                                             │
│ Acidity      [═══════●══] 6                                │
│ Sweetness    [═══════════●] 8                              │
│ Bitterness   [════●══════] 4                               │
│ Body         [═══════●══] 6                                │
│ Aroma        [════════●═] 7                                │
│                                                             │
│ [Clear All Targets]                                         │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Collapsible section, expanded by default if any targets set
- Sliders match sensory score input style
- Shows current value next to each slider
- "Clear All" resets all targets to null

### Radar Chart

Displays current scores vs target scores on a 5-axis radar chart:

```
┌─────────────────────────────────────────────────────────────┐
│ Score Comparison                                            │
│                                                             │
│                    Acidity                                  │
│                       ▲                                     │
│                      /|\                                    │
│                     / | \                                   │
│                    /  |  \                                  │
│           Aroma   /   |   \   Sweetness                    │
│               ●--●----●----●--●                             │
│                \      |      /                              │
│                 ●-----●-----●                               │
│                  \    |    /                                │
│                   \   |   /                                 │
│                    \  |  /                                  │
│                     \ | /                                   │
│            Body ─────●───── Bitterness                     │
│                                                             │
│            ── Current (solid)                              │
│            -- Target (dashed)                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- 5 axes: Acidity, Sweetness, Bitterness, Body, Aroma
- Solid line: Current sensory scores
- Dashed line: Target scores
- Color coding: Green where meeting/exceeding target, red where gap exists
- Scale: 1-10 radiating from center

### Gap Summary

Below the radar chart, a summary of gaps:

```
┌─────────────────────────────────────────────────────────────┐
│ Gaps to Target                                              │
│                                                             │
│ ↓ Acidity      7 → 5    Need -2 points                     │
│ ↑ Sweetness    5 → 8    Need +3 points                     │
│ ✓ Bitterness   4 = 4    On target                          │
│ ↓ Body         7 → 6    Need -1 point                      │
│ ✓ Aroma        7 = 7    On target                          │
│                                                             │
│ [View Effect Mappings →]                                    │
└─────────────────────────────────────────────────────────────┘
```

**Gap indicators:**
- ↑ Need to increase
- ↓ Need to decrease
- ✓ On target (or close enough)

### Effect Mappings Reference Panel

Read-only panel showing relevant effect mappings:

```
┌─────────────────────────────────────────────────────────────┐
│ What to Change                                              │
│                                                             │
│ Based on your gaps (acidity ↓, sweetness ↑, body ↓):       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Temperature -5°C                                        │ │
│ │ ├─ Acidity:    ↓ 1-2 pts (High)   ✓ Helps              │ │
│ │ ├─ Sweetness:  ↑ 0-1 pts (Med)    ✓ Helps              │ │
│ │ └─ Body:       — (High)                                 │ │
│ │ Source: James Hoffmann                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Ratio +1 step (e.g., 1:15 → 1:16)                      │ │
│ │ ├─ Body:       ↓ 0-1 pts (Med)    ✓ Helps              │ │
│ │ └─ Sweetness:  ↑ 0-1 pts (Low)    ✓ Helps              │ │
│ │ Source: Personal observation                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Manage Mappings →]                                         │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Filters to show mappings relevant to current gaps
- Shows whether each effect helps (✓) or conflicts with gaps
- Confidence level displayed for each effect
- Links to full mapping management in Experiment Review

### Optimization Workflow Integration

In the Brew Tracking page, the optimization features are presented as:

**New Experiment Form:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Coffee Selection]                                          │
│ [Notes & Score]                                             │
│ [+ Pre-Brew Variables]                                      │
│ [+ Brew Variables]                                          │
│ [+ Post-Brew Variables]                                     │
│ [+ Quantitative Outcomes]                                   │
│ [+ Sensory Outcomes]  ← Must have scores to set targets    │
│ [+ Target Profile]    ← NEW: Shows radar chart & mappings  │
│ [+ Issue Tags]                                              │
└─────────────────────────────────────────────────────────────┘
```

**Experiment Detail View:**
```
┌─────────────────────────────────────────────────────────────┐
│ Kiamaina · January 19, 2026                                 │
├─────────────────────────────────────────────────────────────┤
│ [Parameters] [Outcomes] [Optimization]                      │
│                                                             │
│ ─── OPTIMIZATION TAB ───                                    │
│                                                             │
│ [Target Profile Inputs]                                     │
│ [Radar Chart]                                               │
│ [Gap Summary]                                               │
│ [Relevant Effect Mappings]                                  │
│                                                             │
│               [Plan Next Attempt →]                         │
└─────────────────────────────────────────────────────────────┘
```

### "Plan Next Attempt" Flow

When user clicks "Plan Next Attempt":

1. Creates new experiment (copy as template)
2. Pre-fills coffee reference
3. Adds note: "Attempting: [summary of planned changes]"
4. Links to original experiment for comparison

---

## API Updates

### Experiment Endpoints

The existing experiment endpoints accept and return target fields:

**Create/Update Request:**
```json
{
  "coffee_id": "uuid",
  "overall_notes": "...",
  "acidity_intensity": 7,
  "sweetness_intensity": 5,
  "target_acidity": 5,
  "target_sweetness": 8,
  "target_bitterness": 4,
  "target_body": 6,
  "target_aroma": 7
}
```

**Response includes targets and computed gaps:**
```json
{
  "data": {
    "id": "uuid",
    "acidity_intensity": 7,
    "sweetness_intensity": 5,
    "target_acidity": 5,
    "target_sweetness": 8,
    "gaps": {
      "acidity": {"current": 7, "target": 5, "direction": "decrease", "amount": 2},
      "sweetness": {"current": 5, "target": 8, "direction": "increase", "amount": 3}
    }
  }
}
```

### Get Optimization Context

```
GET /api/v1/experiments/:id/optimization
```

Returns experiment with optimization-focused data:

**Response:**
```json
{
  "data": {
    "experiment": {
      "id": "uuid",
      "scores": {
        "acidity": 7,
        "sweetness": 5,
        "bitterness": 4,
        "body": 7,
        "aroma": 7
      },
      "targets": {
        "acidity": 5,
        "sweetness": 8,
        "bitterness": 4,
        "body": 6,
        "aroma": 7
      }
    },
    "gaps": [
      {"variable": "acidity", "direction": "decrease", "amount": 2},
      {"variable": "sweetness", "direction": "increase", "amount": 3},
      {"variable": "body", "direction": "decrease", "amount": 1}
    ],
    "relevant_mappings": [
      {
        "id": "uuid",
        "name": "Lower Temperature Effect",
        "variable": "temperature",
        "direction": "decrease",
        "tick_description": "5°C",
        "effects": [...],
        "helpfulness": {
          "helps": ["acidity", "sweetness"],
          "conflicts": [],
          "neutral": ["bitterness", "body", "aroma"]
        }
      }
    ]
  }
}
```

---

## Design Decisions

### 5 Core Variables

Limiting to 5 sensory variables because:
- Creates clean radar chart visualization
- Focuses on most actionable dimensions
- Matches common cupping vocabulary
- Reduces cognitive overhead

Aftertaste and overall score are tracked but not part of target profile.

### Targets per Experiment

Targets stored on individual experiments rather than globally because:
- Different coffees have different ideal profiles
- Users may have varying goals per session
- Enables before/after comparison
- Supports iterative improvement tracking

### Radar Chart Visualization

Radar chart chosen because:
- Natural for multi-variable comparison
- Instantly shows shape difference
- Common in coffee/wine profiling
- Engaging and memorable

### Read-Only Mappings in Brew Tracking

Effect mappings are read-only in Brew Tracking because:
- Keeps focus on the current brew
- Management happens in Experiment Review
- Avoids context-switching during logging
- Clear separation of concerns

### Optional Targets

Targets are optional because:
- Not all brews are about optimization
- Some brews are exploratory
- Reduces friction for quick logging
- Power feature for engaged users

---

## Open Questions

1. **Target Templates**: Save and reuse target profiles for coffee types?
2. **Target from Best Brew**: Auto-suggest targets from highest-scored experiment with same coffee?
3. **Improvement Tracking**: Show progress toward target across multiple attempts?
4. **Conflicting Mappings**: How to handle mappings that help one gap but hurt another?
5. **Linking Attempts**: Explicitly link "retry" experiments for before/after comparison?
