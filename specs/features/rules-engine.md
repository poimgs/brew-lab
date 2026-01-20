# Rules Engine

## Overview

The rules engine allows users to codify their brewing knowledge as condition→effect relationships. When users identify issues with a brew, matching rules provide actionable suggestions. Rules are manually created—no automatic inference.

This feature includes:
- **Rules**: User-defined condition→suggestion relationships
- **Issue Tags**: Standardized labels for common problems that trigger rules

---

## Entity: Rule

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

### Database Schema

```sql
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    suggestion TEXT NOT NULL,
    effects JSONB,
    confidence VARCHAR(20),
    source VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rules_user_id ON rules(user_id);
CREATE INDEX idx_rules_active ON rules(active) WHERE active = TRUE;
CREATE INDEX idx_rules_conditions ON rules USING GIN (conditions);
```

---

## Entity: Issue Tag

Issue tags are standardized labels for common problems or characteristics in a brew. They serve two purposes:
1. Quickly annotate experiments with identified issues
2. Trigger rule matching for recommendations

### Predefined Tags

Organized by category for UI presentation.

#### Extraction Issues
| Tag | Description |
|-----|-------------|
| `under_extracted` | General under-extraction (sour, thin, lacking sweetness) |
| `over_extracted` | General over-extraction (bitter, astringent, harsh) |
| `channeling` | Uneven extraction, likely from channeling |
| `uneven_extraction` | Some notes underdeveloped, others overdeveloped |

#### Taste Balance
| Tag | Description |
|-----|-------------|
| `too_acidic` | Acidity overpowering or unpleasant |
| `too_bitter` | Bitterness overpowering or harsh |
| `too_sweet` | Sweetness cloying (rare) |
| `lacks_acidity` | Flat, missing brightness |
| `lacks_sweetness` | Missing sweetness development |
| `lacks_body` | Thin, watery mouthfeel |
| `too_heavy` | Overly thick, muddy body |

#### Flavor Issues
| Tag | Description |
|-----|-------------|
| `muted_flavors` | Overall flavor intensity too low |
| `harsh_flavors` | Unpleasant harshness in taste |
| `off_flavors` | Unexpected negative flavors |
| `vegetal` | Green, grassy, unripe notes |
| `papery` | Filter paper taste |
| `stale` | Flat, cardboard-like (often old coffee) |

#### Temperature Issues
| Tag | Description |
|-----|-------------|
| `too_hot` | Serving temperature too high, burns palate |
| `cooled_poorly` | Taste degraded as it cooled |
| `better_when_cooled` | Improved as it cooled (informational) |

#### Process Issues
| Tag | Description |
|-----|-------------|
| `slow_drawdown` | Drawdown time too long |
| `fast_drawdown` | Drawdown time too short |
| `inconsistent` | Results vary between similar attempts |

### Custom Tags

Users can create custom tags with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Tag identifier (lowercase, underscores) |
| display_name | string | Yes | Human-readable name |
| description | text | No | What this tag means |
| category | string | No | Grouping category |

### Tag-to-Outcome Mapping

Some tags map to specific outcome variables, enabling correlation analysis.

| Tag | Related Outcome Variables |
|-----|---------------------------|
| `too_acidic` | acidity_intensity |
| `lacks_acidity` | acidity_intensity |
| `too_bitter` | bitterness_intensity |
| `lacks_sweetness` | sweetness_intensity |
| `lacks_body` | body_weight |
| `too_heavy` | body_weight |
| `muted_flavors` | aroma_intensity, overall_score |
| `under_extracted` | extraction_yield, tds |
| `over_extracted` | extraction_yield, tds |

### Database Schema

```sql
CREATE TABLE issue_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- NULL for system tags
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_issue_tags_name ON issue_tags(name);
```

---

## API Endpoints

### Rules

#### List Rules
```
GET /api/v1/rules
```

**Query Parameters:**
- `page`, `per_page`: Pagination
- `active`: Filter by active status (`true`/`false`)
- `search`: Search name and description

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Reduce Acidity by Lowering Temperature",
      "description": "When coffee is too acidic, lowering water temperature reduces acid extraction",
      "conditions": [
        {"type": "issue_tag", "issue_tag": "too_acidic"}
      ],
      "suggestion": "Lower water temperature by 2-3°C",
      "effects": [
        {"variable": "acidity_intensity", "direction": "decrease", "magnitude": "moderate"}
      ],
      "confidence": "High",
      "source": "James Hoffmann video",
      "active": true,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

#### Create Rule
```
POST /api/v1/rules
```

**Request:**
```json
{
  "name": "Reduce Acidity by Lowering Temperature",
  "description": "When coffee is too acidic, lowering water temperature reduces acid extraction",
  "conditions": [
    {"type": "issue_tag", "issue_tag": "too_acidic"}
  ],
  "suggestion": "Lower water temperature by 2-3°C. This reduces acid extraction while maintaining body.",
  "effects": [
    {"variable": "acidity_intensity", "direction": "decrease", "magnitude": "moderate"}
  ],
  "confidence": "High",
  "source": "James Hoffmann video"
}
```

