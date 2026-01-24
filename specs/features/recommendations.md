# Recommendations

## Overview

Recommendations help users understand what to change to improve their brews. The system connects:
- **Issue tags**: Problems identified in a brew
- **Score gaps**: Difference between actual and target sensory scores
- **Effect mappings**: User-defined cause→effect relationships

This closes the loop between identifying problems and understanding solutions.

**Key shift from rules-based approach:**
- Old: Issue tag → text suggestion
- New: Score gap → relevant effect mappings → quantified expected changes

---

## Requirements

### User Stories

1. **See Relevant Mappings**: As a user, after identifying gaps, I see mappings that could help
2. **Understand Effects**: As a user, I can see expected changes from each mapping
3. **Prioritize Changes**: As a user, I can see which mappings help most with my gaps
4. **Dismiss Suggestions**: As a user, I can dismiss unhelpful suggestions
5. **Track Application**: As a user, I can note when I tried a suggestion

### Issue Tagging Flow

**During Experiment Entry:**
```
┌─────────────────────────────────────────────────────────────┐
│ ─── Issue Tags ───                            [expand]      │
│                                                             │
│ What issues did you notice?                                 │
│                                                             │
│ Extraction:  [☐ Under] [☐ Over] [☐ Channeling]             │
│ Taste:       [☑ Too Acidic] [☐ Too Bitter]                 │
│              [☑ Lacks Sweetness] [☐ Lacks Body]            │
│ Other:       [☐ Muted] [☐ Off-flavors] [☐ Vegetal]         │
│                                                             │
│ [+ Custom tag]                                              │
└─────────────────────────────────────────────────────────────┘
```

Issue tags help categorize problems but are secondary to score-based gap analysis.

### Gap-Based Recommendations

The primary recommendation flow uses score gaps (see [brew-optimization.md](brew-optimization.md)):

```
┌─────────────────────────────────────────────────────────────┐
│ Recommendations                                      [Close]│
│ For: Kiamaina · Jan 19                                      │
│ Gaps: Acidity ↓2, Sweetness ↑3, Body ↓1                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎯 Lower Temperature (-5°C)                             │ │
│ │    Source: James Hoffmann                               │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Expected effects:                                       │ │
│ │ • Acidity ↓ 1-2 pts (High confidence)    ✓ Helps gap   │ │
│ │ • Sweetness ↑ 0-1 pts (Medium)           ✓ Helps gap   │ │
│ │ • Body — no change (High)                              │ │
│ │                                                         │ │
│ │ [Try This →]  [Dismiss]  [View Mapping]                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎯 Higher Ratio (+1 step to 1:16)                       │ │
│ │    Source: Personal observation                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Expected effects:                                       │ │
│ │ • Body ↓ 0-1 pts (Medium)                ✓ Helps gap   │ │
│ │ • Sweetness ↑ 0-1 pts (Low)              ✓ Helps gap   │ │
│ │                                                         │ │
│ │ [Try This →]  [Dismiss]  [View Mapping]                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ No more matching mappings.                                  │
│ [Create Mapping for These Gaps]                             │
└─────────────────────────────────────────────────────────────┘
```

### Recommendation Ranking

Mappings are ranked by relevance to gaps:

1. **Helps count**: How many gaps does this mapping address?
2. **Confidence**: Higher confidence mappings rank higher
3. **No conflicts**: Mappings that don't worsen other gaps rank higher

**Ranking example:**
```
Gap: Acidity ↓2, Sweetness ↑3

Mapping A: Acidity ↓, Sweetness ↑ (High confidence)
→ Rank 1: Helps 2 gaps, high confidence

Mapping B: Acidity ↓ (Medium confidence)
→ Rank 2: Helps 1 gap

Mapping C: Acidity ↓, Body ↑ (High confidence)
→ Rank 3: Helps 1 gap, neutral on sweetness, but body wasn't a gap
```

### Recommendation Actions

**"Try This" Action:**
1. Opens new experiment form (copy as template)
2. Pre-selects same coffee
3. Adds note: "Trying: [mapping name] - expected effects: [summary]"
4. Links experiments for comparison later

**"Dismiss" Action:**
- Hides mapping for this experiment's gaps
- Dismissal is specific to experiment-mapping pair
- Mapping still appears for other experiments
- Can be undone

**"View Mapping" Action:**
- Opens mapping detail view
- User can modify if suggested effect is off
- Links to Experiment Review for full management

### No Matching Mappings

When no mappings match the identified gaps:
```
┌─────────────────────────────────────────────────────────────┐
│ No matching effect mappings for these gaps.                 │
│                                                             │
│ You can:                                                    │
│ • [Create a Mapping] for these effects                      │
│ • [Analyze Experiments] to find patterns                    │
│ • [Review Similar Experiments] to see what worked           │
└─────────────────────────────────────────────────────────────┘
```

### Recommendations Overview Page

