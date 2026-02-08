# Database Conventions

## Context

This specification defines the PostgreSQL database conventions for the Coffee Tracker. Feature-specific table schemas are documented in their respective feature specs.

## Database Choice

PostgreSQL (cloud-hosted) chosen for:
- Robust relational model suits structured brew data
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
| Tables | Plural, snake_case | `brews`, `coffees` |
| Columns | Singular, snake_case | `coffee_id`, `brew_date` |
| Foreign keys | `{singular_table}_id` | `user_id`, `coffee_id` |
| Indexes | `idx_{table}_{column(s)}` | `idx_brews_brew_date` |

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
| Large weights | `DECIMAL(6,2)` | coffee_ml |
| Temperature | `DECIMAL(4,1)` | water_temperature |
| Percentage | `DECIMAL(5,2)` | extraction_yield |
| Intensity scores | `INTEGER` | aroma_intensity |
| Duration (seconds) | `INTEGER` | total_brew_time, wait_time |

### String Fields

| Use Case | Type | Example |
|----------|------|---------|
| Short identifiers | `VARCHAR(50)` | pour_style |
| Names | `VARCHAR(255)` | coffee name, roaster |
| Short descriptions | `VARCHAR(255)` | — |
| Long text | `TEXT` | notes, technique_notes |

## Index Strategies

### Foreign Key Indexes

Always index foreign keys:

```sql
CREATE INDEX idx_coffees_user_id ON coffees(user_id);
CREATE INDEX idx_brews_coffee_id ON brews(coffee_id);
```

### Query Optimization Indexes

Add indexes for common query patterns:

```sql
-- Sorting by date
CREATE INDEX idx_brews_brew_date ON brews(brew_date);

-- Filtering by roaster
CREATE INDEX idx_coffees_roaster ON coffees(roaster);

-- Partial index for non-archived records
CREATE INDEX idx_coffees_not_archived ON coffees(user_id) WHERE archived_at IS NULL;
```

## Migrations Approach

### Tools

Use golang-migrate or similar migration tool.

### File Naming

```
migrations/
+-- 001_initial.up.sql
+-- 001_initial.down.sql
+-- 002_create_coffees.up.sql
+-- 002_create_coffees.down.sql
+-- ...
```

### Guidelines

1. **Versioned Files**: Sequential numbering (001, 002, ...)
2. **Reversible**: Each migration has up and down scripts
3. **Atomic**: Each migration is a single logical change
4. **No seed data**: Reference data managed by application code or separate scripts

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

## Delete Conventions

### Hard Delete

Most entities use hard delete — the record is permanently removed from the database.

### Soft Delete

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

### Applicable Entities

| Entity | Delete Type | Archive | Cascade | Reason |
|--------|------------|---------|---------|--------|
| Coffee | Hard delete | Yes (archived_at) | Deleting a coffee cascades: brews | User explicitly deletes; data is gone |
| Brew | Hard delete | — | Cascade on brew_pours | User owns the data |
| Filter Paper | Soft delete | — | — | Preserve brew history references |
| User | — | — | — | Account deletion handled separately |

### Cascade Rules

When a **coffee** is hard-deleted:
- All brews for that coffee are deleted (`ON DELETE CASCADE`)
- The coffee's `reference_brew_id` FK is moot (row deleted)

When a **brew** is hard-deleted:
- All brew_pours rows for that brew are deleted (`ON DELETE CASCADE`)
- If this brew was a coffee's `reference_brew_id`, that field is set to NULL (`ON DELETE SET NULL`)

### Archive Pattern

For entities that benefit from a "hidden but usable" state, add an `archived_at` timestamp:

```sql
archived_at TIMESTAMP WITH TIME ZONE
```

**Behavior:**
- Archived records hidden from default list views
- Can still be selected/referenced in new records
- "Show archived" toggle in UI to reveal them
- Archiving is separate from deletion — archived coffees are still active records

Currently only `coffees` uses the archive pattern.

## Computed Properties

Some values are computed at read time rather than stored:

| Property | Formula | Notes |
|----------|---------|-------|
| `water_weight` | `coffee_weight × ratio` | Not stored in DB. Computed on display. Null until both inputs are set. |
| `brew_count` | `COUNT(*) FROM brews WHERE coffee_id = ?` | Computed via subquery on coffee reads. |

---

## Design Decisions

### Cascade Deletes

```sql
-- Coffee -> brews: CASCADE
-- Brew -> brew_pours: CASCADE
-- Coffee.reference_brew_id -> ON DELETE SET NULL
```

### Foreign Keys to Soft-Deleted Records

When referencing entities that use soft delete (e.g., filter papers):
- Brews retain their FK to soft-deleted filter papers
- Display "(deleted)" indicator in UI when showing historical references
