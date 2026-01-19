# Rules Entity

## Context

Rules codify brewing knowledge as condition→effect relationships. They capture heuristics like "if acidity is too high, try lowering water temperature" or "if brew tastes thin, increase coffee dose."

Rules are manually entered by the user based on their learning and external resources. The system does not infer rules automatically—it only stores and matches against user-defined rules.

## Requirements

### Rule Structure

A rule consists of:
1. **Conditions**: What must be true for the rule to apply
2. **Effects**: What outcome changes are expected if the suggestion is followed
3. **Suggestion**: The actionable advice

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| name | string | Yes | Short descriptive name |
| description | text | No | Longer explanation of the rule |
| conditions | array[Condition] | Yes | When this rule applies |
| suggestion | text | Yes | What to try |
| effects | array[Effect] | No | Expected outcome changes |
| confidence | enum | No | User's confidence: Low, Medium, High |
| source | string | No | Where the rule came from (book, video, personal discovery) |
| active | boolean | Yes | Whether rule is used in matching (default: true) |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

### Condition Structure

Conditions specify what triggers a rule. They can reference:
- Issue tags (e.g., "too_bitter")
- Input variables (e.g., "grind_size", "temperature")
- Outcome variables (e.g., "acidity_intensity > 7")

| Field | Type | Description |
|-------|------|-------------|
| type | enum | "issue_tag", "variable_comparison" |
| issue_tag | string | For type=issue_tag: the tag name |
| variable | string | For type=variable_comparison: field name |
| operator | enum | For comparisons: "eq", "gt", "lt", "gte", "lte", "contains" |
| value | any | The comparison value |

Multiple conditions are combined with AND logic by default.

### Effect Structure

Effects describe expected outcome changes when following the suggestion.

| Field | Type | Description |
|-------|------|-------------|
| variable | string | Outcome variable affected |
| direction | enum | "increase", "decrease", "improve", "reduce" |
| magnitude | enum | "slight", "moderate", "significant" (optional) |

## Design Decisions

### Manual Entry Only

Rules are user-entered, not inferred, because:
- Coffee brewing is highly context-dependent
- Automated inference requires much more data
- Users want to codify knowledge from trusted sources
- Keeps system simple and transparent

### Issue Tags as Primary Trigger

The primary use case is: user selects issues with a brew → system shows relevant rules. This makes issue tags the most important condition type. Variable comparisons are secondary, for users who want more precise rules.

### No Rule Chaining

Rules are independent; no support for "if rule A fires, also check rule B." This avoids complexity and keeps the system predictable.

### Suggestion as Free Text

The suggestion is free text rather than structured "change X by Y" because:
- Suggestions are often nuanced
- May involve technique changes hard to quantify
- Users can include context and caveats

### Effects are Optional

Effects are optional because:
- Some rules are exploratory
- Users may not know expected effects
- Can be added later as rule is validated

### Active Flag

Rules can be deactivated without deletion:
- Allows testing whether a rule is helpful
- Preserves history of tried rules
- Easy to re-enable

## Open Questions

1. **Condition Grouping**: Should OR groups be supported, or is AND-only sufficient?
2. **Rule Ordering/Priority**: When multiple rules match, how to order suggestions?
3. **Rule Validation**: Warn if conditions reference non-existent tags/variables?