**Dedicated page showing experiments with optimization opportunities:**
```
┌─────────────────────────────────────────────────────────────┐
│ Recommendations Overview                                    │
├─────────────────────────────────────────────────────────────┤
│ Experiments with target gaps: 5                             │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Kiamaina · Jan 19                                       │ │
│ │ Gaps: Acidity ↓2, Sweetness ↑3                         │ │
│ │ 2 relevant mappings                      [View]         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ El Calagual · Jan 18                                    │ │
│ │ Gaps: Body ↓1, Aroma ↑2                                │ │
│ │ 1 relevant mapping                       [View]         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Get Recommendations for Experiment

```
POST /api/v1/recommendations
```

Get effect mappings relevant to an experiment's gaps.

**Request:**
```json
{
  "experiment_id": "uuid",
  "gaps": [
    {"variable": "acidity", "direction": "decrease", "amount": 2},
    {"variable": "sweetness", "direction": "increase", "amount": 3}
  ]
}
```

If `gaps` is omitted, computed from experiment's scores vs targets.

**Response:**
```json
{
  "data": {
    "recommendations": [
      {
        "mapping_id": "uuid",
        "mapping_name": "Lower Temperature Effect",
        "variable": "temperature",
        "direction": "decrease",
        "tick_description": "5°C",
        "effects": [
          {
            "output_variable": "acidity",
            "direction": "decrease",
            "range_min": 1,
            "range_max": 2,
            "confidence": "high",
            "helps_gap": true
          },
          {
            "output_variable": "sweetness",
            "direction": "increase",
            "range_min": 0,
            "range_max": 1,
            "confidence": "medium",
            "helps_gap": true
          }
        ],
        "source": "James Hoffmann",
        "relevance_score": 0.85,
        "helps_count": 2,
        "conflicts_count": 0
      }
    ],
    "unaddressed_gaps": []
  }
}
```

### Dismiss Recommendation

```
POST /api/v1/experiments/:id/dismiss-mapping
```

Dismiss a mapping for a specific experiment.

**Request:**
```json
{
  "mapping_id": "uuid"
}
```

**Response:** `204 No Content`

### Get Dismissed Mappings

```
GET /api/v1/experiments/:id/dismissed-mappings
```

**Response:**
```json
{
  "data": {
    "dismissed_mapping_ids": ["uuid1", "uuid2"]
  }
}
```

### Undo Dismiss

```
DELETE /api/v1/experiments/:id/dismiss-mapping/:mapping_id
```

**Response:** `204 No Content`

### Try Recommendation

```
POST /api/v1/experiments/:id/try-mapping
```

Creates a new experiment linked to the original, with a note about the mapping being tried.

**Request:**
```json
{
  "mapping_id": "uuid",
  "coffee_id": "uuid"
}
```

If `coffee_id` is omitted, uses same coffee as original experiment.

**Response:** `201 Created` with new experiment template

The new experiment includes:
- `improvement_notes`: "Trying: [mapping name] - expected: [effects summary]"
- Link back to original experiment for comparison

### Get Experiments with Gaps

```
GET /api/v1/experiments/with-gaps
```

Returns experiments that have target profiles with unmet gaps.

**Query Parameters:**
- `page`, `per_page`: Pagination
- `has_recommendations`: Filter to only experiments with matching mappings

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "brew_date": "2026-01-19T10:30:00Z",
      "coffee_name": "Kiamaina",
      "gaps": [
        {"variable": "acidity", "direction": "decrease", "amount": 2},
        {"variable": "sweetness", "direction": "increase", "amount": 3}
      ],
      "recommendation_count": 2
    }
  ],
  "pagination": {...}
}
```

---

## Issue Tags Reference

Issue tags remain useful for categorizing problems. They map to sensory outcomes:

| Tag | Related Variables | Implied Gap |
|-----|-------------------|-------------|
| `too_acidic` | acidity | acidity ↓ |
| `lacks_acidity` | acidity | acidity ↑ |
| `too_bitter` | bitterness | bitterness ↓ |
| `lacks_sweetness` | sweetness | sweetness ↑ |
| `lacks_body` | body | body ↑ |
| `too_heavy` | body | body ↓ |
| `muted_flavors` | aroma, overall | aroma ↑ |
| `under_extracted` | overall | — (process issue) |
| `over_extracted` | overall | — (process issue) |

When an experiment has issue tags but no target profile, the system can infer implied gaps.

---

## Design Decisions

### Gap-Based over Issue-Based

Primary trigger is score gaps rather than issue tags because:
- More precise (quantified)
- Directly actionable
- Matches effect mapping structure
- Issue tags are fuzzy categories

### Effect Mappings over Rules

Effect mappings replace the rules engine because:
- Quantified effects (not just text suggestions)
- Multi-output per mapping
- Confidence per effect
- Better mental model for optimization

### Relevance Ranking

Mappings ranked by relevance rather than alphabetically:
- Shows most helpful first
- Reduces cognitive load
- Encourages trying best options first

### Dismiss is Scoped

Dismissing a mapping is per-experiment:
- Doesn't disable globally
- Mapping may be right for other situations
- Respects context-dependence

### No Auto-Application

System suggests but never auto-applies changes:
- User maintains control
- Brewing requires human judgment
- Prevents automation of potentially wrong advice

---

## Future Enhancements

1. **Auto-rank by gap magnitude**: Prioritize mappings that address largest gaps
2. **Conflict resolution**: When mappings have opposing effects, help user decide
3. **Effectiveness tracking**: Did following the mapping actually improve scores?
4. **Suggestion combinations**: "Try temperature -5°C AND ratio +1 step"
5. **Learning from dismissals**: Frequent dismissals could lower mapping relevance

---

## Open Questions

1. **Issue Tag → Gap Inference**: How reliably can tags imply gaps?
2. **Multiple Mappings**: Guide user on combining multiple suggestions?
3. **Bulk Recommendations**: Apply same suggestion to multiple experiments?
4. **Mapping Accuracy**: Track predicted vs actual outcomes over time?
