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
| Tables | Plural, snake_case | `experiments`, `coffees` |
| Columns | Singular, snake_case | `coffee_id`, `brew_date` |
| Foreign keys | `{singular_table}_id` | `user_id`, `coffee_id` |
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
| Short identifiers | `VARCHAR(50)` | code, abbreviation |
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
4. **Seed Data**: Separate seed files for reference data (e.g., mineral profiles)

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

## Soft Delete Conventions

### Pattern

Entities that need to preserve historical references use soft delete via a `deleted_at` timestamp:

```sql
deleted_at TIMESTAMP WITH TIME ZONE
```

**Behavior:**
- `NULL` = active record
- Timestamp = soft deleted
- Queries filter out deleted records by default
- API can optionally include deleted records for admin/history views

### Partial Unique Indexes

When using soft delete, unique constraints should exclude deleted records:

```sql
-- Only enforce uniqueness among non-deleted records
CREATE UNIQUE INDEX idx_filter_papers_user_name
    ON filter_papers(user_id, name)
    WHERE deleted_at IS NULL;
```

### Filtered Indexes

Create filtered indexes for efficient querying of active records:

```sql
CREATE INDEX idx_coffees_deleted_at
    ON coffees(deleted_at)
    WHERE deleted_at IS NULL;
```

### Applicable Entities

| Entity | Soft Delete | Archive | Reason |
|--------|-------------|---------|--------|
| Coffee | ✓ | ✓ | Preserve experiment history; archive for finished bags |
| Filter Paper | ✓ | — | Preserve experiment history |
| Experiment | — | — | Hard delete OK; user owns the data |
| User | — | — | Account deletion handled separately |

### Archive Pattern

For entities that benefit from a "hidden but usable" state, add an `archived_at` timestamp:

```sql
archived_at TIMESTAMP WITH TIME ZONE
```

**Behavior:**
- Archived records hidden from default list views
- Can still be selected/referenced in new records
- "Show archived" toggle in UI to reveal them

Currently only `coffees` uses the archive pattern.

---

## Design Decisions

### Cascade Deletes

Use cascade deletes carefully:

```sql
-- Junction tables: cascade
ON DELETE CASCADE

-- Core entities: restrict or application-level handling
-- (e.g., don't cascade delete experiments when deleting coffee)
```

### Foreign Keys to Soft-Deleted Records

When referencing entities that use soft delete:
- Remove `ON DELETE SET NULL` from FK constraints
- Let experiments retain their FK to deleted coffees/filter papers
- Display "(deleted)" indicator in UI when showing historical references
