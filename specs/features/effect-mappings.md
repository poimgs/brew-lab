# Effect Mappings

## Overview

Effect mappings allow users to codify brewing knowledge as cause→effect relationships. Unlike simple issue→suggestion rules, effect mappings capture the nuanced relationship between changing a brewing variable and its impact on multiple sensory outcomes.

A mapping answers the question: "If I change X, how will it affect my coffee's taste profile?"

**Example:**
```
Variable: Temperature
Change: -5°C (one tick)

Effects:
├── Acidity:    ↓ 1-2 points  (High confidence)
├── Sweetness:  ↑ 0-1 points  (Medium confidence)
├── Bitterness: ↓ 0-1 points  (Medium confidence)
└── Body:       — no change   (High confidence)

Source: James Hoffmann
```

**Key characteristics:**
- **User-defined**: Users create mappings from their observations or external sources
- **Per-tick changes**: Effects are defined relative to standardized "tick" units
- **Multi-output**: One input change can affect multiple sensory outcomes
- **Confidence-rated**: Users can indicate certainty for each effect
- **Directional**: Separate mappings for increasing vs decreasing a variable

**Where managed:** Experiment Review page (see patterns → create mappings)
**Where consulted:** Brew Tracking page (see gaps → check what to change)

---

## Entity: Effect Mapping

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| user_id | UUID | Auto | Owner of this mapping |
| name | string | Yes | Short descriptive name (e.g., "Lower Temperature Effect") |
| variable | string | Yes | Input variable name (see Input Variables below) |
| direction | enum | Yes | "increase" or "decrease" |
| tick_description | string | Yes | Human-readable tick unit (e.g., "5°C", "1 ratio step") |
| source | string | No | Where knowledge came from (book, video, personal) |
| notes | text | No | Additional context or caveats |
| active | boolean | Yes | Whether mapping is used in reference (default: true) |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

Effects are stored in a separate `effect_mapping_effects` table (see below).

### Input Variables

Standardized input variable names for consistency:

| Variable | Tick Unit | Description |
|----------|-----------|-------------|
| `temperature` | 5°C | Water temperature |
| `ratio` | 1 step (e.g., 1:15 → 1:16) | Coffee to water ratio |
| `grind_size` | Grinder-specific clicks | Grind fineness |
| `bloom_time` | 15 seconds | Bloom duration |
| `total_brew_time` | 15 seconds | Total extraction time |
| `coffee_weight` | 1 gram | Dose of coffee |
| `pour_count` | 1 pour | Number of pours |
| `pour_technique` | Categorical | Straight vs circular pour |
| `filter_type` | Categorical | Filter paper type |

## Entity: Effect (Child Table)

Each effect describes how one sensory outcome changes. Effects are stored in a normalized child table with foreign key to `effect_mappings`.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| effect_mapping_id | UUID | Auto | Parent mapping reference |
| output_variable | string | Yes | Sensory variable affected (constrained) |
| direction | enum | Yes | "increase", "decrease", or "none" |
| range_min | decimal | No | Minimum expected change (e.g., 0.5) |
| range_max | decimal | No | Maximum expected change (e.g., 1.5) |
| confidence | enum | Yes | "low", "medium", or "high" |

**Constraint:** Each `output_variable` can only appear once per mapping (unique on `effect_mapping_id` + `output_variable`).

### Output Variables

Sensory outcomes that can be affected:

| Variable | Maps to Experiment Field |
|----------|-------------------------|
| `acidity` | acidity_intensity |
| `sweetness` | sweetness_intensity |
| `bitterness` | bitterness_intensity |
| `body` | body_weight |
| `aroma` | aroma_intensity |
| `aftertaste` | aftertaste_intensity |
| `overall` | overall_score |

### Database Schema

```sql
-- Parent table: effect mappings
CREATE TABLE effect_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    variable VARCHAR(50) NOT NULL CHECK (variable IN (
        'temperature', 'ratio', 'grind_size', 'bloom_time',
        'total_brew_time', 'coffee_weight', 'pour_count',
        'pour_technique', 'filter_type'
    )),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('increase', 'decrease')),
    tick_description VARCHAR(100) NOT NULL,
    source VARCHAR(255),
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_effect_mappings_user_id ON effect_mappings(user_id);
CREATE INDEX idx_effect_mappings_variable ON effect_mappings(user_id, variable);
CREATE INDEX idx_effect_mappings_active ON effect_mappings(user_id, active) WHERE active = TRUE;

-- Child table: individual effects
CREATE TABLE effect_mapping_effects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    effect_mapping_id UUID NOT NULL REFERENCES effect_mappings(id) ON DELETE CASCADE,
    output_variable VARCHAR(50) NOT NULL CHECK (output_variable IN (
        'acidity', 'sweetness', 'bitterness', 'body',
        'aroma', 'aftertaste', 'overall'
    )),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('increase', 'decrease', 'none')),
    range_min DECIMAL(4,2),
    range_max DECIMAL(4,2),
    confidence VARCHAR(20) NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),

    -- Each output variable can only appear once per mapping
    UNIQUE (effect_mapping_id, output_variable)
);

CREATE INDEX idx_effect_mapping_effects_mapping_id ON effect_mapping_effects(effect_mapping_id);
CREATE INDEX idx_effect_mapping_effects_output ON effect_mapping_effects(output_variable);
```

### Schema Benefits

Using normalized tables instead of JSONB provides:

