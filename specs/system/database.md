# Database Design

## Context

This specification defines the PostgreSQL database schema for the Coffee Experiment Tracker. The schema must support:
- Core entities (Coffee, Experiment, Rule, IssueTag, MineralProfile)
- Efficient querying for filtering, sorting, and correlation analysis
- Data integrity through constraints and relationships
- Future extensibility without major migrations

## Requirements

### Database Choice

PostgreSQL (cloud-hosted) chosen for:
- Robust relational model suits structured experiment data
- JSONB support for flexible fields
- Strong typing and constraints
- Excellent query optimizer
- Cloud hosting options (Supabase, Railway, Render, etc.)

### Schema Overview

```sql
-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coffee metadata
CREATE TABLE coffees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    roaster VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    region VARCHAR(255),
    process VARCHAR(100),
    roast_level VARCHAR(50),
    tasting_notes TEXT,
    roast_date DATE,
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Experiments (brew records)
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    coffee_id UUID NOT NULL REFERENCES coffees(id),
    brew_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Pre-brew variables
    coffee_weight DECIMAL(5,2),
    water_weight DECIMAL(6,2),
    ratio VARCHAR(20),
    grind_size VARCHAR(100),
    water_temperature DECIMAL(4,1),
    filter_type VARCHAR(100),

    -- Brew variables
    bloom_water DECIMAL(5,2),
    bloom_time INTEGER,
    pour_1 VARCHAR(255),
    pour_2 VARCHAR(255),
    pour_3 VARCHAR(255),
    total_brew_time INTEGER,
    drawdown_time INTEGER,
    technique_notes TEXT,

    -- Post-brew variables
    serving_temperature VARCHAR(20),
    water_bypass VARCHAR(100),
    mineral_additions VARCHAR(255),

    -- Quantitative outcomes
    final_weight DECIMAL(6,2),
    tds DECIMAL(4,2),
    extraction_yield DECIMAL(5,2),

    -- Sensory outcomes (1-10 scale)
    aroma_intensity INTEGER CHECK (aroma_intensity BETWEEN 1 AND 10),
    aroma_notes TEXT,
    acidity_intensity INTEGER CHECK (acidity_intensity BETWEEN 1 AND 10),
    sweetness_intensity INTEGER CHECK (sweetness_intensity BETWEEN 1 AND 10),
    bitterness_intensity INTEGER CHECK (bitterness_intensity BETWEEN 1 AND 10),
    body_weight INTEGER CHECK (body_weight BETWEEN 1 AND 10),
    flavor_notes TEXT,
    aftertaste_duration INTEGER CHECK (aftertaste_duration BETWEEN 1 AND 10),
    aftertaste_intensity INTEGER CHECK (aftertaste_intensity BETWEEN 1 AND 10),
    aftertaste_notes TEXT,

    -- Overall assessment
    overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),
    overall_notes TEXT NOT NULL,
    improvement_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issue tags (predefined + custom)
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

-- Junction table for experiment-tag relationship
CREATE TABLE experiment_tags (
    experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES issue_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (experiment_id, tag_id)
);

-- Mineral profiles
CREATE TABLE mineral_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- NULL for system profiles
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    description TEXT,
    hardness DECIMAL(6,2),
    alkalinity DECIMAL(6,2),
    magnesium DECIMAL(6,2),
    calcium DECIMAL(6,2),
    potassium DECIMAL(6,2),
    sodium DECIMAL(6,2),
    chloride DECIMAL(6,2),
    sulfate DECIMAL(6,2),
    bicarbonate DECIMAL(6,2),
    typical_dose VARCHAR(100),
    taste_effects TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rules
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

-- User defaults for experiment fields
CREATE TABLE user_defaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    field_name VARCHAR(100) NOT NULL,
    default_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, field_name)
);
```

### Indexes

```sql
-- Foreign key indexes
CREATE INDEX idx_coffees_user_id ON coffees(user_id);
CREATE INDEX idx_experiments_user_id ON experiments(user_id);
CREATE INDEX idx_experiments_coffee_id ON experiments(coffee_id);
CREATE INDEX idx_rules_user_id ON rules(user_id);

-- Query optimization indexes
CREATE INDEX idx_experiments_brew_date ON experiments(brew_date);
CREATE INDEX idx_coffees_roaster ON coffees(roaster);
CREATE INDEX idx_coffees_roast_date ON coffees(roast_date);
CREATE INDEX idx_issue_tags_name ON issue_tags(name);
CREATE INDEX idx_rules_active ON rules(active) WHERE active = TRUE;

-- JSONB indexes for rule conditions
CREATE INDEX idx_rules_conditions ON rules USING GIN (conditions);
```

## Design Decisions

### UUID Primary Keys

UUIDs chosen over auto-increment integers for:
- No sequential ID leakage
- Safe for distributed systems
- Client-side ID generation possible
- Consistent across tables

### JSONB for Conditions/Effects

Rule conditions and effects stored as JSONB because:
- Structure may evolve
- Flexible querying with GIN indexes
- Avoids complex junction tables
- Native PostgreSQL support

### Separate Tags Table

Issue tags are a separate table (not JSONB array) because:
- Enables consistent tag vocabulary
- Supports tag metadata (description, category)
- Foreign key integrity
- Efficient querying for tag-based filtering

### User Scoping

All data is scoped to a user:
- Supports single-user with path to multi-user
- Row-level security possible
- Clean data isolation

### System vs User Data

`is_system` flag distinguishes:
- Predefined issue tags and mineral profiles
- Cannot be deleted by users
- Provides starting point for new users

### Check Constraints

Intensity fields use CHECK constraints (1-10) for:
- Data integrity at database level
- Clear validation rules
- Prevents invalid data entry

### Timestamps with Time Zone

`TIMESTAMP WITH TIME ZONE` for all timestamps:
- Correct handling across time zones
- PostgreSQL best practice
- Brew timing matters for analysis

## Migrations Approach

1. **Tool**: Use golang-migrate or similar
2. **Versioned Files**: `migrations/001_initial.up.sql`, etc.
3. **Reversible**: Each migration has up and down scripts
4. **Seed Data**: Separate seed files for system tags and profiles

## Open Questions

1. **Soft Delete**: Should deleted records be preserved with a deleted_at flag?
2. **Audit Log**: Track changes to experiments for history?
3. **Partitioning**: Partition experiments by date if volume grows large?
