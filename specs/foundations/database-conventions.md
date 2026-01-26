# Database Conventions

## Context

This specification defines the PostgreSQL database conventions for the Coffee Experiment Tracker. Feature-specific table schemas are documented in their respective feature specs.

## Database Choice

PostgreSQL (cloud-hosted) chosen for:
- Robust relational model suits structured experiment data
- JSONB support for flexible fields
- Strong typing and constraints
- Excellent query optimizer
- Cloud hosting options (Supabase, Railway, Render, etc.)

## Schema Conventions

### Primary Keys

All tables use UUID primary keys:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

**Rationale:**
- No sequential ID leakage
- Safe for distributed systems
- Client-side ID generation possible
- Consistent across tables

### Timestamps

All tables include standard timestamp columns:

```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Rationale:**
- `TIMESTAMP WITH TIME ZONE` for correct handling across time zones
- PostgreSQL best practice
- Useful for auditing and sorting

### User Scoping

All user data tables include a user reference:

```sql
user_id UUID NOT NULL REFERENCES users(id)
```

**Rationale:**
- Supports single-user with path to multi-user
- Row-level security possible
- Clean data isolation

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Tables | Plural, snake_case | `experiments`, `issue_tags` |
| Columns | Singular, snake_case | `coffee_id`, `brew_date` |
| Foreign keys | `{singular_table}_id` | `user_id`, `coffee_id` |
| Junction tables | `{table1}_{table2}` | `experiment_tags` |
| Indexes | `idx_{table}_{column(s)}` | `idx_experiments_brew_date` |

### Check Constraints

Use CHECK constraints for value ranges:

```sql
overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10)
```

**Benefits:**
- Data integrity at database level
- Clear validation rules
- Prevents invalid data entry

## Type Patterns

### Numeric Fields

| Use Case | Type | Example |
|----------|------|---------|
| Weights (grams) | `DECIMAL(5,2)` | coffee_weight |
| Large weights | `DECIMAL(6,2)` | water_weight |
| Temperature | `DECIMAL(4,1)` | water_temperature |
| Percentage | `DECIMAL(5,2)` | extraction_yield |
| Intensity scores | `INTEGER` | acidity_intensity |
| Duration (seconds) | `INTEGER` | bloom_time |

### String Fields

| Use Case | Type | Example |
|----------|------|---------|
| Short identifiers | `VARCHAR(50)` | tag name |
| Names | `VARCHAR(255)` | coffee name, roaster |
| Short descriptions | `VARCHAR(255)` | grind_size |
| Long text | `TEXT` | notes, suggestions |

### JSON Fields

Use JSONB for flexible, queryable structures:

```sql
conditions JSONB NOT NULL,
effects JSONB
```

**Benefits:**
- Structure may evolve without migrations
- Flexible querying with GIN indexes
- Avoids complex junction tables
- Native PostgreSQL support

## Index Strategies

### Foreign Key Indexes

Always index foreign keys:

```sql
CREATE INDEX idx_coffees_user_id ON coffees(user_id);
CREATE INDEX idx_experiments_coffee_id ON experiments(coffee_id);
```

### Query Optimization Indexes

Add indexes for common query patterns:

```sql
-- Sorting by date
CREATE INDEX idx_experiments_brew_date ON experiments(brew_date);

-- Filtering by roaster
CREATE INDEX idx_coffees_roaster ON coffees(roaster);

-- Active records only
CREATE INDEX idx_rules_active ON rules(active) WHERE active = TRUE;
```

### JSONB Indexes

Use GIN indexes for JSONB fields:

```sql
CREATE INDEX idx_rules_conditions ON rules USING GIN (conditions);
```

## Migrations Approach

### Tools

Use golang-migrate or similar migration tool.

### File Naming

```
migrations/
├── 001_initial.up.sql
├── 001_initial.down.sql
├── 002_add_mineral_profiles.up.sql
├── 002_add_mineral_profiles.down.sql
└── ...
```

### Guidelines

1. **Versioned Files**: Sequential numbering (001, 002, ...)
2. **Reversible**: Each migration has up and down scripts
3. **Atomic**: Each migration is a single logical change
4. **Seed Data**: Separate seed files for system tags and profiles

### Example Migration

```sql
-- 001_initial.up.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 001_initial.down.sql
DROP TABLE IF EXISTS users;
```

## Design Decisions

### Separate Tags Table

Issue tags are a separate table (not JSONB array) because:
- Enables consistent tag vocabulary
- Supports tag metadata (description, category)
- Foreign key integrity
- Efficient querying for tag-based filtering

### Junction Tables for Many-to-Many

Use explicit junction tables:

```sql
CREATE TABLE experiment_tags (
    experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES issue_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (experiment_id, tag_id)
);
```

**Benefits:**
- Clear relationships
- Referential integrity
- Easy to extend with metadata

### Cascade Deletes

Use cascade deletes carefully:

```sql
-- Junction tables: cascade
ON DELETE CASCADE

-- Core entities: restrict or application-level handling
-- (e.g., don't cascade delete experiments when deleting coffee)
```

## Open Questions

1. **Soft Delete**: Should deleted records be preserved with a `deleted_at` flag?
2. **Audit Log**: Track changes to experiments for history?
3. **Partitioning**: Partition experiments by date if volume grows large?