- **Database-level validation**: CHECK constraints enforce valid enum values
- **Referential integrity**: CASCADE delete ensures no orphaned effects
- **Unique constraint**: Prevents duplicate output variables per mapping
- **Efficient queries**: Standard B-tree indexes, simple JOINs
- **Easier migrations**: Standard ALTER TABLE for schema changes

---

## API Endpoints

### List Effect Mappings

```
GET /api/v1/effect-mappings
```

**Query Parameters:**
- `page`, `per_page`: Pagination
- `variable`: Filter by input variable
- `active`: Filter by active status (`true`/`false`)
- `search`: Search name and notes

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Lower Temperature Effect",
      "variable": "temperature",
      "direction": "decrease",
      "tick_description": "5°C",
      "effects": [
        {
          "output_variable": "acidity",
          "direction": "decrease",
          "range_min": 1,
          "range_max": 2,
          "confidence": "high"
        },
        {
          "output_variable": "sweetness",
          "direction": "increase",
          "range_min": 0,
          "range_max": 1,
          "confidence": "medium"
        }
      ],
      "source": "James Hoffmann",
      "notes": "Works best with light roasts",
      "active": true,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

### Create Effect Mapping

```
POST /api/v1/effect-mappings
```

**Request:**
```json
{
  "name": "Lower Temperature Effect",
  "variable": "temperature",
  "direction": "decrease",
  "tick_description": "5°C",
  "effects": [
    {
      "output_variable": "acidity",
      "direction": "decrease",
      "range_min": 1,
      "range_max": 2,
      "confidence": "high"
    },
    {
      "output_variable": "sweetness",
      "direction": "increase",
      "range_min": 0,
      "range_max": 1,
      "confidence": "medium"
    }
  ],
  "source": "James Hoffmann",
  "notes": "Works best with light roasts"
}
```

**Validation:**
- `name`: Required, 1-255 characters
- `variable`: Required, must be valid input variable
- `direction`: Required, must be "increase" or "decrease"
- `tick_description`: Required, 1-100 characters
- `effects`: Required, at least one effect
- Each effect must have valid `output_variable`, `direction`, and `confidence`

**Response:** `201 Created` with effect mapping object

### Get Effect Mapping

```
GET /api/v1/effect-mappings/:id
```

**Response:** Full effect mapping object

### Update Effect Mapping

```
PUT /api/v1/effect-mappings/:id
```

**Request:** Full or partial effect mapping object

**Response:** Updated effect mapping object

### Delete Effect Mapping

```
DELETE /api/v1/effect-mappings/:id
```

**Response:** `204 No Content`

### Toggle Active Status

```
PATCH /api/v1/effect-mappings/:id/toggle
```

Toggles `active` status and returns updated mapping.

**Response:** Updated effect mapping object

### Get Relevant Mappings for Gaps

```
POST /api/v1/effect-mappings/relevant
```

Returns mappings that could help address specific score gaps.

**Request:**
```json
{
  "gaps": [
    {"variable": "acidity", "direction": "decrease", "amount": 2},
    {"variable": "sweetness", "direction": "increase", "amount": 1}
  ]
}
```

**Response:**
```json
{
  "data": [
    {
      "mapping": {...},
      "relevance": [
        {
          "gap_variable": "acidity",
          "gap_direction": "decrease",
          "effect_direction": "decrease",
          "matches": true
        }
      ]
    }
  ]
}
```

---

## Design Decisions

### Effect Mappings vs Rules

Effect mappings replace the rules engine with a different mental model:

| Aspect | Rules (old) | Effect Mappings (new) |
|--------|-------------|----------------------|
| Trigger | Issue tags | Score gaps |
| Output | Text suggestion | Quantified effects |
| Granularity | One suggestion per rule | Multiple effects per mapping |
| Use case | "What's wrong?" | "What should I change?" |

Effect mappings are more actionable because they quantify expected changes.

### Per-Tick Standardization

Effects are defined per "tick" (standardized unit) because:
- Makes comparisons meaningful
- Users think in relative changes
- Avoids absolute value confusion
- Enables "2 ticks lower" reasoning

### Normalized Effects Table

Effects stored in a separate table rather than JSONB because:
- Database enforces valid enum values via CHECK constraints
- Unique constraint prevents duplicate output variables per mapping
- Standard indexing and querying patterns
- Easier schema migrations with ALTER TABLE
- API still returns nested JSON (repository handles JOIN)

### Separate Increase/Decrease Mappings

Rather than one mapping with bidirectional effects:
- Simplifies mental model
- Effects often asymmetric (increasing ≠ decreasing)
- Clearer UI presentation
- Matches how users think about changes

### Confidence per Effect

Confidence is per-effect rather than per-mapping because:
- User may be certain about one effect, uncertain about another
- Enables nuanced knowledge capture
- Better guidance when consulting mappings

### Active Flag

Mappings can be deactivated without deletion:
- Allows testing whether a mapping is accurate
- Preserves history of created mappings
- Easy to re-enable
- Supports iterative refinement

---

## Open Questions

1. **Tick Unit Normalization**: Should grind size ticks be normalized across grinders?
2. **Mapping Validation**: Should mappings with contradictory effects be flagged?
3. **Auto-Suggest from Correlations**: Can correlation data suggest new mappings?
4. **Mapping Effectiveness**: Track accuracy of predicted effects vs actual outcomes?
5. **Community Mappings**: Share mappings between users (future)?
6. **Filter Paper Profiles**: Define flow rate, clarity, body impact dimensions?
