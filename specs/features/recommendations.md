# Recommendations

## Overview

Recommendations connect user-identified brew issues to actionable suggestions via the rules engine. When a user tags issues on an experiment, matching rules surface their suggestions. This closes the loop between tracking problems and learning solutions.

## Requirements

### User Stories

1. **Get Suggestions**: As a user, after tagging issues, I see relevant suggestions
2. **Understand Matches**: As a user, I can see why a rule was suggested
3. **Dismiss Suggestions**: As a user, I can dismiss unhelpful suggestions
4. **Track Application**: As a user, I can note when I tried a suggestion
5. **Quick Access**: As a user, I can get recommendations from an experiment

### Issue Tagging Flow

**During Experiment Entry:**
```
┌─────────────────────────────────────────────────────────┐
│ ─── Issue Tags ───                            [expand]  │
│                                                         │
│ What issues did you notice?                             │
│                                                         │
│ Extraction:  [☐ Under] [☐ Over] [☐ Channeling]         │
│ Taste:       [☑ Too Acidic] [☐ Too Bitter]             │
│              [☑ Lacks Sweetness] [☐ Lacks Body]        │
│ Other:       [☐ Muted] [☐ Off-flavors] [☐ Vegetal]     │
│                                                         │
│ [+ Custom tag]                                          │
│                                                         │
│ ──────────────────────────────────────────────────────  │
│                                                         │
│ 💡 2 rules match your issues                            │
│    [View Suggestions]                                   │
└─────────────────────────────────────────────────────────┘
```

**Real-time Matching:**
- As tags are selected, rules are matched in background
- Count shown immediately
- User can view before saving experiment

### Recommendations Panel

**Triggered From:**
- "View Suggestions" during entry
- "Get Recommendations" on experiment detail
- Dedicated recommendations page (all unresolved)

**Panel Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Recommendations                                  [Close]│
│ For: Kiamaina · Jan 19 · Issues: too_acidic, lacks_sweetness │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🎯 Reduce Acidity by Lowering Temperature           │ │
│ │    Confidence: High · Source: Hoffmann              │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ Matched: too_acidic                                 │ │
│ │                                                     │ │
│ │ Suggestion:                                         │ │
│ │ Lower water temperature by 2-3°C. This reduces     │ │
│ │ acid extraction while maintaining body.            │ │
│ │                                                     │ │
│ │ Expected: acidity ↓, sweetness may ↑               │ │
│ │                                                     │ │
│ │ [Try This →]  [Dismiss]  [View Rule]               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🎯 Increase Sweetness with Longer Bloom            │ │
│ │    Confidence: Medium                               │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ Matched: lacks_sweetness                            │ │
│ │                                                     │ │
│ │ Suggestion:                                         │ │
│ │ Extend bloom time to 90 seconds to allow more      │ │
│ │ even saturation and sweetness extraction.          │ │
│ │                                                     │ │
│ │ [Try This →]  [Dismiss]  [View Rule]               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ No more matching rules.                                 │
│ [Create Rule for These Issues]                          │
└─────────────────────────────────────────────────────────┘
```

### Recommendation Actions

**"Try This" Action:**
1. Opens new experiment form
2. Pre-selects same coffee
3. Adds note: "Trying: [suggestion summary]"
4. User adjusts parameters per suggestion
5. Links experiments for comparison later

**"Dismiss" Action:**
- Hides suggestion for this experiment
- Dismissal is specific to experiment-rule pair
- Rule still appears for other experiments
- Can be undone

**"View Rule" Action:**
- Opens rule detail/edit view
- User can modify rule if suggestion is off

### Rule Matching Logic

**Match Algorithm:**
1. Collect all issue tags from experiment
2. For each active rule:
   - Check if all conditions are satisfied
   - Issue tag conditions: tag must be in experiment's tags
   - Variable conditions: compare experiment's field values
3. Return rules where all conditions match
4. Sort by: confidence (High→Medium→Low), then alphabetically

**Example:**
```
Experiment tags: [too_acidic, lacks_sweetness]
Experiment data: { acidity_intensity: 8, sweetness_intensity: 3 }

Rule 1: Conditions = [issue:too_acidic]
        → MATCHES (too_acidic in tags)

Rule 2: Conditions = [issue:too_bitter, acidity > 6]
        → NO MATCH (too_bitter not in tags)

Rule 3: Conditions = [issue:lacks_sweetness, sweetness < 5]
        → MATCHES (tag present AND sweetness 3 < 5)
