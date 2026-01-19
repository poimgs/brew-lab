# Rules Engine Feature

## Context

The rules engine allows users to codify their brewing knowledge as condition→effect relationships. When users identify issues with a brew, matching rules provide actionable suggestions. Rules are manually created—no automatic inference.

## Requirements

### User Stories

1. **Create Rule**: As a user, I can create rules encoding brewing knowledge
2. **Edit Rule**: As a user, I can refine rules as I learn more
3. **Browse Rules**: As a user, I can see all my rules and their conditions
4. **Toggle Rules**: As a user, I can enable/disable rules without deleting
5. **Test Rule**: As a user, I can see what experiments would match a rule
6. **Import Rules**: As a user, I can start with common rules (future)

### Rule List View

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Rules                                        [New Rule] │
├─────────────────────────────────────────────────────────┤
│ [Search rules...               ]  [Show: All ▼]        │
├─────────────────────────────────────────────────────────┤
│ ○ │ Name                │ Conditions    │ Confidence  │
│───┼─────────────────────┼───────────────┼─────────────│
│ ● │ Reduce Acidity      │ too_acidic    │ High        │
│ ● │ Increase Body       │ lacks_body    │ Medium      │
│ ○ │ Fix Channeling      │ channeling    │ Low         │
│ ● │ Under-extraction    │ sour + thin   │ High        │
│   │ ...                 │ ...           │ ...         │
└─────────────────────────────────────────────────────────┘

● = Active   ○ = Inactive
```

**Columns:**
- Active status (toggle)
- Rule name
- Conditions (summarized)
- Confidence level
- Source (optional)

**Row Actions:**
- Edit
- Duplicate
- Test (show matching experiments)
- Delete

### Create/Edit Rule

**Form Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Create Rule                                             │
├─────────────────────────────────────────────────────────┤
│ Name*                                                   │
│ [Reduce Acidity by Lowering Temperature           ]     │
│                                                         │
│ Description                                             │
│ [When coffee is too acidic, lowering water         ]    │
│ [temperature reduces acid extraction               ]    │
│                                                         │
│ ─── CONDITIONS (when to apply) ───                      │
│                                                         │
│ If the brew has issue tag:                              │
│ [too_acidic                                   ▼]        │
│                                    [+ Add Condition]    │
│                                                         │
│ ─── SUGGESTION ───                                      │
│                                                         │
│ What to try:*                                           │
│ [Lower water temperature by 2-3°C. This reduces    ]    │
│ [acid extraction while maintaining sweetness.      ]    │
│                                                         │
│ ─── EXPECTED EFFECTS (optional) ───                     │
│                                                         │
│ This should cause:                                      │
│ [acidity_intensity    ▼] to [decrease ▼]               │
│                                    [+ Add Effect]       │
│                                                         │
│ ─── METADATA ───                                        │
│                                                         │
│ Confidence   [High ▼]                                   │
│ Source       [James Hoffmann video                 ]    │
│ Active       [✓]                                        │
│                                                         │
│              [Cancel]  [Save Rule]                      │
└─────────────────────────────────────────────────────────┘
```

### Condition Builder

**Condition Types:**

1. **Issue Tag Match:**
```
If issue tag: [too_acidic ▼]
```

2. **Variable Comparison:**
```
If [acidity_intensity ▼] [> ▼] [7    ]
```

**Supported Operators:**
- `=` equals
- `>` greater than
- `<` less than
- `>=` greater or equal
- `<=` less or equal
- `contains` (for text fields)

**Multiple Conditions:**
- Multiple conditions combined with AND
- All conditions must match for rule to apply

```
Conditions:
├─ Issue tag: too_acidic
├─ AND acidity_intensity > 7
└─ AND water_temperature >= 90
                              [+ Add Condition]
```

### Effect Builder

**Effect Structure:**
```
[variable         ▼] should [increase/decrease ▼] [slightly/moderately/significantly ▼]
```

**Example Effects:**
- "acidity_intensity should decrease moderately"
- "sweetness_intensity should increase slightly"
- "overall_score should improve"

### Rule Testing

**Test Dialog:**
```
┌─────────────────────────────────────────────────────────┐
│ Test Rule: Reduce Acidity                               │
├─────────────────────────────────────────────────────────┤
│ This rule would match 12 experiments:                   │
│                                                         │
│ • Jan 19 - Kiamaina (score: 6, acidity: 8)             │
│ • Jan 18 - El Calagual (score: 5, acidity: 9)          │
│ • Jan 15 - Kiamaina (score: 7, acidity: 7)             │
│ ...                                                     │
│                                                         │
│                              [Close]                    │
└─────────────────────────────────────────────────────────┘
```

### Predefined Rules (Seed Data)

System includes starter rules users can adopt:

| Rule | Condition | Suggestion |
|------|-----------|------------|
| Fix High Acidity | `too_acidic` | Lower temperature 2-3°C, or use coarser grind |
| Fix Bitterness | `too_bitter` | Lower temperature, coarser grind, shorter brew time |
| Increase Body | `lacks_body` | Finer grind, higher dose, add mineral enhancer |
| Fix Under-extraction | `under_extracted` | Finer grind, higher temp, longer brew time |
| Fix Over-extraction | `over_extracted` | Coarser grind, lower temp, shorter brew time |
| Fix Channeling | `channeling` | Improve puck prep, slower pour, check grind distribution |

Users can:
- View predefined rules
- Adopt (copy to their rules)
- Modify after adopting
- Delete adopted rules

## Design Decisions

### AND-Only Conditions

Conditions use AND logic only because:
- OR logic significantly complicates UI
- Most rules are single-condition anyway
- Can create separate rules for OR scenarios
- Keeps matching logic simple

### No Rule Chaining

Rules don't trigger other rules because:
- Avoids complexity and infinite loops
- Clear cause-effect relationships
- User understands what triggered what
- Can add later if needed

### Free-Text Suggestions

Suggestions are free text, not structured actions:
- Brewing advice is nuanced
- Hard to quantify "try X" systematically
- Users can include caveats and context
- More useful than rigid "change X by Y"

### Effects are Informational

Effects don't auto-populate expected outcomes:
- They're displayed to set expectations
- User still evaluates actual results
- Helps build intuition about cause-effect

### Confidence is User-Defined

Confidence (Low/Medium/High) is user's assessment:
- New rules start uncertain
- User increases as rule proves useful
- Displayed in recommendations for context

### Predefined Rules as Adoption

Predefined rules are copied to user's rules:
- User owns their rules
- Can modify without affecting originals
- Clear separation of system vs user data
- Users learn from examples

## Open Questions

1. **OR Conditions**: Should OR groups be supported for complex rules?
2. **Rule Effectiveness Tracking**: Track how often following a rule improves scores?
3. **Community Rules**: Share rules between users (future multi-user)?
4. **Rule Conflicts**: Warn when two rules have contradictory suggestions?