**Response:** `201 Created` with rule object

#### Get Rule
```
GET /api/v1/rules/:id
```

#### Update Rule
```
PUT /api/v1/rules/:id
```

#### Delete Rule
```
DELETE /api/v1/rules/:id
```

#### Toggle Rule Active Status
```
PATCH /api/v1/rules/:id/toggle
```

Toggles `active` status and returns updated rule.

#### Match Rules
```
POST /api/v1/rules/match
```

Find rules matching given conditions.

**Request:**
```json
{
  "issue_tags": ["too_acidic", "lacks_body"],
  "experiment_id": "uuid"  // optional, for variable comparisons
}
```

**Response:**
```json
{
  "data": {
    "rules": [
      {
        "id": "uuid",
        "name": "Reduce Acidity",
        "suggestion": "Lower water temperature by 2-3°C",
        "confidence": "High",
        "matched_conditions": ["too_acidic"],
        "effects": [...]
      }
    ],
    "unmatched_tags": ["lacks_body"]
  }
}
```

#### Test Rule
```
GET /api/v1/rules/:id/test
```

Returns experiments that would match this rule.

**Response:**
```json
{
  "data": {
    "matching_experiments": [
      {
        "id": "uuid",
        "brew_date": "2026-01-19T10:30:00Z",
        "coffee_name": "Kiamaina",
        "overall_score": 6,
        "matched_values": {"acidity_intensity": 8}
      }
    ],
    "total_matches": 12
  }
}
```

### Issue Tags

#### List Tags
```
GET /api/v1/tags
```

**Query Parameters:**
- `category`: Filter by category
- `include_system`: Include system tags (default: true)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "too_acidic",
      "display_name": "Too Acidic",
      "description": "Acidity overpowering or unpleasant",
      "category": "Taste Balance",
      "is_system": true
    }
  ]
}
```

#### Create Custom Tag
```
POST /api/v1/tags
```

**Request:**
```json
{
  "name": "fermented_notes",
  "display_name": "Fermented Notes",
  "description": "Boozy, wine-like fermentation character",
  "category": "Flavor Issues"
}
```

#### Get Tag
```
GET /api/v1/tags/:id
```

#### Update Custom Tag
```
PUT /api/v1/tags/:id
```

Only custom tags (is_system=false) can be updated.

#### Delete Custom Tag
```
DELETE /api/v1/tags/:id
```

Only custom tags can be deleted. Returns `403 Forbidden` for system tags.

---

## User Interface

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

### Issue Tag Selector

**Categorized multi-select for issue tags:**
```
Extraction:  [Under] [Over] [☑ Channeling]
Taste:       [☑ Too Acidic] [Too Bitter] [Lacks Sweetness]
Flavor:      [Muted] [Harsh] [Off-flavors]
```

---

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

### AND-Only Conditions

Conditions use AND logic only because:
- OR logic significantly complicates UI
- Most rules are single-condition anyway
- Can create separate rules for OR scenarios
- Keeps matching logic simple

### Predefined over Free-Form Tags

Predefined tags chosen over free-form because:
- Consistent vocabulary enables rule matching
- Reduces cognitive load when tagging
- Enables meaningful aggregation
- Custom tags available for edge cases

### Tag Format

Tags use `snake_case` for:
- URL/query-string friendliness
- Code compatibility
- Unambiguous parsing

UI displays human-readable `display_name`.

### Categories for Organization

Categories group related tags in the UI but have no functional meaning. Users select from a flat list; categories just aid discovery.

### Multiple Tags per Experiment

An experiment can have any number of issue tags:
- Brews often have multiple issues
- Allows nuanced description
- All matching rules surface

### Informational Tags

Some tags like `better_when_cooled` are informational rather than "issues":
- Captures useful observations
- Can trigger positive recommendations
- Keeps tag system flexible

### Predefined Rules as Adoption

Predefined rules are copied to user's rules:
- User owns their rules
- Can modify without affecting originals
- Clear separation of system vs user data
- Users learn from examples

### Confidence is User-Defined

Confidence (Low/Medium/High) is user's assessment:
- New rules start uncertain
- User increases as rule proves useful
- Displayed in recommendations for context

---

## Open Questions

1. **Condition Grouping**: Should OR groups be supported, or is AND-only sufficient?
2. **Rule Ordering/Priority**: When multiple rules match, how to order suggestions?
3. **Rule Validation**: Warn if conditions reference non-existent tags/variables?
4. **Rule Effectiveness Tracking**: Track how often following a rule improves scores?
5. **Community Rules**: Share rules between users (future multi-user)?
6. **Rule Conflicts**: Warn when two rules have contradictory suggestions?
7. **Tag Deprecation**: How to handle removing predefined tags if they prove unhelpful?
8. **Tag Synonyms**: Should common misspellings or alternatives map to canonical tags?
9. **Tag Frequency Analysis**: Show which tags appear most often?