```

### Multiple Matching Rules

When multiple rules match:
- All are displayed
- Ordered by confidence
- User decides which to try
- Can try multiple suggestions on different brews

### Recommendation History

**Experiment Detail Shows:**
```
─── Recommendations Applied ───
• Jan 19: Tried "Lower temperature" → See Experiment #48
• Jan 20: Tried "Longer bloom" → See Experiment #49
```

**Links enable:**
- Seeing if suggestion helped
- Comparing before/after
- Building evidence for rule confidence

### No Matching Rules

When no rules match selected issues:
```
┌─────────────────────────────────────────────────────────┐
│ No matching rules for these issues.                     │
│                                                         │
│ You can:                                                │
│ • [Create a Rule] for these issues                      │
│ • [Browse Correlations] to find patterns                │
│ • [Search Web] for "too_acidic coffee brewing"          │
└─────────────────────────────────────────────────────────┘
```

### Recommendations Page

**Dedicated page showing all experiments with unresolved issues:**
```
┌─────────────────────────────────────────────────────────┐
│ Recommendations Overview                                │
├─────────────────────────────────────────────────────────┤
│ Experiments with unresolved issues: 5                   │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Kiamaina · Jan 19                                   │ │
│ │ Issues: too_acidic, lacks_sweetness                 │ │
│ │ 2 suggestions available            [View]           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ El Calagual · Jan 18                                │ │
│ │ Issues: lacks_body, muted_flavors                   │ │
│ │ 1 suggestion available             [View]           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Get Recommendations
```
POST /api/v1/analysis/recommendations
```

Get rule-based recommendations for given issue tags.

**Request:**
```json
{
  "issue_tags": ["too_acidic", "lacks_sweetness"],
  "experiment_id": "uuid"  // optional, for context and variable comparisons
}
```

**Response:**
```json
{
  "data": {
    "recommendations": [
      {
        "rule_id": "uuid",
        "rule_name": "Reduce Acidity by Lowering Temperature",
        "suggestion": "Lower water temperature by 2-3°C. This reduces acid extraction while maintaining body.",
        "confidence": "High",
        "source": "James Hoffmann video",
        "matched_conditions": ["too_acidic"],
        "expected_effects": [
          {"variable": "acidity_intensity", "direction": "decrease", "magnitude": "moderate"}
        ]
      },
      {
        "rule_id": "uuid",
        "rule_name": "Increase Sweetness with Longer Bloom",
        "suggestion": "Extend bloom time to 90 seconds...",
        "confidence": "Medium",
        "matched_conditions": ["lacks_sweetness"],
        "expected_effects": [...]
      }
    ],
    "unmatched_tags": []
  }
}
```

### Dismiss Recommendation
```
POST /api/v1/experiments/:id/dismiss-recommendation
```

Dismiss a recommendation for a specific experiment.

**Request:**
```json
{
  "rule_id": "uuid"
}
```

**Response:** `204 No Content`

### Get Dismissed Recommendations
```
GET /api/v1/experiments/:id/dismissed-recommendations
```

**Response:**
```json
{
  "data": {
    "dismissed_rule_ids": ["uuid1", "uuid2"]
  }
}
```

### Undo Dismiss
```
DELETE /api/v1/experiments/:id/dismiss-recommendation/:rule_id
```

**Response:** `204 No Content`

### Try Recommendation
```
POST /api/v1/experiments/:id/try-recommendation
```

Creates a new experiment linked to the original, with a note about the suggestion being tried.

**Request:**
```json
{
  "rule_id": "uuid",
  "coffee_id": "uuid"  // optional, defaults to same coffee
}
```

**Response:** `201 Created` with new experiment template

The new experiment includes:
- `improvement_notes`: "Trying: [suggestion summary]"
- Link back to original experiment for comparison

### Get Experiments with Unresolved Issues
```
GET /api/v1/experiments/with-issues
```

Returns experiments that have issue tags but haven't been marked as resolved.

**Query Parameters:**
- `page`, `per_page`: Pagination
- `has_recommendations`: Filter to only experiments with matching rules

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "brew_date": "2026-01-19T10:30:00Z",
      "coffee_name": "Kiamaina",
      "issue_tags": ["too_acidic", "lacks_sweetness"],
      "recommendation_count": 2
    }
  ],
  "pagination": {...}
}
```

---

## Design Decisions

### Real-Time Matching

Rules matched as tags are selected:
- Immediate feedback encourages tagging
- Shows value of rule system
- User doesn't need separate step

### Suggestions, Not Prescriptions

Recommendations are suggestions to consider:
- User decides what to try
- Coffee is complex—rules are heuristics
- Empowers learning over following blindly

### Link Experiments

"Try This" creates a link between experiments:
- Tracks that suggestion was attempted
- Enables before/after comparison
- Builds evidence for rule effectiveness

### Dismiss is Scoped

Dismissing a suggestion is per-experiment:
- Doesn't disable the rule globally
- Rule may be right for other situations
- Respects that context matters

### No Auto-Application

System suggests but never auto-applies changes:
- User maintains control
- Brewing requires human judgment
- Prevents automation of potentially wrong advice

## Open Questions

1. **Effectiveness Tracking**: Auto-calculate if suggestions improved scores?
2. **Suggestion Priority**: When rules conflict, how to guide user?
3. **Bulk Recommendations**: Apply same suggestion to multiple experiments?
4. **Learning from Dismissals**: Should frequent dismissals lower rule confidence?
